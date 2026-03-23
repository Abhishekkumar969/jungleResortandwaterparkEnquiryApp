import React, { useEffect, useState } from "react";
import "./Download.css";

export default function Download() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [canInstall, setCanInstall] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // iOS detection
        const ua = window.navigator.userAgent.toLowerCase();
        const iosCheck =
            /iphone|ipad|ipod/.test(ua) &&
            /safari/.test(ua) &&
            !/crios|fxios/.test(ua);
        setIsIOS(iosCheck);

        // Detect standalone mode
        const isStandalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            window.navigator.standalone === true;

        if (isStandalone) {
            setIsInstalled(true);
        }

        // Chrome related apps check
        if (navigator.getInstalledRelatedApps) {
            navigator.getInstalledRelatedApps().then((apps) => {
                if (apps.length > 0) {
                    setIsInstalled(true);
                }
            });
        }

        // beforeinstallprompt
        const beforeInstallHandler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setCanInstall(true);
        };

        window.addEventListener("beforeinstallprompt", beforeInstallHandler);

        // appinstalled event
        window.addEventListener("appinstalled", () => {
            setIsInstalled(true);
        });

        return () => {
            window.removeEventListener("beforeinstallprompt", beforeInstallHandler);
        };
    }, []);

    const handleInstall = async () => {
        if (isInstalled) return;

        if (isIOS) {
            alert("iOS: Share → 'Add to Home Screen'");
            return;
        }

        if (!deferredPrompt) return;

        deferredPrompt.prompt();

        const result = await deferredPrompt.userChoice;
        console.log("INSTALL RESULT:", result);

        setDeferredPrompt(null);
        setCanInstall(false);
    };

    return (
        <section className="download-section">
            <div
                className="download-card"
                style={{ maxWidth: 400, margin: "auto" }}
            >

                <button
                    className="download-btn"
                    onClick={handleInstall}
                    disabled={
                        isInstalled || (!canInstall && !isIOS)
                    }
                    style={
                        isInstalled || (!canInstall && !isIOS)
                            ? { opacity: 0.5 }
                            : {}
                    }
                >

                    <div>
                        <div className="btn-text-title">
                            {isInstalled
                                ? "Already Installed"
                                : "Install App"}
                        </div>

                        <div className="btn-text-sub">
                            {isInstalled
                                ? "App is already on your device"
                                : isIOS
                                    ? "Use 'Add to Home Screen'"
                                    : canInstall
                                        ? "One-tap installation"
                                        : "Not Available"}
                        </div>
                    </div>
                </button>
            </div>
        </section>
    );
}