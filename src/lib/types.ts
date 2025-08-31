export type Location = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  date: string;
  country: string;
  continent: string;
  isFavorite: boolean;
};

export type Translations = {
  [key: string]: {
    [key: string]: string;
  };
};

export type Language = 'ca' | 'es' | 'en';

export interface Place {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  country: string;
  continent: string;
}

// Add UserData type
export type UserData = {
  themePreference?: 'light' | 'dark' | 'system'; // Make it optional as it might not exist for all users
};
