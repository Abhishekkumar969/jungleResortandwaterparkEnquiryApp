import React, { useEffect, useState } from "react";
import "./Download.css";

export default function Download() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        const isStandalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            window.navigator.standalone === true;

        if (isStandalone) setIsInstalled(true);

        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);

            // 🔥 AUTO trigger (best UX)
            setTimeout(() => {
                e.prompt();
            }, 1000);
        };

        window.addEventListener("beforeinstallprompt", handler);

        window.addEventListener("appinstalled", () => {
            setIsInstalled(true);
        });

        return () => {
            window.removeEventListener("beforeinstallprompt", handler);
        };
    }, []);

    const handleInstall = async () => {
        if (isInstalled) return;

        if (deferredPrompt) {
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            setDeferredPrompt(null);
            return;
        }

        // fallback (no alert, just silent fail ya custom UI)
        console.log("Install not supported on this device");
    };

    return (
        <section className="download-section">
            <div className="download-card">
                <button className="download-btn" onClick={handleInstall}>
                    <div>
                        <div className="btn-text-title">
                            {isInstalled ? "Open App" : "Install App"}
                        </div>

                        <div className="btn-text-sub">
                            {isInstalled
                                ? "Already installed"
                                : "Tap to install instantly"}
                        </div>
                    </div>
                </button>
            </div>
        </section>
    );
}