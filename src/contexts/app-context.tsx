'use client';

import { useEffect, useState, useContext, createContext, useMemo, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, collection, query, orderBy, onSnapshot, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { signInAnonymously, User } from 'firebase/auth'; // Import signInAnonymously and User type
import { auth, db, getAllUsersUniqueLocationsData } from '@/lib/firebase'; // Your Firebase instances
import { useToast } from '@/hooks/use-toast';


// Assuming your types are defined in '@/lib/types'
import type { Location, Language, Place, UserData } from '@/lib/types';
import { getTranslation } from '@/lib/data'; // Assuming getTranslation is imported from '@/lib/data'
import { searchPlacesByText } from '@/ai/flows/places-flow';


interface AppContextType {
  locations: Location[];
  filteredLocations: Location[];
  addPlaceAsLocation: (place: Place, callback?: () => void) => void;
  deleteLocation: (id: string) => Promise<void>; // Changed return type to Promise<void>
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  selectedLocation: Location | null;
  setSelectedLocation: React.Dispatch<React.SetStateAction<Location | null>>;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  user: User | null | undefined; // User can be null (logged out), undefined (loading), or a User object
  loading: boolean; // Renamed from authLoading for clarity with useAuthState
  error: any; // Include error from useAuthState
  placeSearchResults: Place[];
  isSearchingPlaces: boolean;
  previewPlace: (place: Place) => void;
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  addLocation: (
    details: { lat: number; lng: number; name: string; country: string; continent: string; isFavorite?: boolean },
    placeId?: string,
    callback?: () => void,
    showToast?: boolean
  ) => Promise<void>; // Changed return type to Promise<void>
  handleImportJSON: (file: File) => Promise<void>; // Changed return type to Promise<void>
  toggleFavoriteStatus: (id: string, isFavorite: boolean) => Promise<void>; // Changed return type to Promise<void>
  allUsersUniqueLocations: { [key: string]: { userName: string; countries: string[]; continents: string[] } };
  userThemePreference: UserData['themePreference'] | undefined; // Allow undefined for initial loading or anonymous
  signInAnonymously: () => Promise<void>; // Function to sign in anonymously
}


const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [language, setLanguage] = useState<Language>('ca');
  // Use useAuthState from react-firebase-hooks for comprehensive auth state management
  const [user, loading, error] = useAuthState(auth);
  const [placeSearchResults, setPlaceSearchResults] = useState<Place[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('search');
  const [allUsersUniqueLocations, setAllUsersUniqueLocations] = useState<{ [key: string]: { userName: string; countries: string[]; continents: string[] } }>({});
  const [locations, setLocations] = useState<Location[]>([]);
  // Initialize theme preference to undefined to indicate loading/not set
  const [userThemePreference, setUserThemePreference] = useState<UserData['themePreference'] | undefined>(undefined);


  const t = useMemo(() => getTranslation(language), [language]);

  // Effect to handle user authentication state changes and load data
  useEffect(() => {
    // Only proceed if the auth state is not loading
    if (!loading) {
      if (user) {
        if (user.isAnonymous) {
          console.log("User is anonymous. Loading locations from local storage.");
          // Load locations from local storage
          // Use UID for uniqueness in local storage keys to support multiple anonymous users on the same device
          const storedLocations = localStorage.getItem(`anonymousLocations_${user.uid}`);
          if (storedLocations) {
            try {
              const parsedLocations: any[] = JSON.parse(storedLocations);
              setLocations(parsedLocations.map(loc => ({
                ...loc,
                date: loc.date ? new Date(loc.date) : new Date(), // Convert timestamp string back to Date object, handle missing
              })));
            } catch (e) {
              console.error("Error parsing local storage locations:", e);
              setLocations([]); // Clear if corrupted
            }
          } else {
            setLocations([]); // Initialize empty if nothing stored
          }
          // Load theme preference from local storage for anonymous users
          const storedTheme = localStorage.getItem(`anonymousThemePreference_${user.uid}`);
          setUserThemePreference((storedTheme as UserData['themePreference']) || 'system');


        } else {
          console.log("User is registered. Loading locations from Firestore.");
          // Existing logic to load from Firestore for registered users
          const locationsCollection = collection(db, 'users', user.uid, 'locations');
          const q = query(locationsCollection, orderBy('date', 'desc')); // Assuming 'date' is the field for ordering

          const unsubscribeLocations = onSnapshot(q, (snapshot) => {
            const fetchedLocations: Location[] = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data() as Omit<Location, 'id' | 'timestamp'>, // Cast data to Location type
              timestamp: doc.data().date ? new Date(doc.data().date) : new Date() // Convert date string to Date object, handle missing
            }));
            // Optional: Deep compare to avoid unnecessary state updates
             if (JSON.stringify(fetchedLocations) !== JSON.stringify(locations)) {
               setLocations(fetchedLocations);
            }
          }, (error) => {
            console.error("Error fetching locations: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load locations.' });
          });

          // Fetch user document and theme preference from Firestore
          const userDocRef = doc(db, 'users', user.uid);
          getDoc(userDocRef).then((docSnap) => {
            if (docSnap.exists()) {
              setUserThemePreference(docSnap.data().themePreference || 'system');
            } else {
              // Default or handle missing user document/theme preference
              setUserThemePreference('system');
            }
          }).catch(error => {
            console.error("Error fetching user document/theme preference:", error);
            setUserThemePreference('system'); // Fallback
          });


          return () => unsubscribeLocations(); // Cleanup Firestore locations listener
        }
      } else {
        console.log("User logged out or no user.");
        // Clear locations and theme preference when user logs out or is initially not logged in
        setLocations([]);
        setSelectedLocation(null); // Clear selected location on logout
        setUserThemePreference(undefined);
        // Optionally clear anonymous data from local storage on explicit logout
        // if (typeof window !== 'undefined') { // Check if in browser
        //   localStorage.removeItem('anonymousLocations');
        //   localStorage.removeItem('anonymousThemePreference');
        // }
      }
    }
  }, [user, loading, db, toast]); // Added loading to dependencies and db, toast for effects

  // Effect to save locations to local storage for anonymous users
  useEffect(() => {
    // Ensure we are in the browser environment before accessing localStorage
    if (typeof window !== 'undefined' && user && user.isAnonymous) {
      console.log("Saving anonymous locations to local storage.");
      // Use UID for uniqueness in local storage keys
      if (locations.length > 0) {
        localStorage.setItem(`anonymousLocations_${user.uid}`, JSON.stringify(locations));
      } else {
        // Clear local storage if the locations array becomes empty
        localStorage.removeItem(`anonymousLocations_${user.uid}`);
      }
    }
  }, [locations, user]); // Dependencies

  // Effect to save theme preference locally for anonymous users
  useEffect(() => {
     // Ensure we are in the browser environment before accessing localStorage
    if (typeof window !== 'undefined' && user && user.isAnonymous) {
      console.log("Saving anonymous theme preference to local storage.");
      // Use UID for uniqueness in local storage keys
      if (userThemePreference !== undefined) {
        localStorage.setItem(`anonymousThemePreference_${user.uid}`, userThemePreference);
      } else {
        // Clear local storage if theme preference becomes undefined
        localStorage.removeItem(`anonymousThemePreference_${user.uid}`);
      }
    }
  }, [userThemePreference, user]);


  // Effect to fetch all users' unique location data (only for registered users)
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

    // Only fetch for registered users
    if (user && !user.isAnonymous) {
      fetchAllUsersData();
    } else {
      // Clear data if user is anonymous or logged out
      setAllUsersUniqueLocations({});
    }
 }, [user]); // Depend on user so it refetches/clears when auth state changes


  // Function to sign in anonymously
  const handleAnonymousSignIn = useCallback(async () => {
    try {
      await signInAnonymously(auth);
      console.log("Signed in anonymously.");
      toast({ title: 'Trial Mode', description: 'You are signed in anonymously. Your data will be saved locally on this device.' });

    } catch (error: any) {
      console.error("Error signing in anonymously:", error);
      toast({ variant: 'destructive', title: 'Anonymous Sign-In Failed', description: error.message });
    }
  }, [auth, toast]);


  // Add location function (handles both Firestore and Local Storage)
  const addLocation = useCallback(async (
    details: { lat: number; lng: number; name: string; country: string; continent: string; isFavorite?: boolean },
    placeId?: string, // placeId is used as doc ID for Firestore
    callback?: () => void,
    showToast: boolean = true
  ) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'User not authenticated.' });
      callback?.();
      return;
    }

    // Generate an ID. Use placeId if provided, otherwise generate a new one.
    const locationId = placeId || Date.now().toString();


    const newLocation: Location = {
      id: locationId,
      name: details.name,
      lat: details.lat,
      lng: details.lng,
      date: new Date().toISOString(), // Use Date object for timestamp
      country: details.country || 'Unknown',
      continent: details.continent || 'Unknown',
      isFavorite: details.isFavorite ?? false,
    };

    if (user.isAnonymous) {
      console.log("User is anonymous. Adding location to local storage state.");
      // Add to local storage state immutably
      setLocations(prevLocations => {
          // Prevent adding duplicates based on ID in local storage
          if (prevLocations.some(loc => loc.id === newLocation.id)) {
              console.warn(`Skipping adding duplicate location with ID: ${newLocation.id} to local storage.`);
              if (showToast) {
                  toast({ title: 'Duplicate Location', description: `${details.name} is already in your trial list.` });
              }
              return prevLocations; // Return previous state if duplicate
          }
          return [...prevLocations, newLocation];
      });

      if (showToast) {
          toast({ title: 'Location Added', description: `${details.name} has been added to your trial list.` });
      }
      callback?.(); // Call callback immediately for anonymous


    } else {
      console.log("User is registered. Adding location to Firestore.");
      // Existing logic to add to Firestore for registered users
      try {
        const locationsCollection = collection(db, 'users', user.uid, 'locations');
        // Use the generated ID for consistency. Firestore uses 'date' field for ordering.
        await setDoc(doc(locationsCollection, newLocation.id), {
             ...newLocation,
             date: newLocation.date.toString() // Save timestamp as ISO string in Firestore 'date' field
        });

        if (showToast) {
           toast({ title: t('locationAdded'), description: `${details.name} ${t('hasBeenAdded')}` });
        }
        callback?.();

      } catch (error) {
        console.error("Error adding location to Firestore: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to add location.' });
        callback?.();
      }
    }
  }, [user, db, toast, setLocations, t]); // Add setLocations and t to dependencies


  // addPlaceAsLocation function (uses the modified addLocation)
  const addPlaceAsLocation = useCallback(async (place: Place, callback?: () => void) => {
    await addLocation( // Use await here
      {
        lat: place.lat,
        lng: place.lng,
        name: place.name,
        country: place.country,
        continent: place.continent,
        isFavorite: false, // Default to false when adding from place search
      },
      place.id, // Use place.id as potential Firestore doc ID
      callback
    );
  }, [addLocation]);


  // Delete location function (handles both Firestore and Local Storage)
  const deleteLocation = useCallback(async (idToDelete: string) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'User not authenticated.' });
      return;
    }

    if (user.isAnonymous) {
      console.log("User is anonymous. Deleting location from local storage state.");
      // Update local storage state by filtering immutably
      setLocations(prevLocations => prevLocations.filter(location => location.id !== idToDelete));
      toast({ title: 'Location Removed', description: 'The location has been removed from your trial list.'});
    } else {
      console.log("User is registered. Deleting location from Firestore.");
      // Existing logic to delete from Firestore for registered users
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'locations', idToDelete));
        // The onSnapshot listener will automatically update the local state for registered users
        toast({ title: 'Location Removed', description: 'The location has been removed from your list.'});
      } catch (error) {
        console.error("Error deleting location from Firestore: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove location.' });
      }
    }
  }, [user, db, toast, setLocations]); // Add setLocations to dependencies

  // Update favorite status function (handles both Firestore and Local Storage)
  const toggleFavoriteStatus = useCallback(async (idToUpdate: string, isFavorite: boolean) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'User not authenticated.' });
      return;
    }

    if (user.isAnonymous) {
      console.log("User is anonymous. Toggling favorite status in local storage state.");
      // Update local storage state immutably
      setLocations(prevLocations => prevLocations.map(location =>
        location.id === idToUpdate ? { ...location, isFavorite: isFavorite } : location
      ));
      toast({ title: 'Location Updated', description: 'The location\'s favorite status has been updated in your trial list.' });
    } else {
      console.log("User is registered. Toggling favorite status in Firestore.");
      // Existing logic to update in Firestore
      try {
        const locationRef = doc(db, 'users', user.uid, 'locations', idToUpdate);
        await setDoc(locationRef, { isFavorite }, { merge: true });
        // The onSnapshot listener will automatically update the local state for registered users
        toast({ title: 'Location Updated', description: 'The location\'s favorite status has been updated.' });
      } catch (error) {
        console.error("Error toggling favorite status in Firestore: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to update location favorite status.' });
      }
    }
  }, [user, db, toast, setLocations]); // Add setLocations to dependencies


  // handleImportJSON function (handles both Firestore and Local Storage)
  const handleImportJSON = useCallback(async (file: File) => {
    if (!user) {
       toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in or in trial mode to import locations.' });
       return;
    }

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
            // Use the addLocation function which handles both anonymous and registered users
            await addLocation({
              name: location.name,
              lat: location.lat,
              lng: location.lng,
              country: location.country || 'Unknown',
              continent: location.continent || 'Unknown',
              isFavorite: location.isFavorite ?? false,
             }, location.id, undefined, false); // Pass existing ID and suppress toast for individual additions
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
  }, [user, addLocation, toast]); // Added user, addLocation, toast to dependencies


  const previewPlace = useCallback((place: Place) => {
    setSelectedLocation({
      ...place,
      id: place.id || Date().toString(), // Ensure preview place has an ID
      date: new Date().toString(), // Add a default timestamp
      isFavorite: false, // Default to false for preview
    });
  }, []);


  useEffect(() => {
    const handleSearch = () => {
      if (searchTerm.length > 2) {
        setIsSearchingPlaces(true);
        searchPlacesByText({ query: searchTerm })
          .then(results => {
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
                  console.log(`Geocoding set Catalunya for City: ${place.name} Address: ${result.address}`); // Log original address too
                }
              }

              if (place.country === 'Unknown') {
                console.log(`Geocoding Unknown country for ${place.name}, Address:${place.address}!`);
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

  const filteredLocations = useMemo(() => {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      return locations.filter(location => {
          const lowerCaseName = location.name.toLowerCase();
          const lowerCaseCountry = location.country.toLowerCase();

          // Check if the searchTerm is present in the location name OR the location country
          return lowerCaseName.includes(lowerCaseSearchTerm) || lowerCaseCountry.includes(lowerCaseSearchTerm);
      });
  }, [locations, searchTerm]); // Filtered locations depend on locations and searchTerm


  // Memoize the context value to prevent new object references on every render
  const contextValue = useMemo(() => ({
    locations,
    filteredLocations, // Include filteredLocations
    selectedLocation,
    setSelectedLocation,
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    deleteLocation,
    addLocation,
    toggleFavoriteStatus, // Include toggleFavoriteStatus
    handleImportJSON, // Include handleImportJSON
    addPlaceAsLocation, // Include addPlaceAsLocation
    previewPlace, // Include previewPlace
    language, // Include language
    setLanguage, // Include setLanguage
    t, // Include t
    user, // Include user
    loading, // Include loading (from useAuthState)
    error, // Include error (from useAuthState)
    placeSearchResults, // Include placeSearchResults
    isSearchingPlaces, // Include isSearchingPlaces
    allUsersUniqueLocations, // Include allUsersUniqueLocations
    userThemePreference, // Include userThemePreference
    signInAnonymously: handleAnonymousSignIn, // Expose the anonymous sign-in function
  }), [
    locations,
    filteredLocations, // Add filteredLocations dependency
    selectedLocation,
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    deleteLocation,
    addLocation,
    toggleFavoriteStatus, // Add toggleFavoriteStatus dependency
    handleImportJSON, // Add handleImportJSON dependency
    addPlaceAsLocation, // Add addPlaceAsLocation dependency
    previewPlace, // Add previewPlace dependency
    language,
    setLanguage,
    t,
    user,
    loading,
    error,
    placeSearchResults,
    isSearchingPlaces,
    allUsersUniqueLocations, // Add allUsersUniqueLocations dependency
    userThemePreference,
    handleAnonymousSignIn,
  ]); // Add all dependencies


  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
