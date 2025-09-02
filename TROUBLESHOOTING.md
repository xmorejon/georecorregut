
# Troubleshooting and FAQ

This document covers common issues and solutions encountered during the development and deployment of this Next.js and Genkit application on Firebase.

---

### 1. **Deployment Fails or Functions Deploy to the Wrong Region**

- **Symptom:** You run `firebase deploy`, but the deployment fails with errors like `npm error enoent`. Or, the deployment succeeds, but your Cloud Function (`placesFlow`) is deployed to `us-central1` instead of your desired region (e.g., `europe-west1`).

- **Cause:** This is caused by an incorrect `firebase.json` configuration. For a Next.js project using Firebase's `frameworksBackend` feature, you should **not** have a separate `functions` block. The `frameworksBackend` handles the discovery, build, and deployment of your backend code (including Genkit flows) as a single, unified server.

- **Solution:** Simplify your `firebase.json` to only include the `hosting` configuration. The region for your server-side code should be specified within the `frameworksBackend` object.

  ```json
  {
    "hosting": {
      "source": ".",
      "ignore": [
        "firebase.json",
        "**/.*",
        "**/node_modules/**"
      ],
      "frameworksBackend": {
        "region": "europe-west1" 
      }
    }
  }
  ```

---

### 2. **Build Error: "Module not found: Can't resolve '@/ai/genkit'"**

- **Symptom:** The `npm run build` command (or `firebase deploy`) fails with a "Module not found" error, indicating it cannot find a file it needs.

- **Cause:** This happens when files are moved or deleted but existing files still have `import` statements pointing to the old locations. It can also be caused by incorrect or multiple initializations of the Genkit instance.

- **Solution:** Centralize your Genkit configuration.
    1.  Create a single file, for example `src/ai/config.ts`, to initialize Genkit and export the instance.
        ```typescript
        // src/ai/config.ts
        import { genkit } from 'genkit';
        import { googleAI } from '@genkit-ai/googleai';

        export const ai = genkit({
          plugins: [googleAI()],
          model: 'googleai/gemini-2.0-flash',
        });
        ```
    2.  Update all files that define or use Genkit flows to import the instance from this central file.
        ```typescript
        // src/ai/flows/places-flow.ts
        import { ai } from '@/ai/config'; // Correct path

        export const searchPlacesByTextFlow = ai.defineFlow(...);
        ```
        ```typescript
        // src/app/api/places/route.ts
        import { ai } from '@/ai/config'; // Correct path
        ... 
        ```

---

### 3. **How to Properly Expose a Genkit Flow as an API?**

- **Symptom:** You have a Genkit flow defined, but you're not sure how to call it from your Next.js frontend, or you're getting errors related to `onCall` functions during deployment.

- **Cause:** Using `onCall` is intended for standalone Firebase Cloud Functions. When your backend logic is part of a Next.js application, the correct approach is to use Next.js API Routes.

- **Solution:** Create a standard Next.js API Route to wrap your Genkit flow.
    1.  Create a file at a path like `src/app/api/places/route.ts`.
    2.  In this file, define a `POST` (or `GET`) handler that imports your flow, calls it with the request body, and returns the result.

        ```typescript
        // src/app/api/places/route.ts
        import { NextRequest, NextResponse } from 'next/server';
        import { searchPlacesByTextFlow } from '../../../ai/flows/places-flow';

        export async function POST(req: NextRequest) {
          try {
            const body = await req.json();
            const query = body.query;
            
            // Make sure to pass the input in the shape the flow expects!
            const flowResult = await searchPlacesByTextFlow({ query });

            return NextResponse.json(flowResult);
          } catch (error) {
            return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
          }
        }
        ```
    3.  Your frontend can now call this endpoint (e.g., `/api/places`) using `fetch`.

### 4. **Fix in the Publish firbase studio button **

- **Symptom:** I cannot publish application (pre-production) with publish button

- **Cause:** wrong apphosting.yaml file + missing permissions to Secrets.

- **Solution:** Create a apphosting.yaml file.
    1.  Create a file with the corresponding secrets. Examples
        '''
          - variable: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          secret: projects/591461101049/secrets/NEXT_PUBLIC_GOOGLE_MAPS_API_KEY/versions/1
        '''
    2.  Gran access in terminal with the firebase service user:
        firebase apphosting:secrets:grantaccess GOOGLE_API_KEY --emails firebase-app-hosting-compute@georecorregut.iam.gserviceaccount.com --project georecorregut --location us-central1
    3.  Call manually command
        firebase deploy --only apphosting
        (To deploy in production do it with correspondinb button in the left Firebase pannel)