import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo-project.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:demo"
};

// Only initialize Firebase if we have a real API key
let app: any = null;
let auth: any = null;

if (firebaseConfig.apiKey !== "demo-api-key") {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
} else {
  console.warn('🔥 Firebase not configured - using demo mode. Please set up your Firebase environment variables.');
}

export { auth };
export default app;