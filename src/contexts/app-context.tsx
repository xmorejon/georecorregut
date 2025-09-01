'use client';

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import type { Location, Language, Place, UserData} from '@/lib/types';
import { getTranslation } from '@/lib/data'; // Assuming getTranslation is imported from '@/lib/data'
import { useAuth } from '@/hooks/use-auth';
import type { User } from 'firebase/auth';
import { searchPlacesByText } from '@/ai/flows/places-flow';
import { auth, db, getAllUsersUniqueLocationsData } from '@/lib/firebase';
import { collection, onSnapshot, doc, deleteDoc, query, orderBy, setDoc, addDoc, getDoc } from 'firebase/firestore';
import { toast, useToast } from '@/hooks/use-toast';

interface AppContextType {
  locations: Location[];
  filteredLocations: Location[];
  addPlaceAsLocation: (place: Place, callback?: () => void) => void;
  deleteLocation: (id: string) => void;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  selectedLocation: Location | null;
  setSelectedLocation: React.Dispatch<React.SetStateAction<Location | null>>;
  language: Language;
  setLanguage: (lang: Language) => void; 
  t: (key: string) => string;
  user: User | null;
  authLoading: boolean;
  placeSearchResults: Place[];
  isSearchingPlaces: boolean;
  previewPlace: (place: Place) => void;
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  addLocation: (
    details: { lat: number; lng: number; name: string, country: string, continent: string, isFavorite?: boolean },
    placeId?: string,
    callback?: () => void,
    showToast?: boolean
  ) => void;
  handleImportJSON: (file: File) => void;
  toggleFavoriteStatus: (id: string, isFavorite: boolean) => void;
  allUsersUniqueLocations: { [key: string]: { userName: string, countries: string[], continents: string[] } };
  userThemePreference: UserData['themePreference'];
}
//
const AppContext = createContext<AppContextType | undefined>(undefined);
export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [language, setLanguage] = useState<Language>('ca');
  const { user, loading: authLoading } = useAuth();
  const [placeSearchResults, setPlaceSearchResults] = useState<Place[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('search');
  const [allUsersUniqueLocations, setAllUsersUniqueLocations] = useState<{ [key: string]: { userName: string, countries: string[], continents: string[] } }>({});
  const [locations, setLocations] = useState<Location[]>([]);
  const [userThemePreference, setUserThemePreference] = useState<UserData['themePreference']>('system'); // State for user theme preference

  const t = useMemo(() => getTranslation(language), [language]); 

  useEffect(() => {
    // This effect should react to changes in the 'user' state provided by useAuth()
    if (user) { // Check if user is authenticated
      // Use an async IIFE (Immediately Invoked Function Expression) for async operations inside the effect
      (async () => {
        // --- Fetch user document and theme preference ONCE after user is set ---
        const userDocRef = doc(db, 'users', user.uid);
        try {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const userData = docSnap.data() as UserData; // Use UserData type
            setUserThemePreference(userData.themePreference || 'system'); // Default to system if not set
          } else {
            // Handle case where user document doesn't exist (e.g., new user)
            setUserThemePreference('system'); // Default theme
          }
        } catch (error) {
          console.error("Error fetching user document:", error);
          setUserThemePreference('system'); // Default theme on error
        }
        // --- End of theme preference fetching ---
      })(); // Call the async function immediately


      // --- Existing locations fetching logic ---
      const q = query(collection(db, 'users', user.uid, 'locations'), orderBy('date', 'desc'));
      const unsubscribeLocations = onSnapshot(q, (querySnapshot) => {
        const userLocations: Location[] = [];
        querySnapshot.forEach((doc) => {
          userLocations.push({ id: doc.id, ...doc.data() } as Location);
        });
        // Compare with current locations before updating state
        if (JSON.stringify(userLocations) !== JSON.stringify(locations)) {
          setLocations(userLocations);
        }
      }, (error) => {
          console.error("Error fetching locations:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to load locations.' });
        });
        return () => unsubscribeLocations(); // Cleanup locations listener

      } else {
        // Handle user logged out state
        setLocations([]); // Clear locations
        setUserThemePreference(undefined); // Clear theme preference
        // Redirect to login if needed
      }
  }, [user, db, toast]);


  // Effect to fetch all users' unique location data
  useEffect(() => {
    const fetchAllUsersData = async () => {
      try {
        const data = await getAllUsersUniqueLocationsData();
        setAllUsersUniqueLocations(data);
      } catch (error) {
        console.error("Error fetching all users' unique location data:", error);
        // Handle error, maybe show a toast
      }
    };

    if (user) {
      fetchAllUsersData();
    } else {
      setAllUsersUniqueLocations({});
    }
 }, [user as User | null]); // Add user to dependencies so it refetches when auth state changes

  const addLocation = useCallback(async (
    details: { lat: number; lng: number; name: string, country: string, continent: string, isFavorite?: boolean },
    placeId?: string,
    callback?: () => void,
    showToast: boolean = true
  ) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to add a location.' });
      callback?.();
      return;
    }
  
    try {
      const locationData = {
        name: details.name,
        lat: details.lat,
        lng: details.lng,
        date: new Date().toISOString(),
        country: details.country || 'Unknown',
        continent: details.continent || 'Unknown',
        isFavorite: details.isFavorite ?? false,
      };
      
      const docRef = placeId 
        ? doc(db, 'users', user.uid, 'locations', placeId)
        : doc(collection(db, 'users', user.uid, 'locations'));
      
      await setDoc(docRef, locationData);
 
      if (showToast) {
        toast({
          title: t('locationAdded'),
          description: `${details.name} ${t('hasBeenAdded')}`,
        });
      }
  
    } catch (error) {
      console.error("Error adding location:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add location.' });
    } finally {
      callback?.();
    }
  }, [user, t, toast]);
  

  const addPlaceAsLocation = useCallback(async (place: Place, callback?: () => void) => {
    addLocation(
      {
        lat: place.lat,
        lng: place.lng,
        name: place.name,
        country: place.country,
        continent: place.continent,
        isFavorite: false, // Default to false when adding from place search
      },
      place.id,
      callback
    );
    // Clear search term after adding location
    //setSearchTerm(''); 
  }, [addLocation]);
  
  const deleteLocation = useCallback(async (id: string) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to delete a location.' });
        return;
    }
    try {
        await deleteDoc(doc(db, 'users', user.uid, 'locations', id));
        toast({ title: 'Location Removed', description: 'The location has been removed from your list.'});
    } catch (error) {
        console.error("Error deleting location: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove location.' });
    }
  }, [user, toast]);

  const toggleFavoriteStatus = useCallback(async (id: string, isFavorite: boolean) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to update a location.' });
      return;
    }
    try {
      const locationRef = doc(db, 'users', user.uid, 'locations', id);
      await setDoc(locationRef, { isFavorite }, { merge: true });
      toast({ title: 'Location Updated', description: 'The location\'s favorite status has been updated.' });
    } catch (error) {
      console.error("Error toggling favorite status: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update location favorite status.' });
    }
  }, [user, toast]);

  const handleImportJSON = useCallback(async (file: File) => {
    // Ensure user is authenticated before proceeding with import
    if (user) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);

          if (!Array.isArray(json)) {
            toast({ variant: 'destructive', title: 'Import Error', description: 'Invalid JSON format. Expected an array.' });
            return;
          }

          let importedCount = 0;
          for (const location of json) {
            // Basic validation for essential properties
            if (location.name && typeof location.lat === 'number' && typeof location.lng === 'number') {
              await addLocation({
                name: location.name,
                lat: location.lat,
                lng: location.lng,
                country: location.country || 'Unknown',
                continent: location.continent || 'Unknown',
                isFavorite: location.isFavorite ?? false,
              }, location.id, undefined, false); // Use existing ID if available
              importedCount++;
            } else {
              console.warn('Skipping invalid location data:', location);
            }
          }
          toast({ title: 'Import Successful', description: `${importedCount} locations imported.` });
        } catch (error) {
          console.error('Error importing locations:', error);
          toast({ variant: 'destructive', title: 'Import Error', description: 'Failed to import locations. Please check the file format.' });
        }
      };
      reader.readAsText(file);
    } else {
      // User is not logged in, show an error toast
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to import locations.' });
      return;
    }
  }, [user, addLocation, toast]); // Added user to dependencies

  // ... rest of the code
