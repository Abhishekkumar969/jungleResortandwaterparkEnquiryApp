import { useState, useEffect } from "react";
import PaymentPopup from "./PaymentPopup";
import "./PaymentBar.css";

export default function PaymentBar({ appCost }) {
    const [open, setOpen] = useState(false);

    const isExpired = () => {
        if (!appCost?.enabledAt) return false;
        const enabledDate = appCost.enabledAt.toDate
            ? appCost.enabledAt.toDate()
            : new Date(appCost.enabledAt);
        const payBefore = new Date(enabledDate.getTime() + 15 * 60 * 60 * 1000);
        return new Date() > payBefore;
    };

    useEffect(() => {
        if (!appCost?.isActive || !appCost?.amount) return;

        // If expired, always force open — no localStorage check
        if (isExpired()) {
            setOpen(true);
            return;
        }

        const checkPopup = () => {
            const lastShown = localStorage.getItem("paymentPopupLastShown");
            const now = Date.now();
            const sixHours = 6 * 60 * 60 * 1000;

            if (!lastShown || now - parseInt(lastShown, 10) > sixHours) {
                setOpen(true);
                localStorage.setItem("paymentPopupLastShown", now.toString());
            }
        };

        // Check on mount
        checkPopup();

        // Check periodically (every minute) while app is open
        const interval = setInterval(checkPopup, 60000);
        return () => clearInterval(interval);
    }, [appCost?.isActive, appCost?.amount]);

    if (!appCost?.isActive || !appCost?.amount) return null;

    const formatINR = (num) => new Intl.NumberFormat("en-IN").format(num);

    return (
        <>
            <div className="payment-bar" onClick={() => setOpen(true)}>
                <span className="pay-amount">₹ {formatINR(appCost.amount)}</span>
                <span className="pay-now">Pay Now</span>
            </div>

            {open && (
                <PaymentPopup
                    data={appCost}
                    onClose={() => setOpen(false)}
                />
            )}
        </>
    );
}
