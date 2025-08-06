// File: app/api/vote/route.js

import admin from 'firebase-admin';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
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
    const forwarded = headers().get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(/, /)[0] : headers().get('x-real-ip');

    if (!ip) {
      // If we can't get an IP for some reason, we can't proceed securely.
      return NextResponse.json({ success: false, message: 'Could not identify your connection.' }, { status: 400 });
    }
    // --- NEW: Get the body by awaiting req.json() ---
    const { categoryId, nomineeId } = await req.json();

    if (!categoryId || !nomineeId) {
      return NextResponse.json({ message: 'Category ID and Nominee ID are required' }, { status: 400 });
    }

    // Firestore doesn't allow slashes in document IDs, so we replace them.
    const ipVoteDocId = `${ip.replace(/\./g, '-')}_${categoryId}`;
    const ipVoteRef = db.collection('ip_votes').doc(ipVoteDocId);

    // 4. Run a single, atomic transaction to check and vote
    await db.runTransaction(async (transaction) => {
      // Check if this IP has already voted in this category
      const ipVoteDoc = await transaction.get(ipVoteRef);
      if (ipVoteDoc.exists) {
        // If the document exists, this IP has already voted. Block the vote.
        throw new Error('This IP address has already voted in this category.');
      }


    const nomineeRef = db.collection('categories').doc(categoryId).collection('nominees').doc(nomineeId);
    const nomineeDoc = await transaction.get(nomineeRef);

    if (!nomineeDoc.exists) {
        throw new Error("Nominee not found.");
      }

      const newVotes = (nomineeDoc.data().votes || 0) + 1;
      transaction.update(nomineeRef, { votes: newVotes });

    transaction.set(ipVoteRef, {
        ip: ip,
        categoryId: categoryId,
        votedAt: new Date(),
      });
    });

    // --- NEW: Return a response using NextResponse.json() ---
    return NextResponse.json({ success: true, message: 'Vote counted!' });
  } catch (error) {
   // Check for our specific error message
    if (error.message === 'This IP address has already voted in this category.') {
      // Send a specific, user-friendly error message
      return NextResponse.json({ success: false, message: error.message }, { status: 429 }); // 429 Too Many Requests
    }
     // Handle other potential errors
    console.error('Error processing vote:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}