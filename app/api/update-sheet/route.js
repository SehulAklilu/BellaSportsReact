// File: app/api/update-sheet/route.js

import { google } from 'googleapis';
import admin from 'firebase-admin';
import { NextResponse } from 'next/server';

// --- Firebase Admin Initialization ---
const hasRequiredEnvVars = process.env.GCS_PROJECT_ID && process.env.GCS_PRIVATE_KEY && process.env.GCS_CLIENT_EMAIL;
if (!admin.apps.length && hasRequiredEnvVars) {
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
const db = hasRequiredEnvVars ? admin.firestore() : null;

// --- A GET request is more appropriate for a cron job ---
export async function GET(req) {
  // 1. Secure this endpoint
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  if (!db) {
    console.error("Firestore DB is not initialized. Check server environment variables.");
    return NextResponse.json({ success: false, message: 'Server configuration error.' }, { status: 500 });
  }

  try {
    console.log("--- Starting Google Sheet Update ---");

    // 2. Fetch all nominees and their votes from Firestore
    const categoriesSnapshot = await db.collection('categories').get();
    const allNominees = [];
    for (const categoryDoc of categoriesSnapshot.docs) {
        const nomineesSnapshot = await categoryDoc.ref.collection('nominees').get();
        nomineesSnapshot.forEach(nomineeDoc => {
            allNominees.push(nomineeDoc.data());
        });
    }
    console.log(`Fetched ${allNominees.length} total nominees from Firestore.`);
    
    // Create a map for quick vote lookups: { "Nominee Name": votes }
    const voteMap = new Map(allNominees.map(n => [n.name, n.votes]));

    // 3. Authenticate with Google Sheets
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GCS_CLIENT_EMAIL,
        private_key: process.env.GCS_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = 'Sheet1';

    // 4. Read the 'Nominees' column from the sheet to know the order
    const rangeToRead = `${sheetName}!D2:D`; // Assuming 'Nominees' is column D
    const getResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: rangeToRead,
    });
    const nomineeNamesInSheet = getResponse.data.values.flat();
    console.log(`Read ${nomineeNamesInSheet.length} nominee names from the sheet.`);

    // 5. Prepare the new 'votes' column data in the correct order
    const updatedVotesColumn = nomineeNamesInSheet.map(name => {
        // Look up the latest vote count, default to 0 if not found
        const newVoteCount = voteMap.get(name) || 0;
        return [newVoteCount]; // Must be an array within an array for the API
    });
    
    // 6. Update the 'votes' column in the sheet
    const rangeToWrite = `${sheetName}!F2:F`; // Assuming 'votes' is column F
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: rangeToWrite,
        valueInputOption: 'RAW',
        resource: {
            values: updatedVotesColumn,
        },
    });

    console.log("✓ Successfully updated votes column in Google Sheet.");
    return NextResponse.json({ success: true, message: 'Sheet updated successfully.' });

  } catch (error) {
    console.error('Error updating sheet:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}