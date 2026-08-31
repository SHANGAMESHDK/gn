import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyACJ1v909cOUQEn2NIojeoBOzWKygfHDoU",
  authDomain: "campus-navigator-ai-pro.firebaseapp.com",
  projectId: "campus-navigator-ai-pro",
  storageBucket: "campus-navigator-ai-pro.firebasestorage.app",
  messagingSenderId: "368401127014",
  appId: "1:368401127014:web:66c295c7ed7343eb333fa7"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
