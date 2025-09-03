// In src/contexts/app-context.tsx

'use client';

import { useEffect, useState, useContext, createContext, useMemo, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, collection, query, orderBy, onSnapshot, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { signInAnonymously, User, signOut } from 'firebase/auth'; // Import signInAnonymously, User, and signOut
import { auth, db, getAllUsersUniqueLocationsData } from '@/lib/firebase'; // Your Firebase instances
import { useToast } from '@/hooks/use-toast'; // Assuming useToast is in this path
import { useRouter } from 'next/navigation'; // Import useRouter for redirection after logout


// Assuming your types are defined in '@/lib/types'
import type { Location, Language, Place, UserData } from '@/lib/types';
import { getTranslation } from '@/lib/data'; // Assuming getTranslation is imported from '@/lib/data'
import { searchPlacesByText } from '@/ai/flows/places-flow';


interface AppContextType {
  locations: Location[];
  filteredLocations: Location[];
  addPlaceAsLocation: (place: Place, callback?: () => void) => void;
  deleteLocation: (id: string) => Promise<void>;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  selectedLocation: Location | null;
  setSelectedLocation: React.Dispatch<React.SetStateAction<Location | null>>;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  user: User | null | undefined; // User can be null (logged out), undefined (loading), or a User object
  loading: boolean; // From useAuthState
  error: any; // From useAuthState
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
  ) => Promise<void>;
  handleImportJSON: (file: File) => Promise<void>;
  toggleFavoriteStatus: (id: string, isFavorite: boolean) => Promise<void>;
  allUsersUniqueLocations: { [key: string]: { userName: string; countries: string[]; continents: string[] } };
  userThemePreference: UserData['themePreference'] | undefined;
  signInAnonymously: () => Promise<void>; // Function to sign in anonymously via button
  isSavingAnonymousData: boolean; // Expose saving state
  logout: () => Promise<void>; // Expose logout function
}


const AppContext = createContext<AppContextType | undefined>(undefined);

