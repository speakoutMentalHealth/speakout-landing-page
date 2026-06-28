import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyARxKEaNvQhl4ZPKj4ZRxA0boiZJGqNOQ4",
  authDomain: "speaakout-portal.firebaseapp.com",
  projectId: "speaakout-portal",
  storageBucket: "speaakout-portal.firebasestorage.app",
  messagingSenderId: "74415388350",
  appId: "1:74415388350:web:f524d4a2822c7c773490ef"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