//
  const previewPlace = useCallback((place: Place) => { // Ensure this function and subsequent code are outside handleImportJSON
    setSelectedLocation({
      ...place,
      date: new Date().toISOString(), // Add a default date
      isFavorite: false, // Default to false for preview
    });
  }, []);

  useEffect(() => {
    const handleSearch = () => {
      if (searchTerm.length > 2) {
        setIsSearchingPlaces(true);
        searchPlacesByText({ query: searchTerm })
          .then(results => {
            // Ensure each place object has a string id and other required properties
            /* ORIGINAL FUNCTION
            const validResults: Place[] = results.map(result => ({
              id: result.id || Date.now().toString(), // Provide a fallback ID
              name: result.name || 'Unknown Place', // Provide a default name if missing
              address: result.address || 'Unknown Address', // Provide a default address if missing
              lat: result.lat || 0, // Provide a default lat if missing
              lng: result.lng || 0, // Provide a default lng if missing
              country: result.country || 'Unknown Country', // Provide a default country if missing
              continent: result.continent || 'Unknown Continent', // Provide a default continent if missing
              // isFavorite is not part of Place type, so we don't include it here
            }));
            */
            // XMOREJON Modified Version to handle CATALUNYA:
            const validResults: Place[] = results.map(result => {
              // First, create a base place object with default values
              const place: Place = {
                id: result.id || Date.now().toString(),
                name: result.name || 'Unknown Place',
                address: result.address || 'Unknown Address',
                lat: result.lat || 0,
                lng: result.lng || 0,
                country: result.country || 'Unknown Country',
                continent: result.continent || 'Unknown Continent',
              };
            
              // Now, check for specific conditions and apply transformations
              if (place.country === 'Spain') {
                //console.log(`Geocoding Spain for ${place.name}, ${place.address}: Check if Catalunya?`);
                if (place.address.toLowerCase().includes('barcelona') || place.address.toLowerCase().includes('tarragona') || 
                    place.address.toLowerCase().includes('lleida') || place.address.toLowerCase().includes('girona')) {
    
                  place.country = 'Catalunya';
                  place.address = place.address.replace(/Spain/gi, 'Catalunya');
                  console.log(`Geocoding set Catalunya for City: ${place.name} Address: ${place.address}`);
                }
              }
              // Return the (potentially transformed) place object add add it to the validResults array
              return place;
            });
            // end CATALUNYA HANDLING

            setPlaceSearchResults(validResults);
          })
          .catch(error => {
            console.error("Error searching places:", error);
            setPlaceSearchResults([]);
          })
          .finally(() => {
            setIsSearchingPlaces(false);
          });
      } else {
        setPlaceSearchResults([]);
      }
    };

    const debounceTimer = setTimeout(handleSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const filteredLocations = locations.filter(location => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const lowerCaseName = location.name.toLowerCase();
    const lowerCaseCountry = location.country.toLowerCase();
  
    // Check if the searchTerm is present in the location name OR the location country
    return lowerCaseName.includes(lowerCaseSearchTerm) || lowerCaseCountry.includes(lowerCaseSearchTerm);
  });

  const value: AppContextType = {
    locations,
    filteredLocations,
    addLocation,
    deleteLocation,
    searchTerm,
    setSearchTerm,
    selectedLocation,
    setSelectedLocation,
    language,
    toggleFavoriteStatus,
    setLanguage,
    t,
    user,
    authLoading,
    placeSearchResults,
    isSearchingPlaces,
    addPlaceAsLocation,
 previewPlace,
 activeTab, 
 handleImportJSON,
    setActiveTab,
 allUsersUniqueLocations,
    userThemePreference, // Provide userThemePreference in context
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
