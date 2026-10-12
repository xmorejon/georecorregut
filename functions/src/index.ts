import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Normalizes strings for case-insensitive and accent-insensitive comparisons.
 * Converts "Japón" -> "japon", "España" -> "espana", etc.
 */
function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

interface LocationRecord {
  name: string;
  country: string;
  continent: string;
  isFavorite: boolean;
  lat: number;
  lng: number;
}

/**
 * HTTP Cloud Function 'searchLocations' (read-only).
 * Serves as an external tool (function calling) for the Gemini Enterprise agent.
 */
export const searchLocations = onRequest(
  {
    region: "europe-west4",
    secrets: ["SEARCH_LOCATIONS_API_KEY"],
  },
  async (req, res) => {
    // 1. CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, X-API-Key, Authorization");

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // 2. Validate HTTP method (read-only: GET)
    if (req.method !== "GET") {
      res.status(405).json({
        error: "Method Not Allowed. Only GET requests are supported.",
      });
      return;
    }

    // 3. Security validation using API Key from Secret Manager
    const expectedApiKey = process.env.SEARCH_LOCATIONS_API_KEY;
    if (!expectedApiKey) {
      console.error(
        "CRITICAL ERROR: SEARCH_LOCATIONS_API_KEY secret is not configured in the environment."
      );
      res.status(500).json({
        error: "Internal server error: Security configuration unavailable.",
      });
      return;
    }

    const providedApiKey = req.header("X-API-Key") || req.header("x-api-key");
    if (!providedApiKey || providedApiKey !== expectedApiKey) {
      res.status(401).json({
        error: "Unauthorized: Invalid or missing API key in 'X-API-Key' header.",
      });
      return;
    }

    try {
      // 4. Parse query parameters (all optional)
      const rawContinent = req.query.continent;
      const rawCountry = req.query.country;
      const rawName = req.query.name;
      const rawIsFavorite = req.query.isFavorite;

      const targetContinent =
        typeof rawContinent === "string" && rawContinent.trim().length > 0
          ? normalizeText(rawContinent)
          : undefined;

      const targetCountry =
        typeof rawCountry === "string" && rawCountry.trim().length > 0
          ? normalizeText(rawCountry)
          : undefined;

      const targetName =
        typeof rawName === "string" && rawName.trim().length > 0
          ? normalizeText(rawName)
          : undefined;

      let targetIsFavorite: boolean | undefined = undefined;
      if (rawIsFavorite !== undefined && rawIsFavorite !== "") {
        const favStr = String(rawIsFavorite).toLowerCase().trim();
        if (favStr === "true" || favStr === "1") {
          targetIsFavorite = true;
        } else if (favStr === "false" || favStr === "0") {
          targetIsFavorite = false;
        } else {
          res.status(400).json({
            error: "The 'isFavorite' parameter must be a boolean ('true' or 'false').",
          });
          return;
        }
      }

      // 5. Fetch from Firestore
      // The app stores locations under subcollections 'users/{userId}/locations'.
      // We use collectionGroup('locations') to query across all users, with a fallback to
      // a root 'locations' collection if the subcollection query returns no documents.
      let snapshot = await db.collectionGroup("locations").get();
      let docs = snapshot.docs;

      if (docs.length === 0) {
        const rootSnapshot = await db.collection("locations").get();
        docs = rootSnapshot.docs;
      }

      // Map Firestore documents
      const allLocations: LocationRecord[] = docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          name: typeof data.name === "string" ? data.name : "",
          country: typeof data.country === "string" ? data.country : "",
          continent: typeof data.continent === "string" ? data.continent : "",
          isFavorite: Boolean(data.isFavorite),
          lat: typeof data.lat === "number" ? data.lat : Number(data.lat) || 0,
          lng: typeof data.lng === "number" ? data.lng : Number(data.lng) || 0,
        };
      });

      // 6. In-memory filtering: AND logic with accent/case-insensitive matching
      const filteredResults = allLocations.filter((item) => {
        if (targetContinent && normalizeText(item.continent) !== targetContinent) {
          return false;
        }
        if (targetCountry && normalizeText(item.country) !== targetCountry) {
          return false;
        }
        if (targetName && !normalizeText(item.name).includes(targetName)) {
          return false;
        }
        if (targetIsFavorite !== undefined && item.isFavorite !== targetIsFavorite) {
          return false;
        }
        return true;
      });

      // 7. Formatted JSON response
      res.status(200).json({
        count: filteredResults.length,
        results: filteredResults,
      });
    } catch (error) {
      console.error("Error querying locations from Firestore:", error);
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred while processing the request.";
      res.status(500).json({
        error: message,
      });
    }
  }
);
