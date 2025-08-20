'use client';

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import type { Location, Language, Place } from '@/lib/types';
import { getTranslation } from '@/lib/data';
import { useAuth } from '@/hooks/use-auth';
import type { User } from 'firebase/auth';
import { searchPlacesByText } from '@/ai/flows/places-flow';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, deleteDoc, query, orderBy, setDoc, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface AppContextType {
  mode: string;
  setMode: (newMode: string) => void;
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
    callback?: () => void
  ) => void;
  toggleFavoriteStatus: (id: string, isFavorite: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setModeState] = useState('light');
  const setMode = (newMode: string) => {
    console.log('Changing mode to:', newMode);
    setModeState(newMode);
  };
  const [locations, setLocations] = useState<Location[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [language, setLanguage] = useState<Language>('ca');
  const { user, loading: authLoading } = useAuth();
  const [placeSearchResults, setPlaceSearchResults] = useState<Place[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('search');

  const t = useMemo(() => getTranslation(language), [language]);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'users', user.uid, 'locations'), orderBy('date', 'desc'));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
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
      return () => unsubscribe();
    } else {
      setLocations([]);
 }
  }, [user, toast]);

  const addLocation = useCallback(async (
    details: { lat: number; lng: number; name: string, country: string, continent: string, isFavorite?: boolean },
    placeId?: string,
    callback?: () => void
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
  
      toast({
        title: t('locationAdded'),
        description: `${details.name} ${t('hasBeenAdded')}`,
      });
  
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
    setSearchTerm(''); // Clear search term after adding location
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



  const previewPlace = useCallback((place: Place) => {
    setSelectedLocation({
      ...place,
      date: '',
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
    if (!searchTerm) return locations;
    return locations.filter(location =>
      location.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [locations, searchTerm]);

  const value = {
    mode,
    setMode,
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
    setActiveTab,
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