// Define a constant for the anonymous local storage key
const ANONYMOUS_LOCATIONS_STORAGE_KEY = 'anonymousTrialLocations';
const ANONYMOUS_THEME_STORAGE_KEY = 'anonymousTrialThemePreference';

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter(); // Get router instance
  const [user, loading, error] = useAuthState(auth);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [activeTab, setActiveTab] = useState('search'); // Assuming you manage tabs here
  const [searchTerm, setSearchTerm] = useState(''); // Assuming you manage search term here
  // Initialize theme preference to undefined to indicate loading/not set
  const [userThemePreference, setUserThemePreference] = useState<UserData['themePreference'] | undefined>(undefined);
  const [placeSearchResults, setPlaceSearchResults] = useState<Place[]>([] );
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const { toast } = useToast();
  const [allUsersUniqueLocations, setAllUsersUniqueLocations] = useState<{ [key: string]: { userName: string; countries: string[]; continents: string[] } }>({});
  const [isSavingAnonymousData, setIsSavingAnonymousData] = useState(false); // State to track saving
  const [language, setLanguage] = useState<Language>('ca'); // Moved language state here
  const t = useMemo(() => getTranslation(language), [language]);

  // New state to track if the user has explicitly logged out
  const [isExplicitlyLoggedOut, setIsExplicitlyLoggedOut] = useState(false);


  // Effect to handle user authentication state changes and load data
  useEffect(() => {
    let unsubscribeLocations: (() => void) | undefined = undefined; // Initialize to undefined

    if (!loading) {
      if (user) {
        if (!user.isAnonymous) { // Registered user
          console.log("User is registered. Loading locations from Firestore.");
          // Existing logic to load from Firestore for registered users
          const locationsCollection = collection(db, 'users', user.uid, 'locations');
          const q = query(locationsCollection, orderBy('date', 'desc')); // Assuming 'date' is the field for ordering

          unsubscribeLocations = onSnapshot(q, (snapshot) => {
            const fetchedLocations: Location[] = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data() as Omit<Location, 'id'>, // Cast data to Location type, Omit timestamp
              date: doc.data().date, // Keep date as string from Firestore
            }));
             console.log("Fetched locations from Firestore:", fetchedLocations);
            // Optional: Deep compare to avoid unnecessary state updates
             if (JSON.stringify(fetchedLocations) !== JSON.stringify(locations)) {
               setLocations(fetchedLocations);
            }
          }, (error) => {
            console.error("Error fetching locations from Firestore: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load locations.' });
          });

          // Fetch user document and theme preference from Firestore for registered users
          const userDocRef = doc(db, 'users', user.uid);
          getDoc(userDocRef).then((docSnap) => {
            if (docSnap.exists()) {
              setUserThemePreference(docSnap.data().themePreference || 'system');
               console.log("Fetched theme preference from Firestore:", docSnap.data().themePreference);
            } else {
              // Default or handle missing user document/theme preference
              setUserThemePreference('system');
               console.log("User document not found, setting default theme preference.");
            }
          }).catch(error => {
            console.error("Error fetching user document/theme preference:", error);
            setUserThemePreference('system'); // Fallback
          });


        } else { // Anonymous user (signed in, but not registered)
             console.log("User is anonymous. Loading locations and theme from local storage.");
             // Load locations from local storage for anonymous user
              if (typeof window !== 'undefined') {
                  const storedLocations = localStorage.getItem(ANONYMOUS_LOCATIONS_STORAGE_KEY);
                  if (storedLocations) {
                      try {
                        const parsedLocations: any[] = JSON.parse(storedLocations);
                        setLocations(parsedLocations.map(loc => ({
                          ...loc,
                           date: loc.date, // Keep date as string
                          timestamp: loc.date ? new Date(loc.date) : new Date(), // Convert date string to Date object
                        })));
                         console.log("Loaded anonymous trial locations from local storage.");
                      } catch (e) {
                          console.error("Error parsing anonymous trial locations from local storage:", e);
                           setLocations([]); // Clear if corrupted
                      }
                  } else {
                       setLocations([]); // Initialize empty if no local data
                       console.log("No anonymous trial locations found in local storage.");
                  }

                  // Load theme preference from local storage for anonymous user
                  const storedTheme = localStorage.getItem(ANONYMOUS_THEME_STORAGE_KEY);
                   setUserThemePreference((storedTheme as UserData['themePreference']) || 'system');
                    console.log("Loaded anonymous theme preference from local storage.");
              }
          }
      } else { // User logged out or no user initially
         console.log("User logged out or no user. Clearing state.");
         setLocations([]);
         setSelectedLocation(null);
         setUserThemePreference(undefined);
      }
    }

     // Cleanup function for the effect
     return () => {
        // If unsubscribeLocations was set (for registered users), clean it up
        if (unsubscribeLocations) {
            unsubscribeLocations();
        }
     };

  }, [user, loading, db, toast]); // Dependencies remain the same

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

    // Only fetch for registered users and when auth is not loading
    if (user && !user.isAnonymous && !loading) {
      fetchAllUsersData();
    } else {
      // Clear data if user is anonymous or logged out
      setAllUsersUniqueLocations({});
    }
 }, [user, loading]); // Depend on user and loading


  // Function to sign in anonymously explicitly (e.g., from a button)
  // This is primarily used for the button click on login/signup pages
  const handleAnonymousSignIn = useCallback(async () => {
    try {
      // If a user is already logged in (including anonymous), sign them out first
      if (auth.currentUser) {
         await auth.signOut();
         console.log("Signed out existing user before anonymous sign-in via button.");
      }
      // Reset explicit logout state when attempting to sign in anonymously via button
      setIsExplicitlyLoggedOut(false);
      await signInAnonymously(auth);
      console.log("Signed in anonymously via button.");
      toast({ title: 'Trial Mode', description: 'You are signed in anonymously. Your data will be saved locally on this device.' });

    } catch (error: any) {
      console.error("Error signing in anonymously via button:", error);
      toast({ variant: 'destructive', title: 'Anonymous Sign-In Failed', description: error.message });
    }
  }, [auth, toast, setIsExplicitlyLoggedOut]);


  // Function to handle user logout
  const logout = useCallback(async () => {
      try {
          // Set the explicit logout state before signing out
          setIsExplicitlyLoggedOut(true);
          await signOut(auth);
          console.log("User logged out.");
          // Redirect to login page after logout
          router.push('/login');
      } catch (error: any) {
          console.error("Error logging out:", error);
          toast({ variant: 'destructive', title: 'Logout Failed', description: error.message });
      }
  }, [auth, toast, router, setIsExplicitlyLoggedOut]);


  // Add location function (handles both Firestore and Local Storage)
  const addLocation = useCallback(async (
    details: { lat: number; lng: number; name: string; country: string; continent: string; isFavorite?: boolean },
    placeId?: string, // placeId is used as doc ID for Firestore
    callback?: () => void,
    showToast: boolean = true
  ) => {
    // Check if user is available and NOT registered (trial mode)
    const isTrialUser = user && user.isAnonymous;

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
      date: new Date().toISOString(), // Use 'date' property as ISO string
      country: details.country || 'Unknown',
      continent: details.continent || 'Unknown',
      isFavorite: details.isFavorite ?? false,
    };

    if (isTrialUser) {
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
          const updatedLocations = [...prevLocations, newLocation];
          // *** Save to local storage immediately after updating state ***
          if (typeof window !== 'undefined') {
              localStorage.setItem(ANONYMOUS_LOCATIONS_STORAGE_KEY, JSON.stringify(updatedLocations));
               console.log("Saved anonymous locations to local storage after adding.");
          }
          return updatedLocations;
      });

      if (showToast) {
          toast({ title: 'Location Added', description: `${details.name} has been added to your trial list.` });
      }
      callback?.(); // Call callback immediately for anonymous

    } else { // Registered user
      console.log("User is registered. Adding location to Firestore.");
      // Existing logic to add to Firestore for registered users
      try {
        const locationsCollection = collection(db, 'users', user.uid, 'locations');
        // Use the generated ID for consistency. Firestore uses 'date' field for ordering.
        // Ensure date is saved as string in Firestore
        await setDoc(doc(locationsCollection, newLocation.id), {
             ...newLocation,
             date: newLocation.date
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
     // Check if user is available and NOT registered (trial mode)
    const isTrialUser = user && user.isAnonymous;

    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'User not authenticated.' });
      return;
    }

    if (isTrialUser) {
      console.log("User is anonymous. Deleting location from local storage state.");
      // Update local storage state by filtering immutably
      setLocations(prevLocations => {
         const updatedLocations = prevLocations.filter(location => location.id !== idToDelete);
         // *** Save to local storage immediately after updating state ***
         if (typeof window !== 'undefined') {
             if (updatedLocations.length > 0) {
                 localStorage.setItem(ANONYMOUS_LOCATIONS_STORAGE_KEY, JSON.stringify(updatedLocations));
                  console.log("Saved anonymous locations to local storage after deleting.");
             } else {
                  localStorage.removeItem(ANONYMOUS_LOCATIONS_STORAGE_KEY);
                   console.log("Cleared anonymous locations from local storage after deleting last item.");
             }
         }
         return updatedLocations;
      });
      toast({ title: 'Location Removed', description: 'The location has been removed from your trial list.'});
    } else { // Registered user
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
     // Check if user is available and NOT registered (trial mode)
    const isTrialUser = user && user.isAnonymous;

    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'User not authenticated.' });
      return;
    }

    if (isTrialUser) {
      console.log("User is anonymous. Toggling favorite status in local storage state.");
      // Update local storage state immutably
      setLocations(prevLocations => {
         const updatedLocations = prevLocations.map(location =>
            location.id === idToUpdate ? { ...location, isFavorite: isFavorite } : location
         );
         // *** Save to local storage immediately after updating state ***
         if (typeof window !== 'undefined') {
              localStorage.setItem(ANONYMOUS_LOCATIONS_STORAGE_KEY, JSON.stringify(updatedLocations));
               console.log("Saved anonymous locations to local storage after updating favorite status.");
         }
         return updatedLocations;
      });
      toast({ title: 'Location Updated', description: 'The location\'s favorite status has been updated in your trial list.' });
    } else { // Registered user
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
    // Check if user is available and NOT registered (trial mode)
    const isTrialUser = user && user.isAnonymous;

    if (!user) {
       toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in or in trial mode to import locations.' });
       return;
    }

    if (!isTrialUser) {
        // If not a trial user, perform Firestore import (existing logic)
         console.log("User is registered. Importing locations to Firestore.");
         // You'll need to add the actual Firestore import logic here
         // It might involve reading the JSON and then using addLocation for each item
         // For now, just show a message or keep your existing Firestore import logic if it's separate
         toast({ title: 'Import', description: 'Import to Firestore is not yet fully implemented in this function.'});
         return;
    }


    console.log("User is anonymous. Importing locations to local storage.");
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);

        if (!Array.isArray(json)) {
          toast({ variant: 'destructive', title: 'Import Error', description: 'Invalid JSON format. Expected an array.' });
          return;
        }

        let importedCount = 0;
        const importedLocations: Location[] = []; // Collect imported locations

        for (const location of json) {
          // Basic validation for essential properties
          if (location.name && typeof location.lat === 'number' && typeof location.lng === 'number') {
              const newLocation: Location = {
                  id: location.id || Date.now().toString() + importedCount, // Generate ID if missing, ensure uniqueness for imports
                  name: location.name,
                  lat: location.lat,
                  lng: location.lng,
                  date: location.date || new Date().toISOString(), // Use existing date or generate
                  country: location.country || 'Unknown',
                  continent: location.continent || 'Unknown',
                  isFavorite: location.isFavorite ?? false,
              };
               // Prevent adding duplicates based on ID in local storage during import
              if (!locations.some(loc => loc.id === newLocation.id) && !importedLocations.some(loc => loc.id === newLocation.id)) {
                 importedLocations.push(newLocation);
                 importedCount++;
              } else {
                 console.warn(`Skipping adding duplicate or invalid location data during import:`, location);
              }
          } else {
            console.warn('Skipping invalid location data during import:', location);
          }
        }

        // *** Update local storage state with all imported locations at once ***
         setLocations(prevLocations => {
            const updatedLocations = [...prevLocations, ...importedLocations];
             if (typeof window !== 'undefined') {
                  if (updatedLocations.length > 0) {
                      localStorage.setItem(ANONYMOUS_LOCATIONS_STORAGE_KEY, JSON.stringify(updatedLocations));
                       console.log("Saved anonymous locations to local storage after importing.");
                  } else {
                       localStorage.removeItem(ANONYMOUS_LOCATIONS_STORAGE_KEY);
                        console.log("Cleared anonymous locations from local storage after importing (resulted in empty).");
                  }
             }
            return updatedLocations;
         });

        toast({ title: 'Import Successful', description: `${importedCount} locations imported.` });

      } catch (error) {
        console.error('Error importing locations:', error);
        toast({ variant: 'destructive', title: 'Import Error', description: 'Failed to import locations. Please check the file format.' });
      }
    };
    reader.readAsText(file);
  }, [user, locations, toast, setLocations]); // Added user, locations, toast, setLocations to dependencies


  const previewPlace = useCallback((place: Place) => {
    setSelectedLocation({
      ...place,
      id: place.id || Date.now().toString(), // Ensure preview place has an ID
      date: new Date().toISOString(), // Use 'date' property as ISO string
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
    filteredLocations,
    selectedLocation,
    setSelectedLocation,
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    deleteLocation,
    addLocation,
    toggleFavoriteStatus,
    handleImportJSON,
    addPlaceAsLocation,
    previewPlace,
    language,
    setLanguage,
    t,
    user,
    loading,
    error,
    placeSearchResults,
    isSearchingPlaces,
    allUsersUniqueLocations,
    userThemePreference,
    signInAnonymously: handleAnonymousSignIn, // Expose the anonymous sign-in function
    isSavingAnonymousData, // Expose saving state
    logout, // Include logout function in the context value
  }), [
    locations,
    filteredLocations,
    selectedLocation,
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    deleteLocation,
    addLocation,
    toggleFavoriteStatus,
    handleImportJSON,
    addPlaceAsLocation,
    previewPlace,
    language,
    setLanguage,
    t,
    user,
    loading,
    error,
    placeSearchResults,
    isSearchingPlaces,
    allUsersUniqueLocations,
    userThemePreference,
    handleAnonymousSignIn,
    isSavingAnonymousData,
    logout, // Add logout dependency
  ]);


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
