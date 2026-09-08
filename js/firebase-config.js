import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const productionFirebaseConfig = {
  apiKey: "AIzaSyARxKEaNvQhl4ZPKj4ZRxA0boiZJGqNOQ4",
  authDomain: "speaakout-portal.firebaseapp.com",
  projectId: "speaakout-portal",
  storageBucket: "speaakout-portal.firebasestorage.app",
  messagingSenderId: "74415388350",
  appId: "1:74415388350:web:f524d4a2822c7c773490ef"
};

const stagingFirebaseConfig = {
  apiKey: "AIzaSyAfe0T3E__vQBxZKQHpoiABrSXOfXkh7FA",
  authDomain: "speakout-portal-staging.firebaseapp.com",
  projectId: "speakout-portal-staging",
  storageBucket: "speakout-portal-staging.firebasestorage.app",
  messagingSenderId: "1033964891246",
  appId: "1:1033964891246:web:72cf3246bc30c6451fca7f"
};

const isStagingHost = [
  "speakout-portal-staging.web.app",
  "speakout-portal-staging.firebaseapp.com"
].includes(location.hostname);

const firebaseConfig = isStagingHost ? stagingFirebaseConfig : productionFirebaseConfig;

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
