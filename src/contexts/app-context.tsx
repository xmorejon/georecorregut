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
  addLocation: (
    details: { lat: number; lng: number; name: string, country: string, continent: string },
    placeId?: string,
    callback?: () => void
  ) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [language, setLanguage] = useState<Language>('ca');
  const { user, loading: authLoading } = useAuth();
  const [placeSearchResults, setPlaceSearchResults] = useState<Place[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const { toast } = useToast();

  const t = useMemo(() => getTranslation(language), [language]);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'users', user.uid, 'locations'), orderBy('date', 'desc'));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const userLocations: Location[] = [];
        querySnapshot.forEach((doc) => {
          userLocations.push({ id: doc.id, ...doc.data() } as Location);
        });
        setLocations(userLocations);
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
    details: { lat: number; lng: number; name: string, country: string, continent: string },
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
      },
      place.id,
      callback
    );
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

  const previewPlace = useCallback((place: Place) => {
    setSelectedLocation({
      ...place,
      date: '',
    });
  }, []);

  useEffect(() => {
    const handleSearch = () => {
      if (searchTerm.length > 2) {
        setIsSearchingPlaces(true);
        searchPlacesByText({ query: searchTerm })
          .then(results => {
            setPlaceSearchResults(results);
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
    locations,
    filteredLocations,
    addLocation,
    deleteLocation,
    searchTerm,
    setSearchTerm,
    selectedLocation,
    setSelectedLocation,
    language,
    setLanguage,
    t,
    user,
    authLoading,
    placeSearchResults,
    isSearchingPlaces,
    addPlaceAsLocation,
    previewPlace
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
