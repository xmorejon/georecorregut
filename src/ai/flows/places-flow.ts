'use server';
/**
 * @fileOverview A flow for interacting with the Google Places API.
 * - searchPlacesByText - Searches for places based on a text query.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Place } from '@/lib/types';
import { Continents } from '@/lib/data';

const PlacesSearchInputSchema = z.object({
  query: z.string().describe('The text string to search for places.'),
});

export type PlacesSearchInput = z.infer<typeof PlacesSearchInputSchema>;

const PlaceSchema = z.object({
  id: z.string().optional(), // Make id optional
  name: z.string(),
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
  country: z.string(),
  continent: z.string(),
});

const PlacesSearchOutputSchema = z.array(PlaceSchema);
export type PlacesSearchOutput = z.infer<typeof PlacesSearchOutputSchema>;

// Helper to get continent from country code
export const getContinent = async (countryCode: string): Promise<string> => {
  for (const continent in Continents) {
    if (Continents[continent as keyof typeof Continents].includes(countryCode)) {
      return continent;
    }
  }
  return 'Unknown';
}

// This is an exported wrapper function that calls the Places Search flow
export async function searchPlacesByText(input: PlacesSearchInput): Promise<PlacesSearchOutput> {
  return searchPlacesByTextFlow(input);
}

const searchPlacesByTextFlow = ai.defineFlow(
  {
    name: 'searchPlacesByTextFlow',
    inputSchema: PlacesSearchInputSchema,
    outputSchema: PlacesSearchOutputSchema,
  },
  async (input) => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('Google Maps API key is not configured.');
    }

    const endpoint = `https://places.googleapis.com/v1/places:searchText`;

    const body = {
      textQuery: `city in ${input.query}`,
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.id,places.addressComponents',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Places API request failed:', response.status, errorBody);
        throw new Error(`Places API request failed with status ${response.status}`);
      }

      const data = await response.json();

      if (!data.places) {
        return [];
      }

      const results: Place[] = await Promise.all(data.places.map(async (place: any) => {
        const countryComponent = place.addressComponents?.find((c: any) => c.types.includes('country'));
        const countryName = countryComponent?.longText || 'Unknown';
        const countryCode = countryComponent?.shortText || '';
        const continentName = await getContinent(countryCode);
        
        return {
            id: place.id,
            name: place.displayName.text,
            address: place.formattedAddress,
            lat: place.location.latitude,
            lng: place.location.longitude,
            country: countryName,
            continent: continentName,
        };
      }));

      return results;

    } catch (error) {
      console.error("Error calling Places API: ", error);
      return [];
    }
  }
);

// New function to geocode a city and country
export async function geocodeCityCountry(city: string, country: string): Promise<Omit<Place, 'visited_at' | 'notes' | 'photo_url'> | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error('Google Maps API key is not configured.');
    return null;
  }

  // Using Geocoding API for more precise city/country lookup
  const endpoint = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(city)},${encodeURIComponent(country)}&key=${apiKey}`;

  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Geocoding API request failed:', response.status, errorBody);
      return null;
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      const location = result.geometry.location;

      // Extract country and continent from address components
      const countryComponent = result.address_components?.find((c: any) => c.types.includes('country'));
      const countryName = countryComponent?.long_name || 'Unknown';
      const countryCode = countryComponent?.short_name || '';
      const continentName = await getContinent(countryCode);

      // Extract city name
      // Check for 'locality' first, then 'political' if locality is not available
      const cityComponent = result.address_components?.find((c: any) => c.types.includes('locality') || c.types.includes('political'));
      const cityName = cityComponent?.long_name || city; // Use provided city if API doesn't return a clear locality

      return {
        id: result.place_id || Date.now().toString(), // Use place_id or generate
        name: cityName,
        address: result.formatted_address,
        lat: location.lat,
        lng: location.lng,
        country: countryName,
        continent: continentName,
      };
    } else {
      console.log(`Geocoding failed for ${city}, ${country}: No results found.`);
      return null;
    }
  } catch (error) {
    console.error(`Error calling Geocoding API for ${city}, ${country}:`, error);
    return null;
  }
}
