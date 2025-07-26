// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB4DevDcHfyEcwP4ZoEZxYHhCzFTgbigPU",
    authDomain: "bella-sports-awards.firebaseapp.com",
    projectId: "bella-sports-awards",
    storageBucket: "bella-sports-awards.firebasestorage.app",
    messagingSenderId: "36360687628",
    appId: "1:36360687628:web:c926db17a16b411598de29",
    measurementId: "G-SJ7KFHYGX4"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };