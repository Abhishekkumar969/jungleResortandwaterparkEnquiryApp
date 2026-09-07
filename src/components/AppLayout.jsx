import { useEffect, useState } from "react";


import PaymentBar from "../MonthlyPayment/PaymentBar";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";



export default function AppLayout({ children }) {
    const [appCost, setAppCost] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const ref = doc(db, "AppCost", "active");

        const unsub = onSnapshot(ref, (snap) => {
            if (snap.exists()) {
                setAppCost(snap.data());
            } else {
                setAppCost(null);
            }
            setLoading(false);
        });

        return () => unsub();
    }, []);

    const isExpired = () => {
        if (!appCost?.isActive || !appCost?.amount || !appCost?.enabledAt) return false;
        const enabledDate = appCost.enabledAt.toDate
            ? appCost.enabledAt.toDate()
            : new Date(appCost.enabledAt);
        const payBefore = new Date(enabledDate.getTime() + 15 * 60 * 60 * 1000);
        return new Date() > payBefore;
    };

    // While loading Firestore data, show nothing (prevents dashboard flash)
    if (loading) return null;

    // If expired, show ONLY the popup — no dashboard
    if (isExpired()) {
        return <PaymentBar appCost={appCost} />;
    }

    return (
        <>
            {children}

            <PaymentBar appCost={appCost} />
        </>
    );
}
