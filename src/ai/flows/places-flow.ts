'use server';
/**
 * @fileOverview A flow for interacting with the Google Places API.
 * - searchPlacesByText - Searches for places based on a text query.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Place } from '@/lib/types';

const PlacesSearchInputSchema = z.object({
  query: z.string().describe('The text string to search for places.'),
});

export type PlacesSearchInput = z.infer<typeof PlacesSearchInputSchema>;

const PlaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
});

const PlacesSearchOutputSchema = z.array(PlaceSchema);
export type PlacesSearchOutput = z.infer<typeof PlacesSearchOutputSchema>;

// This is an exported wrapper function that calls the flow
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
      textQuery: input.query,
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.id',
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

      const results: Place[] = data.places.map((place: any) => ({
        id: place.id,
        name: place.displayName.text,
        address: place.formattedAddress,
        lat: place.location.latitude,
        lng: place.location.longitude,
      }));

      return results;

    } catch (error) {
      console.error("Error calling Places API: ", error);
      return [];
    }
  }
);
