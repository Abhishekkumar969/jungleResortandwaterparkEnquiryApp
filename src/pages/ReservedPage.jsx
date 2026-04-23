import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import BackButton from "../components/BackButton";
import BottomNavigationBar from "../components/BottomNavigationBar";
import { useNavigate } from 'react-router-dom';
import "../styles/ReservedPage.css";
const formatDate = (date) => { return date.toLocaleDateString("en-CA"); };

export default function ReservedPage() {
    const navigate = useNavigate();
    const [waterDates, setWaterDates] = useState([]);
    const [cottageDates, setCottageDates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [waterMonth, setWaterMonth] = useState(new Date());
    const [cottageMonth, setCottageMonth] = useState(new Date());

    const isFutureOrToday = (dateStr) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const d = new Date(dateStr);
        return d >= today;
    };

    const disablePastDates = ({ date }) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return date < today;
    };

    // 🔥 Load existing data
    useEffect(() => {
        const fetchAndClean = async () => {
            setLoading(true); // 🔥 start

            const waterRef = doc(db, "Reserved", "WaterPark");
            const cottageRef = doc(db, "Reserved", "Cottage");

            const waterSnap = await getDoc(waterRef);
            const cottageSnap = await getDoc(cottageRef);

            // 🔥 WATERPARK CLEAN
            if (waterSnap.exists()) {
                const allDates = waterSnap.data().dates || [];

                const filtered = allDates.filter(isFutureOrToday);

                setWaterDates(filtered);

                // update DB if changed
                if (filtered.length !== allDates.length) {
                    await setDoc(waterRef, { dates: filtered });
                }
            }

            // 🔥 COTTAGE CLEAN
            if (cottageSnap.exists()) {
                const allDates = cottageSnap.data().dates || [];

                const filtered = allDates.filter(isFutureOrToday);

                setCottageDates(filtered);

                if (filtered.length !== allDates.length) {
                    await setDoc(cottageRef, { dates: filtered });
                }
            }
            setLoading(false); // 🔥 end
        };

        fetchAndClean();
    }, []);

    // 🔥 Toggle date select
    const toggleDate = async (date, type) => {
        const formatted = formatDate(date);

        if (type === "water") {
            setWaterDates(prev => {
                const updated = prev.includes(formatted)
                    ? prev.filter(d => d !== formatted)
                    : [...prev, formatted];

                // 🔥 DB update
                setDoc(doc(db, "Reserved", "WaterPark"), { dates: updated });

                return updated;
            });

        } else {
            setCottageDates(prev => {
                const updated = prev.includes(formatted)
                    ? prev.filter(d => d !== formatted)
                    : [...prev, formatted];

                setDoc(doc(db, "Reserved", "Cottage"), { dates: updated });

                return updated;
            });
        }
    };

    // 🔥 Highlight selected dates
    const tileClass = (selectedDates) => ({ date }) => {
        const formatted = formatDate(date);
        return selectedDates.includes(formatted) ? "selected-date" : "";
    };

    const getSortedDates = (dates) => {
        return [...dates].sort((a, b) => new Date(a) - new Date(b));
    };

    const formatToIST = (dateStr) => {
        const d = new Date(dateStr);

        return new Intl.DateTimeFormat("en-IN", {
            timeZone: "Asia/Kolkata",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }).format(d);
    };

    if (loading) {
        return (
            <div className="loading-wrapper">
                <div className="loader"></div>
                <p>Loading Reserved Dates...</p>
            </div>
        );
    }

    return (
        <>
            <BackButton />

            <div className="reserved-page">

                <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <h2 className="reserved-title">📅 Reserved Dates</h2>
                </div>

                <div className="calendar-grid" style={{ display: "flex", flexWrap: "wrap", alignContent: "center" }}>

                    {/* WaterPark */}
                    <div className="calendar-card">
                        <h3>💦 WaterPark</h3>

                        <Calendar
                            key={waterDates.join(",")}
                            onClickDay={(date) => {
                                toggleDate(date, "water");
                                setWaterMonth(date); // 🔥 stay on same month
                            }}
                            onActiveStartDateChange={({ activeStartDate }) =>
                                setWaterMonth(activeStartDate)
                            }
                            activeStartDate={waterMonth}
                            tileClassName={tileClass(waterDates)}
                            tileDisabled={disablePastDates}
                            prev2Label={null}
                            next2Label={null}
                        />
                    </div>

                    {/* Cottage */}
                    <div className="calendar-card">
                        <h3>🏡 Cottage</h3>

                        <Calendar
                            key={cottageDates.join(",")}
                            onClickDay={(date) => {
                                toggleDate(date, "cottage");
                                setCottageMonth(date);
                            }}
                            onActiveStartDateChange={({ activeStartDate }) =>
                                setCottageMonth(activeStartDate)
                            }
                            activeStartDate={cottageMonth}
                            tileClassName={tileClass(cottageDates)}
                            tileDisabled={disablePastDates}
                            prev2Label={null}
                            next2Label={null}
                        />
                    </div>

                </div>

                <div className="tables-wrapper">

                    <div className="date-table">
                        <h4>WaterPark Selected Dates</h4>
                        <table>
                            <tbody>
                                {getSortedDates(waterDates).map((d, i) => (
                                    <tr key={i}>
                                        <td>{getSortedDates(waterDates).length - i}.</td>
                                        <td>{formatToIST(d)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="date-table">
                        <h4>Cottage Selected Dates</h4>
                        <table>
                            <tbody>
                                {getSortedDates(cottageDates).map((d, i) => (
                                    <tr key={i}>
                                        <td>{getSortedDates(cottageDates).length - i}.</td>
                                        <td>{formatToIST(d)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            <BottomNavigationBar navigate={navigate} />

        </>
    );
}