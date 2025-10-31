// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBJ3B2Sugystk476OHW355O-yprfiLzIi4",
  authDomain: "spyropark.firebaseapp.com",
  projectId: "spyropark",
  storageBucket: "spyropark.firebasestorage.app",
  messagingSenderId: "504091491507",
  appId: "1:504091491507:web:e7e50b7f23e3a2274f04c6",
  measurementId: "G-B8D9M1LMRE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);