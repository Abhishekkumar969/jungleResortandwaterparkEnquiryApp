import React, { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { getAuth } from "firebase/auth";
import BackButton from "../../components/BackButton";
import PastEnquiry from "../../Enquiry/pastEnquiry/pastEnquiry";

const PastLeadsTabContainer = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const [userAppType, setUserAppType] = useState(null);
  const [panelAccess, setPanelAccess] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      console.warn("No user logged in!");
      setLoading(false);
      return;
    }

    const userRef = doc(db, "usersAccess", user.email);
    const accessRef = doc(db, "pannelAccess", "Bookings");

    const unsubUser = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setUserAppType(snap.data().accessToApp);
      }
    });

    const unsubAccess = onSnapshot(accessRef, (snap) => {
      if (snap.exists()) {
        setPanelAccess(snap.data());
      }
    });

    return () => {
      unsubUser();
      unsubAccess();
    };
  }, []);

  useEffect(() => {
    if (userAppType && Object.keys(panelAccess).length > 0) {
      if (userAppType === "A") {
        setHasPermission(true);
      } else {
        const arr = panelAccess["Past Enquiry"] || [];
        const allowed = arr.some(
          (a) => a.toString().trim() === userAppType.toString().trim()
        );
        setHasPermission(allowed);
      }
      setLoading(false);
    }
  }, [userAppType, panelAccess]);

  if (loading) return <p>Loading...</p>;

  return (
    <div className="page-scroller">
      <BackButton />
      {hasPermission ? (
        <PastEnquiry />
      ) : (
        <p style={{ textAlign: "center" }}>No Access 🚫</p>
      )}
    </div>
  );
};

export default PastLeadsTabContainer;