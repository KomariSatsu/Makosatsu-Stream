import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; // Tambahkan ini
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA6kbf2Io9V0phuYoOYcgnpwmV3q_wd6C4",
  authDomain: "makosatsu-stream.firebaseapp.com",
  projectId: "makosatsu-stream",
  storageBucket: "makosatsu-stream.firebasestorage.app",
  messagingSenderId: "476212384528",
  appId: "1:476212384528:web:aa97fa0d208193f5438b95",
  measurementId: "G-M7FJG6ZB0M"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider(); // Daftarkan Provider Google