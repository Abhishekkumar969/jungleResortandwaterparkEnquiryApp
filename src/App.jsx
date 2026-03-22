import { BrowserRouter as Router } from "react-router-dom";
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import AppRoutes from "./AppRoutes";
import LoginPage from "./auth/LoginPage";
import AppLoading from "./AppLoading/AppLoading";

export default function App() {
  const [authUser, setAuthUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthChecked(true);
    });
  }, []);

  if (!authChecked) return <AppLoading />;

  return (
    <Router>
      {authUser ? <AppRoutes /> : <LoginPage />}
    </Router>
  );
}
