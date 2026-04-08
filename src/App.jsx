import { BrowserRouter as Router } from "react-router-dom";
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { requestNotificationPermission, messaging } from "./firebaseConfig";
import { onMessage } from "firebase/messaging"; // 👈 ADD
import AppRoutes from "./AppRoutes";
import LoginPage from "./auth/LoginPage";
import AppLoading from "./AppLoading/AppLoading";

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

  // 🔔 🔥 THIS IS THE MISSING PART
  useEffect(() => {
    onMessage(messaging, (payload) => {
      console.log("📩 Message received:", payload);

      alert(
        payload.notification.title +
        "\n" +
        payload.notification.body
      );
    });
  }, []);

  if (!authChecked) return <AppLoading />;

  return (
    <Router>
      {authUser ? <AppRoutes /> : <LoginPage />}
    </Router>
  );
}