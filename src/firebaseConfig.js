// Import Firebase SDK functions 
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from 'firebase/storage';
import { getAuth } from "firebase/auth";
import { getMessaging, getToken } from "firebase/messaging";

// Firebase config
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// Init
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
const messaging = getMessaging(app);

// 🔔 REQUEST + SAVE TOKEN
export const requestNotificationPermission = async () => {
    try {
        const permission = await Notification.requestPermission();

        if (permission === "granted") {
            const token = await getToken(messaging, {
                vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY
            });

            console.log("🔥 FCM TOKEN:", token);

            if (!token) {
                console.log("❌ TOKEN NULL");
                return;
            }

            await setDoc(doc(db, "fcmTokens", token), {
                token,
                createdAt: new Date().toISOString()
            });

            console.log("✅ TOKEN SAVED");

            return token;
        } else {
            console.log("❌ Permission denied");
        }
    } catch (error) {
        console.error("❌ ERROR:", error);
    }
};

export { db, app, storage, analytics, auth, messaging };