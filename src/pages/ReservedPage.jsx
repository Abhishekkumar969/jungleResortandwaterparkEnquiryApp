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
    const [loading, setLoading] = useState(true);
    const [reservedDates, setReservedDates] = useState([]);
    const [activeMonth, setActiveMonth] = useState(new Date());

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
        const fetchData = async () => {
            setLoading(true);

            const ref = doc(db, "Reserved", "Dates");
            const snap = await getDoc(ref);

            if (snap.exists()) {
                const allDates = snap.data().dates || [];
                const filtered = allDates.filter(isFutureOrToday);

                setReservedDates(filtered);

                if (filtered.length !== allDates.length) {
                    await setDoc(ref, { dates: filtered });
                }
            }

            setLoading(false);
        };

        fetchData();
    }, []);

    // 🔥 Toggle date select
    const toggleDate = (date) => {
        const formatted = formatDate(date);

        setReservedDates(prev => {
            const updated = prev.includes(formatted)
                ? prev.filter(d => d !== formatted)
                : [...prev, formatted];

            setDoc(doc(db, "Reserved", "Dates"), { dates: updated });

            return updated;
        });
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
                    <h2 className="reserved-title">📅 Reserve Dates</h2>
                </div>

                <div className="calendar-grid" style={{ display: "flex", flexWrap: "wrap", alignContent: "center" }}>

                    {/* WaterPark */}
                    <div className="calendar-card">
                        <Calendar
                            key={reservedDates.join(",")}
                            onClickDay={(date) => {
                                toggleDate(date);
                                setActiveMonth(date);
                            }}
                            onActiveStartDateChange={({ activeStartDate }) =>
                                setActiveMonth(activeStartDate)
                            }
                            activeStartDate={activeMonth}
                            tileClassName={tileClass(reservedDates)}
                            tileDisabled={disablePastDates}
                            prev2Label={null}
                            next2Label={null}
                        />
                    </div>
                </div>

                <div className="tables-wrapper">
                    <div className="date-table">
                        <h4>Reserved Dates</h4>
                        <table>
                            <tbody>
                                {getSortedDates(reservedDates).map((d, i) => (
                                    <tr key={i}>
                                        <td>{getSortedDates(reservedDates).length - i}.</td>
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