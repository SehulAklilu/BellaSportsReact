// File: app/api/vote/route.js

import admin from 'firebase-admin';
import { NextResponse } from 'next/server';
import { VOTING_END_DATE } from '../../../lib/config';

// Initialize Firebase Admin SDK only once
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.GCS_PROJECT_ID,
        privateKey: process.env.GCS_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.GCS_CLIENT_EMAIL,
      }),
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error.stack);
  }
}

const db = admin.firestore();

// --- NEW: Export a named function for the HTTP method (POST) ---
export async function POST(req) {
  if (new Date() > VOTING_END_DATE) {
    console.log("Vote rejected: Voting period has ended.");
    return NextResponse.json({ success: false, message: 'The voting period has ended.' }, { status: 403 }); // 403 Forbidden
  }
  
  try {
    // --- NEW: Get the body by awaiting req.json() ---
    const { categoryId, nomineeId } = await req.json();

    if (!categoryId || !nomineeId) {
      return NextResponse.json({ message: 'Category ID and Nominee ID are required' }, { status: 400 });
    }

    const nomineeRef = db.collection('categories').doc(categoryId).collection('nominees').doc(nomineeId);

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(nomineeRef);
      if (!doc.exists) {
        throw new Error("Nominee not found in the specified category");
      }
      const newVotes = (doc.data().votes || 0) + 1;
      transaction.update(nomineeRef, { votes: newVotes });
    });

    // --- NEW: Return a response using NextResponse.json() ---
    return NextResponse.json({ success: true, message: 'Vote counted!' });
  } catch (error) {
    console.error('Error processing vote:', error);
    // Return a 500 error response
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}