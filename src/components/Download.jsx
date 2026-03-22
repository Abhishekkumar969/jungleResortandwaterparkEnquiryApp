import React, { useEffect, useState } from "react";
import "./Download.css";

export default function Download() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [canInstall, setCanInstall] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // 1️⃣ If previously installed, hide the card
        const alreadyInstalled = localStorage.getItem("pwa_installed") === "yes";
        if (alreadyInstalled) {
            setIsInstalled(true);
            return;
        }

        // 2️⃣ iOS Safari detection
        const ua = window.navigator.userAgent.toLowerCase();
        const iosCheck =
            /iphone|ipad|ipod/.test(ua) &&
            /safari/.test(ua) &&
            !/crios|fxios/.test(ua);
        setIsIOS(iosCheck);

        // 3️⃣ Detect if opened in standalone mode (Android/iOS/Windows)
        const isStandalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            window.navigator.standalone === true;

        if (isStandalone) {
            setIsInstalled(true);
            localStorage.setItem("pwa_installed", "yes");
            return;
        }

        // 4️⃣ Chrome Desktop detection (checks if PWA already installed)
        if (navigator.getInstalledRelatedApps) {
            navigator.getInstalledRelatedApps().then((apps) => {
                if (apps.length > 0) {
                    setIsInstalled(true);
                    localStorage.setItem("pwa_installed", "yes");
                }
            });
        }

        // 5️⃣ Listen for "beforeinstallprompt"
        const beforeInstallHandler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setCanInstall(true);
        };

        window.addEventListener("beforeinstallprompt", beforeInstallHandler);

        // 6️⃣ When app gets installed
        window.addEventListener("appinstalled", () => {
            setIsInstalled(true);
            localStorage.setItem("pwa_installed", "yes");
        });

        return () => {
            window.removeEventListener("beforeinstallprompt", beforeInstallHandler);
        };
    }, []);

    // Install Button Handler
    const handleInstall = async () => {
        if (isIOS) {
            alert("iOS does not support auto installation. Use Share → 'Add to Home Screen'");
            return;
        }

        if (!deferredPrompt) return;

        deferredPrompt.prompt();

        const result = await deferredPrompt.userChoice;
        console.log("INSTALL RESULT:", result);

        setDeferredPrompt(null);
        setCanInstall(false);
    };

    // 7️⃣ Hide card if already installed
    if (isInstalled || (!canInstall && !isIOS)) return null;

    return (
        <section className="download-section">
            <div className="download-card" style={{ maxWidth: 400, margin: "auto" }}>
                <h3 className="download-card-title">Install App</h3>
                <p className="download-card-sub">
                    Works on Android, Desktop Chrome, iPhone (manual)
                </p>

                <button
                    className="download-btn"
                    onClick={handleInstall}
                    disabled={!canInstall && !isIOS}
                    style={!canInstall && !isIOS ? { opacity: 0.5 } : {}}
                >
                    <svg width="20" height="20" fill="currentColor">
                        <path d="M3 2l14 10L3 22V2z" />
                    </svg>

                    <div>
                        <div className="btn-text-title">Install App</div>
                        <div className="btn-text-sub">
                            {isIOS
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
