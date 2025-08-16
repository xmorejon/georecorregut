'use client';

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import type { Location, Language } from '@/lib/types';
import { initialLocations, getTranslation, translations } from '@/lib/data';

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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [locations, setLocations] = useState<Location[]>(initialLocations);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [language, setLanguage] = useState<Language>('ca');

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

  const filteredLocations = useMemo(() => {
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
