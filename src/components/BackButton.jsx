import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuth } from 'firebase/auth';
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import './BackButton.css';

const BackButton = ({ setActiveTab }) => {
  const scrollRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const [userAppType, setUserAppType] = useState(null);
  const [panelAccess, setPanelAccess] = useState({});

  const containerStyle = { position: "fixed", top: 0, left: 0, width: "100vw", backgroundColor: "#d1f3fe", zIndex: 9999, padding: "3px 10px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", boxShadow: "inset -2px -2px 5px #7abfd6" };
  const fixedGroupStyle = { display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 };
  const scrollGroupStyle = { display: "flex", alignItems: "center", gap: "10px", overflowX: "auto", padding: "4px 0", whiteSpace: "nowrap", flex: 1 };
  const iconButtonStyle = { background: "#fff", borderRadius: "12px", color: "#000", cursor: "pointer", padding: "6px 10px", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto", fontWeight: 700, boxShadow: "inset -0 -4px 2.2px #035571", transition: "all 0.15s ease-in-out", fontSize: "0.85rem", position: "relative" };
  const activeButtonStyle = { ...iconButtonStyle, background: "linear-gradient(270deg, #4dbce1, #048bb8)", color: "#fff" };

  const isRouteActive = (routePath) => {
    const [path, search] = routePath.split("?");
    if (location.pathname.startsWith(path)) {
      if (search) {
        return location.search.includes(search);
      }
      return true;
    }
    return false;
  };

  const activateOrNavigate = (tabKey, path) => { if (setActiveTab) setActiveTab(tabKey); navigate(path); };

  useEffect(() => {
    const auth = getAuth();

    const fetchUserAndAccess = async () => {
      const user = auth.currentUser;
      if (user) {
        const userSnap = await getDoc(doc(db, 'usersAccess', user.email));
        if (userSnap.exists()) {
          setUserAppType(userSnap.data().accessToApp);
        }
      }

      // 🔥 FETCH PANEL ACCESS
      const snap = await getDocs(collection(db, "pannelAccess"));
      const data = {};
      snap.forEach(d => {
        data[d.id] = d.data(); // Bookings, Accountant, Vendor...
      });
      setPanelAccess(data);
    };

    fetchUserAndAccess();
  }, []);

  useEffect(() => { if (location.pathname === "/leadstabcontainer" && setActiveTab) setActiveTab("EnquiryDetails"); }, [location.pathname, setActiveTab]);

  const PANEL_META = {
    /* ================= BOOKINGS ================= */
    Enquiry: {
      label: "Enquiry",
      routes: {
        Enquiry: { label: "Enquiry Form", path: "/EnquiryForm" },

        "Enquiry Record": { label: "Enquiry", path: "/leadstabcontainer?tab=enquiry" },
      },
    },

    /* ================= BOOKINGS ================= */
    WaterPark: {
      label: "WaterPark",
      routes: {
        // WaterPark: { label: "Enquiry Form", path: "/EnquiryForm" },

        "WaterPark Record": { label: "WaterPark", path: "/leadstabcontainer?tab=waterpark" },
      },
    },

    /* ================= COTTAGE ================= */
    Cottage: {
      label: "Cottage",
      routes: {
        "Cottage Record": { label: "Cottage", path: "/leadstabcontainer?tab=cottage" },
      },
    },

    /* ================= UTILITIES ================= */
    Utilities: {
      label: "Utilities",
      routes: {
        ReservedPage: { label: "Reserve Dates", path: "/ReservedPage" },
        WhatsappMessage: { label: "WhatsApp Message", path: "/WhatsappMessage" },
        Blogs: { label: "Blogs", path: "/BlogAdmin" },
        TicketPricingAdmin: { label: "Ticket Prices", path: "/TicketPricingAdmin" },
      },
    },

    /* ================= SETTINGS ================= */
    Settings: {
      label: "Settings",
      routes: {
        Access: { label: "Access", path: "/UserAccessPanel" },
      },
    },
  };

  const buildButtonsFromDB = () => {
    if (!userAppType) return [];

    let flatItems = [];

    // Admin → all
    if (userAppType === "A") {
      Object.entries(PANEL_META).forEach(([key, cfg]) => {
        Object.values(cfg.routes).forEach(route => {
          flatItems.push(route);
        });
      });
      return flatItems;
    }

    Object.entries(panelAccess || {}).forEach(([section, items]) => {
      const meta = PANEL_META[section];
      if (!meta || !items) return;

      Object.entries(items)
        .filter(([itemKey, roles]) =>
          Array.isArray(roles) &&
          roles.includes(userAppType) &&
          meta.routes[itemKey]
        )
        .forEach(([itemKey]) => {
          flatItems.push(meta.routes[itemKey]);
        });
    });

    return flatItems;
  };

  return (
    <div style={{ ...containerStyle, flexWrap: "nowrap" }}>
      <div style={fixedGroupStyle}>
        {location.pathname !== "/" && (
          <button
            onClick={() => navigate("/")}
            style={{ ...iconButtonStyle, background: "#f9f9f9", border: "none" }}
            title="Back"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <button onClick={() => window.location.reload()} style={{ ...iconButtonStyle, background: "#f9f9f9", border: "none" }} title="Refresh"><RefreshCw size={18} /></button>
      </div>
      <div ref={scrollRef} style={scrollGroupStyle} className="scrollable-menu">

        {location.pathname !== "/" && (
          <button
            onClick={() => activateOrNavigate("Dashboard", "/")}
            style={iconButtonStyle}
          >
            Dashboard
          </button>
        )}

        {buildButtonsFromDB().map(({ label, path }) => (
          <button
            key={label}
            style={isRouteActive(path) ? activeButtonStyle : iconButtonStyle}
            onClick={() => navigate(path)}
          >
            {label}
          </button>
        ))}

        <div style={{ marginRight: "80px" }}></div>
      </div>
    </div>
  );
};

export default BackButton;