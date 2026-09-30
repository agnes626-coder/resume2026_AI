import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId
);

// 설정 전에는 데모 설정만 초기화하며 Firebase 네트워크 요청은 courseService에서 차단합니다.
const app = initializeApp(firebaseConfigured ? firebaseConfig : {
  apiKey: "demo-key",
  authDomain: "demo-resume-workbook.firebaseapp.com",
  projectId: "demo-resume-workbook",
  appId: "demo-app",
});
export const db = getFirestore(app);
