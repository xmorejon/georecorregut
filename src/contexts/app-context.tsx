'use client';

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import type { Location, Language, Place } from '@/lib/types';
import { initialLocations, getTranslation } from '@/lib/data';
import { useAuth } from '@/hooks/use-auth';
import type { User } from 'firebase/auth';
import { searchPlacesByText } from '@/ai/flows/places-flow';


interface AppContextType {
  locations: Location[];
  filteredLocations: Location[];
  addLocation: (location: Omit<Location, 'id' | 'date' | 'country' | 'continent'>) => void;
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
  addPlaceAsLocation: (place: Place) => void;
  previewPlace: (place: Place) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [locations, setLocations] = useState<Location[]>(initialLocations);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [language, setLanguage] = useState<Language>('ca');
  const { user, loading: authLoading } = useAuth();
  const [placeSearchResults, setPlaceSearchResults] = useState<Place[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);


  const addLocation = useCallback((location: Omit<Location, 'id' | 'date' | 'country' | 'continent'>) => {
    const newLocation: Location = {
      ...location,
      id: new Date().toISOString(),
      date: new Date().toLocaleDateString(),
      country: 'Unknown',
      continent: 'Unknown'
    };
    setLocations(prev => [newLocation, ...prev]);
  }, []);

  const addPlaceAsLocation = useCallback((place: Place) => {
    addLocation({
      name: place.name,
      lat: place.lat,
      lng: place.lng,
    });
  }, [addLocation]);

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
    if (searchTerm.length > 2) {
      const handleSearch = async () => {
        setIsSearchingPlaces(true);
        try {
          const results = await searchPlacesByText({ query: searchTerm });
          setPlaceSearchResults(results);
        } catch (error) {
          console.error("Error searching places:", error);
          setPlaceSearchResults([]);
        } finally {
          setIsSearchingPlaces(false);
        }
      };
      const debounceTimer = setTimeout(handleSearch, 300);
      return () => clearTimeout(debounceTimer);
    } else {
      setPlaceSearchResults([]);
    }
  }, [searchTerm]);

  const filteredLocations = useMemo(() => {
    if (!searchTerm) return locations;
    return locations.filter(location =>
      location.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [locations, searchTerm]);
  
  const t = useMemo(() => getTranslation(language), [language]);

  const value = {
    locations,
    filteredLocations,
    addLocation,
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
