'use server';
/**
 * @fileOverview A flow for reverse geocoding coordinates to get address components.
 * - reverseGeocode - Gets address components (like country and continent) from latitude and longitude.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

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

const reverseGeocodeFlow = ai.defineFlow(
  {
    name: 'reverseGeocodeFlow',
    inputSchema: GeocodeInputSchema,
    outputSchema: GeocodeOutputSchema,
  },
  async (input) => {
    const prompt = `
      You are a helpful geography assistant. Based on the provided latitude and longitude, identify the country and continent.
      Latitude: ${input.lat}
      Longitude: ${input.lng}
      
      Provide the full name of the country and the continent.
      Respond in a structured JSON format with "country" and "continent" keys.
      For example: {"country": "Spain", "continent": "Europe"}
    `;

    const llmResponse = await ai.generate({
      prompt: prompt,
      config: {
        temperature: 0,
      }
    });
    
    try {
      const text = llmResponse.text();
      // Clean up potential markdown formatting
      const jsonText = text.replace(/```json\n|\n```/g, '').trim();
      const parsed = JSON.parse(jsonText);
      return GeocodeOutputSchema.parse(parsed);
    } catch (error) {
      console.error('Error parsing reverse geocoding response:', error);
      // Fallback in case of parsing error
      return { country: 'Unknown', continent: 'Unknown' };
    }
  }
);
