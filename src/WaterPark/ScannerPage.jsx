import React, { useEffect, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

const ScannerPage = () => {
    const [scannedData, setScannedData] = useState(null);
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const scanner = new Html5Qrcode("reader");

        scanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: 250 },
            async (decodedText) => {
                try {
                    scanner.stop();

                    const data = JSON.parse(decodedText);
                    const ticketId = data.ticketId;

                    setScannedData(ticketId);
                    setLoading(true);

                    // 🔥 month detect
                    const today = new Date();
                    const month = today.toLocaleString("en-US", { month: "short" });
                    const year = today.getFullYear();
                    const monthDoc = `${month}${year}`;

                    const docRef = doc(db, "WaterPark", monthDoc);
                    const snap = await getDoc(docRef);

                    if (!snap.exists()) {
                        alert("❌ Ticket not found");
                        return;
                    }

                    const ticketData = snap.data()[ticketId];

                    if (!ticketData) {
                        alert("❌ Invalid Ticket");
                        return;
                    }

                    setTicket({ ...ticketData, id: ticketId, monthDoc });

                } catch (err) {
                    console.error(err);
                    alert("❌ Invalid QR");
                } finally {
                    setLoading(false);
                }
            }
        );

        return () => {
            scanner.stop().catch(() => { });
        };
    }, []);

    // ✅ VISIT BUTTON
    const handleVisit = async () => {
        if (!ticket) return;

        try {
            await updateDoc(doc(db, "WaterPark", ticket.monthDoc), {
                [`${ticket.id}.visited`]: true,
                [`${ticket.id}.visitedAt`]: new Date().toISOString()
            });

            alert("✅ Entry Marked");

            setTicket(null);
            setScannedData(null);

            window.location.reload(); // restart scanner

        } catch (err) {
            console.error(err);
            alert("❌ Error updating");
        }
    };

    return (
        <div style={{ padding: "10px" }}>

            <h2 style={{ textAlign: "center" }}>🎯 Scan Ticket</h2>

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
                        <button
                            onClick={handleVisit}
                            style={{
                                marginTop: "10px",
                                padding: "10px",
                                width: "100%",
                                background: "#4CAF50",
                                color: "#fff",
                                border: "none",
                                borderRadius: "8px",
                                fontWeight: "bold"
                            }}
                        >
                            ✅ Mark Visit
                        </button>
                    )}

                </div>
            )}
        </div>
    );
};

export default ScannerPage;