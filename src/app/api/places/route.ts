
import { NextRequest, NextResponse } from 'next/server';
import { searchPlacesByTextFlow } from '../../../ai/flows/places-flow';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = body.query;

    if (typeof query !== 'string') {
      return NextResponse.json({ error: 'Query must be a string' }, { status: 400 });
    }

    // Run the Genkit flow
    // The ai object and the flow are already initialized
    const flowResult = await searchPlacesByTextFlow({ query });

    return NextResponse.json(flowResult);
  } catch (error) {
    console.error('Error executing flow:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
