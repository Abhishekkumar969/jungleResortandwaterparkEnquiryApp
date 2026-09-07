


import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { doc, getDocFromServer } from "firebase/firestore";
import { db } from "./firebaseConfig";






async function bootstrap() {
  try {
    const snap = await getDocFromServer(
      doc(db, "appControl", "appStatus")
    );

    // ✅ ONLY TRUE ALLOWED
    if (!snap.exists() || snap.data()?.power !== true) {
      window.location.replace("https://google.com/");
      return;
    }

    const root = ReactDOM.createRoot(
      document.getElementById("root")
    );

    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (e) {
    console.error("BOOTSTRAP ERROR:", e);
    window.location.replace("https://google.com/");
  }
}

bootstrap();
reportWebVitals();
