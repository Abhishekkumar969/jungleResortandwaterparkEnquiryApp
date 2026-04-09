import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { doc, collection, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { FaEnvelopeOpenText, FaFolderOpen, FaUserShield, FaWhatsapp, FaQrcode } from "react-icons/fa";
import { IoIosLogOut } from "react-icons/io";
import { IoCloudOfflineOutline } from "react-icons/io5";
import { requestNotificationPermission } from "../firebaseConfig";
import BackButton from "../components/BackButton";
import BottomNavigationBar from './BottomNavigationBar';
import './Prebook.css';

const Prebook = () => {
  const navigate = useNavigate();
  const [userAppType, setUserAppType] = useState(null);
  const [userName] = useState('');
  const [panelAccess, setPanelAccess] = useState({});
  const [appPower, setAppPower] = useState(true);
  const [showPowerPopup, setShowPowerPopup] = useState(false);
  const showAll = userAppType === "A";
  const [totalWaterpark, setTotalWaterpark] = useState(0);
  const [totalEnquiries, setTotalEnquiries] = useState(0);
  const [notificationEnabled, setNotificationEnabled] = useState(false);

  useEffect(() => {
    const unsubscribes = [];

    // 🔹 ENQUIRIES
    const enquiryRef = collection(db, "enquiry");
    unsubscribes.push(
      onSnapshot(enquiryRef, (snapshot) => {
        let count = 0;
        snapshot.forEach((docSnap) => {
          count += Object.keys(docSnap.data()).length;
        });
        setTotalEnquiries(count);
      })
    );

    // 🔹 LEADS
    const bookingWaterparkRef = collection(db, "WaterPark");
    unsubscribes.push(
      onSnapshot(bookingWaterparkRef, (snapshot) => {
        let count = 0;
        snapshot.forEach((docSnap) => {
          count += Object.keys(docSnap.data()).length;
        });
        setTotalWaterpark(count);
      })
    );

    // 🔥 CLEANUP
    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, []);

  useEffect(() => {
    const ref = doc(db, "appControl", "appStatus");

    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setAppPower(snap.data().power);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("notificationsEnabled");
    if (saved === "true") {
      setNotificationEnabled(true);
    }
  }, []);

  const handleNotificationClick = async () => {
    try {
      // 🔥 agar OFF hai → ON karo
      if (!notificationEnabled) {
        await requestNotificationPermission();

        if (Notification.permission === "granted") {
          setNotificationEnabled(true);
          localStorage.setItem("notificationsEnabled", "true");
        }
      }
      // 🔥 agar ON hai → OFF karo
      else {
        setNotificationEnabled(false);
        localStorage.setItem("notificationsEnabled", "false");
      }

    } catch (err) {
      console.error("Notification error:", err);
    }
  };

  const togglePower = async () => {
    const ref = doc(db, "appControl", "appStatus");

    try {
      // 🔥 clear intent: FORCE OFF
      await updateDoc(ref, { power: false });

      // ⏳ DB write ke baad redirect
      setTimeout(() => {
        window.location.replace("https://google.com/");
      }, 300);

    } catch (err) {
      console.error("Power toggle failed:", err);
    }
  };

  useEffect(() => {
    const accessCollectionRef = collection(db, 'pannelAccess');
    const unsubscribe = onSnapshot(
      accessCollectionRef,
      (accessSnap) => {
        let allAccess = {};
        accessSnap.forEach((docItem) => {
          allAccess[docItem.id] = docItem.data();
        });
        setPanelAccess(allAccess);
      },
      (err) => console.error("Error listening to panel access:", err)
    );

    return () => unsubscribe();
  }, []);

  const hasAccess = (section, item) => {
    if (userAppType === 'A') return true;
    if (!userAppType || !panelAccess[section]) return false;
    const allowed = panelAccess[section][item] || [];
    return allowed.includes(userAppType);
  };

  const auth = getAuth();
  const confirmLogout = () => {
    signOut(auth)
      .then(() => {
        console.log("User signed out");
        window.location.href = "/";
      })
      .catch((error) => {
        console.error("Error signing out:", error);
      });
  };

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      const userRef = doc(db, 'usersAccess', user.email);
      const unsubscribe = onSnapshot(
        userRef,
        (userSnap) => {
          if (userSnap.exists()) {
            const data = userSnap.data();
            setUserAppType(data.accessToApp);
          }
        },
        (err) => {
          console.error("Error listening to user app type:", err);
        }
      );
      return () => unsubscribe();
    }
  }, []);

  const useAnimatedCounter = (target, duration = 1500) => {
    const [value, setValue] = useState(0);

    useEffect(() => {
      let rafId;
      const startTime = performance.now();

      const animate = (currentTime) => {
        const progress = Math.min((currentTime - startTime) / duration, 1);
        setValue(Math.floor(progress * target));

        if (progress < 1) {
          rafId = requestAnimationFrame(animate);
        }
      };

      rafId = requestAnimationFrame(animate);

      return () => cancelAnimationFrame(rafId);
    }, [target, duration]);

    return value;
  };

  const animatedEnquiries = useAnimatedCounter(totalEnquiries);
  const animatedWaterpark = useAnimatedCounter(totalWaterpark);

  const metricRoutes = {
    Enquiries: "/leadstabcontainer?tab=enquiry",
    Waterpark: "/leadstabcontainer?tab=waterpark",
  };

  const MetricCard = ({ value, label, onClick, disabled }) => {

    if (disabled) return null; // 🔥 ye line add kar

    return (
      <div
        className="metric-slide"
        onClick={onClick}
        style={{ cursor: "pointer" }}
      >
        <div className="subscription-card">
          <img
            src="/assets/BannerCalendar-removebg-preview.png"
            className="calendar-bg"
            alt=""
          />
          <div className="calendar-overlay">
            <h2>{value}</h2>
          </div>
        </div>

        <p className="metric-label">{label}</p>
      </div>
    );
  };

  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 3);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div style={{ marginBottom: '40px' }}> <BackButton />  </div>

      <div className="prebook-wrapper">

        {/* APP STYLE BANNER */}
        <div className="app-banner">
          {/* LEFT */}
          <div className="banner-left">
            <p className="banner-hello">Hi ! {userName}
              <span className="enable-notifications-styles">
                <button onClick={handleNotificationClick}>
                  {notificationEnabled ? "🔔" : "🔕"}
                </button>
              </span>
            </p>

            <h1>
              Banquet<br />Management App
            </h1>

            <p className="banner-sub">
              Exclusively Designed...
            </p>

          </div>

          {/* RIGHT */}
          <div className="banner-metrics">
            <div
              className="metrics-track"
              style={{ transform: `translateX(-${activeSlide * 100}%)` }}
            >

              {/* Enquiries */}
              <MetricCard
                value={animatedEnquiries}
                label="Enquiries"
                disabled={!hasAccess("Bookings", "Enquiry")}
                onClick={() => navigate(metricRoutes.Enquiries)}
              />

              {/* Waterpark */}
              <MetricCard
                value={animatedWaterpark}
                label="Water Park"
                disabled={!hasAccess("Bookings", "Waterpark")}
                onClick={() => navigate(metricRoutes.Waterpark)}
              />

            </div>
          </div>
        </div>

        <div>
          {/* BOOKINGS */}
          {showAll || Object.keys(panelAccess.Bookings || {}).some(item => hasAccess("Bookings", item)) ? (
            <div className="service-section">
              <h3 className="service-section-text">Bookings</h3>
              <div className="service-grid">
                {hasAccess("Bookings", "Enquiry") && <ServiceBox label="Enquiry Form" onClick={() => navigate('/EnquiryForm')} icon={<FaEnvelopeOpenText />} />}
                {(hasAccess("Bookings", "Lead Record") || hasAccess("Bookings", "Enquiry Record") || hasAccess("Bookings", "Book Record")) && (<ServiceBox label="Reports" onClick={() => navigate('/leadstabcontainer')} icon={<FaFolderOpen />} />)}
                {hasAccess("Bookings", "scanner") && <ServiceBox label="Scanner" onClick={() => navigate('/scanner')} icon={<FaQrcode />} />}
              </div>
            </div>
          ) : null}

          {/* UTILITIES */}
          {showAll || Object.keys(panelAccess.Utilities || {}).some(item => hasAccess("Utilities", item)) ? (
            <div className="service-section">
              <h3 className="service-section-text">Utilities</h3>
              <div className="service-grid">
                {hasAccess("Utilities", "WhatsappMessage") && <ServiceBox label="Message" onClick={() => navigate('/WhatsappMessage')} icon={<FaWhatsapp />} />}
              </div>
            </div>
          ) : null}

          {/* SETTINGS */}
          {showAll || Object.keys(panelAccess.Settings || {}).some(item => hasAccess("Settings", item)) ? (
            <div className="service-section">
              <h3 className="service-section-text">Settings</h3>
              <div className="service-grid">
                {hasAccess("Settings", "Access") && <ServiceBox label="Access" onClick={() => navigate('/UserAccessPanel')} icon={<FaUserShield />} />}
              </div>
            </div>
          ) : null}

          {/* App Logout / ON-OFF */}
          <div
            className="service-grid"
            style={{
              marginTop: "15px",
              display: "flex",
              justifyContent: "space-around",
              marginBottom: "40px"
            }}
          >

            {/* APP POWER */}
            <div className="app-rectbox" onClick={() => setShowPowerPopup(true)}>

              <div className="service-label" style={{ color: "#fff", fontSize: "13px" }}>
                {appPower ? "App OFF" : "App is OFF"}
              </div>

              <div className="service-icon" style={{ color: "#125d9a", display: "flex", justifyContent: "center", alignItems: "center", margin: "4px 0px" }}>
                <IoCloudOfflineOutline size={22} />
              </div>

            </div>

            {/* LOGOUT */}
            <div className="app-rectbox" onClick={confirmLogout}>

              <div className="service-label" style={{ color: "#fff", fontSize: "13px" }}>
                Logout
              </div>

              <div className="service-icon" style={{ color: "#125d9a", display: "flex", justifyContent: "center", alignItems: "center", margin: "4px 0px" }}>
                <IoIosLogOut size={22} />
              </div>

            </div>

          </div>

        </div>

      </div>

      <BottomNavigationBar navigate={navigate} userAppType={userAppType} />

      {/* POWER OFF POPUP */}
      {showPowerPopup && (
        <div
          className="popup-overlay"
          onClick={() => setShowPowerPopup(false)}
        >
          <div
            className="popup-box"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Do you really want to Power OFF this App?</h3>

            <div className="popup-btn-row">
              <button
                className="popup-no"
                onClick={() => setShowPowerPopup(false)}
              >
                No
              </button>

              <button
                className="popup-yes"
                onClick={() => {
                  togglePower();
                  setShowPowerPopup(false);
                }}
              >
                Yes
              </button>

            </div>
          </div>
        </div>
      )}

    </>
  );
};

const ServiceBox = ({ label, onClick, icon, badge }) => (
  <div
    className="service-box"
    onClick={onClick}
  >
    {/* ICON WRAPPER */}
    <div
      className="service-icon"
      style={{ position: "relative" }}   // ⭐ IMPORTANT
    >
      {icon}

      {/* 🔴 BADGE ON ICON */}
      {badge > 0 && (
        <span
          style={{
            position: "absolute",
            top: "-6px",
            right: "-6px",
            background: "#fe0000",
            color: "#fff",
            fontSize: "11px",
            fontWeight: "700",
            borderRadius: "50%",
            minWidth: "20px",
            height: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          {badge}
        </span>
      )}
    </div>

    <div className="service-label">{label}</div>
  </div>
);

export default Prebook;