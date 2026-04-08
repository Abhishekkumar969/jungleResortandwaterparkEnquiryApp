import { BrowserRouter as Router } from "react-router-dom";
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { requestNotificationPermission } from "./firebaseConfig";
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
        requestNotificationPermission(); // ✅ YAHI SAHI HAI
      }
    });

    return () => unsubscribe();
  }, []);

  if (!authChecked) return <AppLoading />;

  return (
    <Router>
      {authUser ? <AppRoutes /> : <LoginPage />}
    </Router>
  );
}
