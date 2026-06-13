import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebaseConfig";

import Prebook from "./components/Prebook";
import PrivateRoute from "./auth/PrivateRoute";
import LoginPage from "./auth/LoginPage";
import LeadsTabContainer from './Lead/AllLeads/LeadsTabContainer';
import PastLeadsTabContainer from './Lead/AllLeads/PastLeadsTabContainer';

import ReservedPage from './pages/ReservedPage';

import EnquiryForm from "./Enquiry/EnquiryForm";
import WhatsappMessage from './pages/WhatsappMessage';
import UserAccessPanel from './pages/UserAccessPanel';
import PaymentBar from "./MonthlyPayment/PaymentBar";

import BlogAdmin from './pages/BlogAdmin';
import TicketPricingAdmin from './pages/TicketPricingAdmin';

export default function AppRoutes() {
    const navigate = useNavigate();
    const [authUser, setAuthUser] = useState(undefined);
    const [hidePaymentBar, setHidePaymentBar] = useState(false);
    const [appCost, setAppCost] = useState(null);

    useEffect(() => {
        const auth = getAuth();
        return onAuthStateChanged(auth, (user) => {
            setAuthUser(user || null);
        });
    }, []);

    useEffect(() => {
        const auth = getAuth();
        if (!auth.currentUser) return;

        const ref = doc(db, "usersAccess", auth.currentUser.email);
        const unsub = onSnapshot(ref, (snap) => {
            const data = snap.data();

            if (!data || data.access !== "enable") {
                signOut(auth);
                navigate("/login", { replace: true });
                return;
            }

            // 🔴 PaymentBar hide roles
            if (["C", "E", "O"].includes(data.accessToApp)) {
                setHidePaymentBar(true);
            } else {
                setHidePaymentBar(false);
            }
        });

        return () => unsub();
    }, [authUser, navigate]);

    useEffect(() => {
        if (!authUser) return;

        const ref = doc(db, "AppCost", "active");

        const unsub = onSnapshot(ref, (snap) => {
            if (snap.exists()) {
                setAppCost(snap.data());
            } else {
                setAppCost(null);
            }
        });

        return () => unsub();
    }, [authUser]);

    return (
        <>
            <Routes>
                <Route path="/" element={<PrivateRoute><Prebook /></PrivateRoute>} />
                <Route path="/leadstabcontainer" element={<PrivateRoute><LeadsTabContainer /></PrivateRoute>} />
                <Route path="/PastLeadsTabContainer" element={<PrivateRoute><PastLeadsTabContainer /></PrivateRoute>} />
                <Route path="/WhatsappMessage" element={<PrivateRoute><WhatsappMessage /></PrivateRoute>} />
                <Route path="/UserAccessPanel" element={<PrivateRoute><UserAccessPanel /></PrivateRoute>} />
                <Route path="/EnquiryForm" element={<PrivateRoute><EnquiryForm /></PrivateRoute>} />
                <Route path="/BlogAdmin" element={<PrivateRoute><BlogAdmin /></PrivateRoute>} />
                <Route path="/TicketPricingAdmin" element={<PrivateRoute><TicketPricingAdmin /></PrivateRoute>} />
                <Route path="/ReservedPage" element={<PrivateRoute><ReservedPage /></PrivateRoute>} />
                <Route path="/login" element={<LoginPage />} />
            </Routes>

            {!hidePaymentBar && <PaymentBar appCost={appCost} />}
        </>
    );
}
