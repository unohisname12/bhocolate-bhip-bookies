// Mock Firebase Config for MVP phase.
// In a real app, you would import initializeApp from 'firebase/app'
// and getFirestore from 'firebase/firestore'

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Mock initialization to allow the app to compile and run without real keys yet.
// PLACEHOLDER: real Firebase initialization implemented in Step 14
// Uncomment below with real env vars when ready:
// import { initializeApp } from 'firebase/app';
// import { getFirestore } from 'firebase/firestore';
// export const app = initializeApp(firebaseConfig);
// export const db = getFirestore(app);
