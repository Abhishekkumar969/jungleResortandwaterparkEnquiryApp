import { BrowserRouter as Router } from "react-router-dom";
import { useEffect, useState } from "react";
import { requestNotificationPermission, messaging, getAuth, onAuthStateChanged, onMessage } from "./firebaseConfig";
import AppRoutes from "./AppRoutes";
import LoginPage from "./auth/LoginPage";
import AppLoading from "./AppLoading/AppLoading";
import toast from "react-hot-toast";
import { Toaster } from "react-hot-toast";

export default function App() {
  const [authUser, setAuthUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthChecked(true);

      if (user) {
        requestNotificationPermission();
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unlockAudio = () => {
      const audio = new Audio("/notification.mp3");
      audio.play().then(() => {
        audio.pause();
      }).catch(() => { });

      window.removeEventListener("click", unlockAudio);
    };

    window.addEventListener("click", unlockAudio);
  }, []);

  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("📩 Message received:", payload);

      const title =
        payload?.data?.title ||
        payload?.notification?.title ||
        "New Notification";

      const body =
        payload?.data?.body ||
        payload?.notification?.body ||
        "";

      // 🔊 SOUND
      const audio = new Audio("/notification.mp3");
      audio.play().catch(() => { });

      // 📳 VIBRATION
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }

      // 🔔 TOAST (SAFE)
      toast(`${title} - ${body}`, {
        icon: "📩",
        duration: 4000,
      });
    });

    return () => unsubscribe();
  }, []);

  if (!authChecked) return <AppLoading />;

  return (
    <Router>
      <Toaster position="top-right" />
      {authUser ? <AppRoutes /> : <LoginPage />}
    </Router>
  );
}