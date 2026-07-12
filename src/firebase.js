import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCdbK9xjgc_8NAzMqPOGXe-OEL5EAcj28k",
  authDomain: "sonorous-stone-492010-j8.firebaseapp.com",
  projectId: "sonorous-stone-492010-j8",
  storageBucket: "sonorous-stone-492010-j8.firebasestorage.app",
  messagingSenderId: "64464531174",
  appId: "1:64464531174:web:e922b3e2875bc0decbd527",
  measurementId: "G-YTLDWZL7PW",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
