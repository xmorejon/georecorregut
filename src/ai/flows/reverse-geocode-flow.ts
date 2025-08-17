'use server';
/**
 * @fileOverview A flow for reverse geocoding coordinates to get address components.
 * - reverseGeocode - Gets address components (like country and continent) from latitude and longitude.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { Continents } from '@/lib/data';

const GeocodeInputSchema = z.object({
  lat: z.number().describe('The latitude.'),
  lng: z.number().describe('The longitude.'),
});
export type GeocodeInput = z.infer<typeof GeocodeInputSchema>;

const GeocodeOutputSchema = z.object({
  country: z.string().describe('The country of the location.'),
  continent: z.string().describe('The continent of the location.'),
});
export type GeocodeOutput = z.infer<typeof GeocodeOutputSchema>;

export async function reverseGeocode(input: GeocodeInput): Promise<GeocodeOutput> {
  return reverseGeocodeFlow(input);
}

// Helper to get continent from country code
const getContinent = (countryCode: string): string => {
  for (const continent in Continents) {
    if (Continents[continent as keyof typeof Continents].includes(countryCode)) {
      return continent;
    }
  }
  return 'Unknown';
}


const reverseGeocodeFlow = ai.defineFlow(
  {
    name: 'reverseGeocodeFlow',
    inputSchema: GeocodeInputSchema,
    outputSchema: GeocodeOutputSchema,
  },
  async ({ lat, lng }) => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('Google Maps API key is not configured.');
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&result_type=country`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Geocoding API request failed with status ${response.status}`);
      }
      
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const countryResult = data.results[0];
        const countryComponent = countryResult.address_components.find((c: any) => c.types.includes('country'));
        
        if (countryComponent) {
          const countryName = countryComponent.long_name;
          const countryCode = countryComponent.short_name;
          const continentName = getContinent(countryCode);
          return { country: countryName, continent: continentName };
        }
      }

      return { country: 'Unknown', continent: 'Unknown' };

    } catch (error) {
      console.error('Error during reverse geocoding:', error);
      return { country: 'Unknown', continent: 'Unknown' };
    }
  }
);
