export type Location = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  date: string;
  country: string;
  continent: string;
};

export type Translations = {
  [key: string]: {
    [key: string]: string;
  };
};

export type Language = 'ca' | 'es' | 'en';
