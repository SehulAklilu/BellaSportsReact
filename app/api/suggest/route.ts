// File: app/api/suggest/route.ts

import admin from 'firebase-admin';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// --- Fix 1: Type guard to ensure env vars exist before use ---
if (
  !process.env.GCS_PROJECT_ID ||
  !process.env.GCS_PRIVATE_KEY ||
  !process.env.GCS_CLIENT_EMAIL
) {
  // This error will be thrown when the server starts up if the env vars are missing,
  // which is great for debugging.
  throw new Error('FIREBASE_ADMIN environment variables are not defined.');
}

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.GCS_PROJECT_ID,
        // TypeScript now knows this is not undefined because of the check above
        privateKey: process.env.GCS_PRIVATE_KEY.replace(/\\n/g, '\n'), 
        clientEmail: process.env.GCS_CLIENT_EMAIL,
      }),
    });
  } catch (error: unknown) { // --- Fix 2: Type check for the caught error ---
    if (error instanceof Error) {
      console.error('Firebase admin initialization error', error.stack);
    } else {
      console.error('An unknown error occurred during Firebase init', error);
    }
  }
}
const db =admin.firestore();

// Define the validation schema using Zod
const suggestionSchema = z.object({
  nomineeName: z.string().min(3, { message: "Name must be at least 3 characters long." }).max(100),
  categoryId: z.string().min(1, { message: "Please select a category." }),
});

export async function POST(req: Request) {
  if (!db) {
    return NextResponse.json({ success: false, message: 'Server configuration error.' }, { status: 500 });
  }

  try {
    const body = await req.json();
    
    // Validate the incoming data
    const validation = suggestionSchema.safeParse(body);
    if (!validation.success) {
      // --- Fix 3: Zod's error property is `issues`, not `errors` ---
      const errorMessage = validation.error.issues[0]?.message || 'Invalid input.';
      return NextResponse.json({ success: false, message: errorMessage }, { status: 400 });
    }
    
    const { nomineeName, categoryId } = validation.data;

    // Save the suggestion to Firestore
    const suggestionData = {
      nomineeName,
      categoryId,
      submittedAt: new Date(),
      status: 'pending',
    };

    await db.collection('suggestions').add(suggestionData);

    return NextResponse.json({ success: true, message: 'Thank you! Your suggestion has been received.' });

  } catch (error: unknown) {
    console.error('Error processing suggestion:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}