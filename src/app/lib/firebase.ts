import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCh2WTlWm8-d_JCqEEYkGt0l3Lt1ALtlzw",
  authDomain: "nerdvana-project-firebase.firebaseapp.com",
  projectId: "nerdvana-project-firebase",
  storageBucket: "nerdvana-project-firebase.firebasestorage.app",
  messagingSenderId: "850212669821",
  appId: "1:850212669821:web:24579c0e85303c835a2414",
  measurementId: "G-P7WZXLBBP5"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
