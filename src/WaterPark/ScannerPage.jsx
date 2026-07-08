import React, { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import BackButton from "../components/BackButton";
import BottomNavigationBar from "../components/BottomNavigationBar";
import { useNavigate } from 'react-router-dom';

const ScannerPage = () => {
    const navigate = useNavigate();

    const [scannedData, setScannedData] = useState(null);
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(false);

    const [cameras, setCameras] = useState([]);
    const [currentCameraId, setCurrentCameraId] = useState(null);
    const [flashOn, setFlashOn] = useState(false);

    const scannerRef = useRef(null);

    // 🔹 Load Cameras
    useEffect(() => {
        Html5Qrcode.getCameras().then(devices => {
            if (devices?.length) {
                setCameras(devices);

                const backCamera =
                    devices.find(d => d.label.toLowerCase().includes("back")) ||
                    devices[devices.length - 1];

                setCurrentCameraId(backCamera.id);
            }
        });
    }, []);

    // 🔹 Start Scanner (Proper lifecycle)
    useEffect(() => {
        if (!currentCameraId) return;

        let isMounted = true;
        const scanner = new Html5Qrcode("reader");
        scannerRef.current = scanner;

        const startScanner = async () => {
            try {
                await scanner.start(
                    currentCameraId,
                    { fps: 10, qrbox: { width: 250, height: 250 } },

                    async (decodedText) => {
                        if (!isMounted) return;

                        try {
                            await scanner.stop();

                            let ticketId;
                            try {
                                const data = JSON.parse(decodedText);
                                ticketId = data.ticketId || decodedText;
                            } catch (e) {
                                // Fallback to raw string if not JSON (old tickets)
                                ticketId = decodedText;
                            }

                            if (!ticketId) {
                                alert("❌ Invalid QR format");
                                restartScanner();
                                return;
                            }

                            setScannedData(ticketId);
                            setLoading(true);

                            const today = new Date();
                            const month = today.toLocaleString("en-US", { month: "short" });
                            const year = today.getFullYear();
                            const monthDoc = `${month}${year}`;

                            const docRef = doc(db, "WaterPark", monthDoc);
                            const snap = await getDoc(docRef);

                            if (!snap.exists()) {
                                alert("❌ Ticket not found");
                                restartScanner();
                                return;
                            }

                            const ticketData = snap.data()[ticketId];

                            if (!ticketData) {
                                alert("❌ Invalid Ticket");
                                restartScanner();
                                return;
                            }

                            setTicket({ ...ticketData, id: ticketId, monthDoc });

                        } catch (err) {
                            console.error(err);
                            alert("❌ Invalid QR");
                            restartScanner();
                        } finally {
                            setLoading(false);
                        }
                    },
                    () => { }
                );
            } catch (err) {
                console.error("Scanner start error:", err);
            }
        };

        startScanner();

        return () => {
            isMounted = false;
            scanner.stop().catch(() => { });
        };

    }, [currentCameraId]);

    // 🔄 Restart Scanner (NO reload)
    const restartScanner = () => {
        setTicket(null);
        setScannedData(null);

        if (scannerRef.current) {
            scannerRef.current.clear().catch(() => { });
        }
    };

    // 🔄 Rotate Camera
    const handleRotateCamera = () => {
        if (cameras.length < 2) return;

        const currentIndex = cameras.findIndex(c => c.id === currentCameraId);
        const nextIndex = (currentIndex + 1) % cameras.length;

        setCurrentCameraId(cameras[nextIndex].id);
    };

    // 🔦 Flash Toggle
    const handleFlash = async () => {
        if (!scannerRef.current) return;

        try {
            if (flashOn) {
                await scannerRef.current.turnOffFlash();
            } else {
                await scannerRef.current.turnOnFlash();
            }
            setFlashOn(!flashOn);
        } catch (err) {
            alert("⚠️ Flash not supported on this device");
        }
    };

    // ✅ Mark Visit
    const handleVisit = async () => {
        if (!ticket) return;

        try {
            await updateDoc(doc(db, "WaterPark", ticket.monthDoc), {
                [`${ticket.id}.visited`]: true,
                [`${ticket.id}.visitedAt`]: new Date().toISOString()
            });

            alert("✅ Entry Marked");

            restartScanner();

        } catch (err) {
            console.error(err);
            alert("❌ Error updating");
        }
    };

    return (
        <div style={{ padding: "10px", position: "relative" }}>
            <BackButton />

            <div style={{ margin: "70px 0px" }}>
                <h2 style={{ textAlign: "center" }}>🎯 Scan Ticket</h2>

                {/* Controls */}
                {!ticket && (
                    <div style={{
                        position: "absolute",
                        top: "80px",
                        right: "20px",
                        display: "flex",
                        gap: "10px",
                        zIndex: 999
                    }}>
                        <button onClick={handleRotateCamera} style={btnStyle}>🔄</button>
                        <button onClick={handleFlash} style={btnStyle}>
                            {flashOn ? "🔦 ON" : "🔦 OFF"}
                        </button>
                    </div>
                )}

                {!ticket && <div id="reader" style={{ width: "100%" }} />}

                {loading && <p>Loading...</p>}

                {ticket && (
                    <div style={{
                        marginTop: "20px",
                        padding: "15px",
                        borderRadius: "10px",
                        background: ticket.visited ? "#ffcdd2" : "#c8e6c9"
                    }}>
                        <p>Ticket ID: {scannedData}</p>
                        <h3>{ticket.name}</h3>
                        <p>📅 Visit: {ticket.visitDate}</p>
                        <p>📞 {ticket.phone}</p>

                        {ticket.visited && (
                            <p style={{ color: "red", fontWeight: "bold" }}>
                                ❌ Already Visited
                            </p>
                        )}

                        {!ticket.visited && (
                            <button onClick={handleVisit} style={visitBtn}>
                                ✅ Mark Visit
                            </button>
                        )}
                    </div>
                )}
            </div>

            <BottomNavigationBar navigate={navigate} />
        </div>
    );
};

// 🎨 Styles
const btnStyle = {
    padding: "8px 10px",
    borderRadius: "8px",
    border: "none",
    background: "#000",
    color: "#fff",
    cursor: "pointer"
};

const visitBtn = {
    marginTop: "10px",
    padding: "10px",
    width: "100%",
    background: "#4CAF50",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold"
};

export default ScannerPage;