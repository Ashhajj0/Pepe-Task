import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAymmrDkx7s34EpliQVxf27Be5PIfT2f0Y",
  authDomain: "pepetask-f071f.firebaseapp.com",
  projectId: "pepetask-f071f",
  storageBucket: "pepetask-f071f.firebasestorage.app",
  messagingSenderId: "239818865963",
  appId: "1:239818865963:web:2cf3c6e5908fadae56996e",
  measurementId: "G-77XP4PL9V0"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
