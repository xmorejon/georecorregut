'use client';

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import type { Location, Language, Place } from '@/lib/types';
import { getTranslation } from '@/lib/data';
import { useAuth } from '@/hooks/use-auth';
import type { User } from 'firebase/auth';
import { searchPlacesByText } from '@/ai/flows/places-flow';
import { reverseGeocode } from '@/ai/flows/reverse-geocode-flow';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, doc, deleteDoc, query, orderBy, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface AppContextType {
  locations: Location[];
  filteredLocations: Location[];
  addLocation: (location: Omit<Location, 'id' | 'date' | 'country' | 'continent'> & { id?: string }, setLoading?: (loading: boolean) => void) => void;
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
  addPlaceAsLocation: (place: Place, setLoading?: (loading: boolean) => void) => void;
  previewPlace: (place: Place) => void;
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
    location: Omit<Location, 'date' | 'country' | 'continent'> & { id?: string },
    setLoading?: (loading: boolean) => void
  ) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to add a location.' });
      setLoading?.(false);
      return;
    }
  
    setLoading?.(true);
    try {
      const geoInfo = await reverseGeocode({ lat: location.lat, lng: location.lng });
      
      const newLocationData = {
        name: location.name,
        lat: location.lat,
        lng: location.lng,
        date: new Date().toISOString(),
        country: geoInfo.country,
        continent: geoInfo.continent,
      };
  
      // The document path is users/{userId}/locations/{locationId}
      const userLocationsCollection = collection(db, 'users', user.uid, 'locations');
  
      if (location.id) {
        // If an ID is provided (from a Place), use it to set the document.
        // This will create or overwrite the document with the specified ID.
        await setDoc(doc(userLocationsCollection, location.id), newLocationData);
      } else {
        // If no ID is provided (e.g., current location), Firestore will generate one.
        await addDoc(userLocationsCollection, newLocationData);
      }
      
      toast({
        title: t('locationAdded'),
        description: `${location.name} ${t('hasBeenAdded')}`,
      });
  
    } catch (error) {
      console.error("Error adding location:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add location.' });
    } finally {
      setLoading?.(false);
    }
  }, [user, t, toast]);
  
  const addPlaceAsLocation = useCallback((place: Place, setLoading?: (loading: boolean) => void) => {
    addLocation(
      {
        id: place.id, // Pass the ID from the place
        name: place.name,
        lat: place.lat,
        lng: place.lng,
      },
      setLoading
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
      id: place.id,
      name: place.name,
      lat: place.lat,
      lng: place.lng,
      date: '',
      country: '',
      continent: ''
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
