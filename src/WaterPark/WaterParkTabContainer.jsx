import React, { useEffect, useState, useRef } from "react";
import { updateDoc, doc, collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";
import "../Book/AllLeads/BookingLeadsTable.css";
import { useNavigate } from "react-router-dom";
import "../styles/FixedTable.css"
import { getAuth } from "firebase/auth";

const WaterParkTable = () => {
    const [enquiries, setEnquiries] = useState([]);
    const [search, setSearch] = useState("");
    const [sortField, setSortField] = useState("visitDate");
    const [sortAsc, setSortAsc] = useState(false);
    const navigate = useNavigate();
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [availableFY, setAvailableFY] = useState([]);
    const [visitFilter, setVisitFilter] = useState("upcoming");

    const getCurrentFinancialYear = () => {
        // Get the current time in Asia/Kolkata timezone accurately
        const now = new Date();
        const istTime = new Intl.DateTimeFormat("en-IN", {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "2-digit",
        }).formatToParts(now);

        let year = 0;
        let month = 0;

        for (const part of istTime) {
            if (part.type === "year") year = parseInt(part.value);
            if (part.type === "month") month = parseInt(part.value);
        }

        // Financial year starts in April (month 4)
        return month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    };

    const [currentUserName, setCurrentUserName] = useState("");
    const [financialYear, setFinancialYear] = useState("");
    const [filteredEnquiries, setFilteredEnquiries] = useState([]);
    const [editing, setEditing] = useState({});
    const [tempFollowUps, setTempFollowUps] = useState({});
    const [paymentFilter, setPaymentFilter] = useState("payment");
    const [visitStatusFilter, setVisitStatusFilter] = useState("all");

    useEffect(() => {
        const auth = getAuth();
        const user = auth.currentUser;

        if (user) {
            setCurrentUserName(user.name || user.email || "Unknown");
        }
    }, []);

    const formatTime12Hour = (timeStr) => {
        if (!timeStr) return "";

        const [hour, minute] = timeStr.split(":");
        let h = parseInt(hour, 10);

        const ampm = h >= 12 ? "PM" : "AM";
        h = h % 12;
        h = h ? h : 12; // 0 -> 12

        return `${h}:${minute} ${ampm}`;
    };

    const matchDateFlexible = (dateStr, search) => {
        if (!dateStr || !search) return false;

        const s = search.trim().toLowerCase().replace(/-/g, "/");

        // Convert original date → exact IST components
        const utc = new Date(dateStr);
        if (isNaN(utc)) return false;

        const parts = new Intl.DateTimeFormat("en-IN", {
            timeZone: "Asia/Kolkata",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }).formatToParts(utc);

        let dd = "", mm = "", yyyy = "";
        parts.forEach(p => {
            if (p.type === "day") dd = p.value;
            if (p.type === "month") mm = p.value;
            if (p.type === "year") yyyy = p.value;
        });

        const yy = yyyy.slice(-2);

        const monthShort = new Intl.DateTimeFormat("en-IN", {
            timeZone: "Asia/Kolkata",
            month: "short"
        }).format(utc).toLowerCase();

        const monthLong = new Intl.DateTimeFormat("en-IN", {
            timeZone: "Asia/Kolkata",
            month: "long"
        }).format(utc).toLowerCase();

        // All formats searchable in IST
        const formats = [
            `${dd}/${mm}/${yyyy}`,
            `${dd}/${mm}/${yy}`,
            `${dd}/${mm}`,
            `${dd}/${monthShort}/${yyyy}`,
            `${dd}/${monthShort}/${yy}`,
            `${monthShort} ${yyyy}`,
            `${monthLong} ${yyyy}`,
            `${mm}/${yyyy}`,
            `${yyyy}`,
            monthShort,
            monthLong,
        ];

        return formats.some(f => f.toLowerCase().includes(s));
    };

    useEffect(() => {
        // Reference to the "enquiry" collection
        const enquiryCollectionRef = collection(db, "WaterPark");

        // Set up real-time listener
        const unsubscribe = onSnapshot(enquiryCollectionRef, (querySnapshot) => {
            let allEnquiries = [];

            querySnapshot.forEach((docSnap) => {
                const monthData = docSnap.data(); // e.g. { abc123: {...}, xyz456: {...} }

                Object.entries(monthData).forEach(([fieldId, enquiry]) => {
                    allEnquiries.push({
                        id: fieldId,
                        monthYear: docSnap.id, // e.g. "Sep2025"
                        ...enquiry,
                    });
                });
            });

            // Sort by createdAt descending
            allEnquiries.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                return dateB - dateA;
            });

            setEnquiries(allEnquiries);
        }, (error) => {
            console.error("Error listening to enquiries:", error);
        });

        // Cleanup listener on unmount
        return () => unsubscribe();
    }, []);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortAsc(!sortAsc);
        } else {
            setSortField(field);
            setSortAsc(true);
        }
    };

    const sortedEnquiries = [...filteredEnquiries].sort((a, b) => {
        if (!a[sortField]) return 1;
        if (!b[sortField]) return -1;
        const dateA = new Date(a[sortField]);
        const dateB = new Date(b[sortField]);
        return sortAsc ? dateA - dateB : dateB - dateA;
    });

    const finalEnquiries = sortedEnquiries;

    const rightRef = useRef(null);

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`; // DD-MM-YYYY
    };

    useEffect(() => {
        if (enquiries.length > 0) {
            const fyList = enquiries.map(l => {
                const d = new Date(l.visitDate);
                const y = d.getFullYear();
                const m = d.getMonth();
                return m >= 3 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
            });

            const currentFY = getCurrentFinancialYear();
            const uniqueFY = [...new Set([...fyList, currentFY])].sort();
            setAvailableFY(uniqueFY);
        }
    }, [enquiries]);

    useEffect(() => {
        if (availableFY.length > 0 && financialYear === null) {
            setFinancialYear(getCurrentFinancialYear());
        }
    }, [availableFY, financialYear]);

    const handleEdit = (enquiryId, index) => {
        setEditing(prev => ({
            ...prev,
            [enquiryId]: { ...prev[enquiryId], [index]: true },
        }));
    };

    const setTempFollowUp = (enquiryId, index, value) => {
        setTempFollowUps(prev => ({
            ...prev,
            [enquiryId]: {
                ...prev[enquiryId],
                [index]: { ...prev[enquiryId]?.[index], ...value },
            },
        }));
    };

    const getTempFollowUp = (enquiryId, index) => tempFollowUps[enquiryId]?.[index] || {};

    const handleDateChange = async (enquiryId, index, newData) => {
        try {
            const enquiry = enquiries.find(e => e.id === enquiryId);
            if (!enquiry) return;

            const updatedFollowUps = Array.isArray(enquiry.followUpDetails)
                ? [...enquiry.followUpDetails]
                : [];

            if (!newData.date && !newData.remark && !newData.time) {
                updatedFollowUps[index] = {};
            } else {

                const now = new Date();

                const createdAt = new Intl.DateTimeFormat("en-IN", {
                    timeZone: "Asia/Kolkata",
                    day: "numeric",
                    month: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "numeric",
                    second: "numeric",
                    hour12: true
                }).format(now);

                updatedFollowUps[index] = {
                    ...(updatedFollowUps[index] || {}),
                    ...newData,
                    createdAt: createdAt,
                    by: currentUserName
                };
            }

            const monthRef = doc(db, "WaterPark", enquiry.monthYear);

            await updateDoc(monthRef, {
                [`${enquiryId}.followUpDetails`]: updatedFollowUps,
            });

            console.log(`✅ Follow-up ${index + 1} updated for ${enquiry.name}`);

            // Reset edit mode after save
            setEditing(prev => ({
                ...prev,
                [enquiryId]: { ...prev[enquiryId], [index]: false },
            }));
        } catch (error) {
            console.error("❌ Error updating follow-up:", error);
        }
    };

    useEffect(() => {
        let data = [...enquiries];

        // ⭐ UNIVERSAL SEARCH (ALL FIELDS + IST DATE SEARCH)
        if (search.trim() !== "") {
            const t = search.toLowerCase();

            data = data.filter(enq => {
                // Search in ANY string/number field
                const plainMatch = Object.values(enq).some(v =>
                    String(v || "").toLowerCase().includes(t)
                );

                if (plainMatch) return true;

                // Search in visitDate & enquiryDate with IST flexibility
                return (
                    matchDateFlexible(enq.visitDate, t) ||
                    matchDateFlexible(enq.enquiryDate, t)
                );
            });
        }

        // --- From Date ---
        if (fromDate) {
            const f = new Date(fromDate);
            data = data.filter(enq => new Date(enq.visitDate) >= f);
        }

        // --- To Date ---
        if (toDate) {
            const t = new Date(toDate);
            data = data.filter(enq => new Date(enq.visitDate) <= t);
        }

        // --- Financial Year ---
        if (financialYear) {
            const [y1, y2] = financialYear.split("-").map(Number);
            const fyStart = new Date(y1, 3, 1);  // 1 Apr
            const fyEnd = new Date(y2, 2, 31, 23, 59, 59); // 31 Mar

            data = data.filter(enq => {
                const d = new Date(enq.visitDate);
                return d >= fyStart && d <= fyEnd;
            });
        }

        // --- Sorting ---
        data.sort((a, b) => {
            const A = new Date(a[sortField]);
            const B = new Date(b[sortField]);
            return sortAsc ? A - B : B - A;
        });

        // 📅 Visit Date Filter (NEW)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (visitFilter === "upcoming") {
            data = data.filter(enq => {
                if (!enq.visitDate) return false;
                return new Date(enq.visitDate) >= today;
            });
        }

        if (visitFilter === "past") {
            data = data.filter(enq => {
                if (!enq.visitDate) return false;
                return new Date(enq.visitDate) < today;
            });
        }

        // 💰 Payment Filter (NEW)
        if (paymentFilter === "payment") {
            data = data.filter(enq => enq.paymentId);
        }

        if (paymentFilter === "nonpayment") {
            data = data.filter(enq => !enq.paymentId);
        }

        // 🟣 Visited Filter (ONLY when Booked selected)
        if (paymentFilter === "payment") {
            if (visitStatusFilter === "visited") {
                data = data.filter(enq => enq.visitedAt);
            }

            if (visitStatusFilter === "nonvisited") {
                data = data.filter(enq => !enq.visitedAt);
            }
        }

        // "all" → no filter

        setFilteredEnquiries(data);

    }, [search, fromDate, toDate, visitStatusFilter, financialYear, sortField, sortAsc, paymentFilter, enquiries, visitFilter]);

    const handleCancelEdit = (enquiryId, index) => {
        setEditing(prev => ({
            ...prev,
            [enquiryId]: {
                ...prev[enquiryId],
                [index]: false
            }
        }));

        // temp data bhi clear kar dete hain
        setTempFollowUps(prev => ({
            ...prev,
            [enquiryId]: {
                ...prev[enquiryId],
                [index]: {}
            }
        }));
    };

    return (
        <div className="leads-table-container" >

            <h2 className="leads-header" style={{ marginTop: '45px' }}>Water Park</h2>

            <input type="text"
                placeholder="Search by name, mobile, function type, date..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="booking-input"
                style={{
                    width: "100%",
                    marginBottom: "0px",
                    padding: "8px",
                    border: "1px solid #57a2d9",
                    borderRadius: "6px",
                }}
            />

            <div style={{ display: "flex", gap: "0px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: "10px", margin: "12px 0px", marginRight: "50px" }}>

                    {["upcoming", "past", "all"].map(type => (
                        <button
                            key={type}
                            onClick={() => setVisitFilter(type)}
                            style={{
                                padding: "6px 12px",
                                borderRadius: "6px",
                                border: "none",
                                cursor: "pointer",
                                backgroundColor: visitFilter === type ? "#007bff" : "#e0e0e0",
                                color: visitFilter === type ? "#fff" : "#000",
                                fontWeight: "600"
                            }}
                        >
                            {type === "upcoming" ? "UpComing" : type === "past" ? "Past" : "All"}
                        </button>
                    ))}

                </div>

                <div style={{ display: "flex", gap: "10px", margin: "12px 0px", marginRight: "50px" }}>
                    {["payment", "nonpayment", "all"].map(type => (
                        <button
                            key={type}
                            onClick={() => setPaymentFilter(type)}
                            style={{
                                padding: "6px 12px",
                                borderRadius: "6px",
                                border: "none",
                                cursor: "pointer",
                                backgroundColor: paymentFilter === type ? "#28a745" : "#e0e0e0",
                                color: paymentFilter === type ? "#fff" : "#000",
                                fontWeight: "600"
                            }}
                        >
                            {type === "payment" ? "Booked" : type === "nonpayment" ? "Cancelled" : "All"}
                        </button>
                    ))}
                </div>

                {paymentFilter === "payment" && (
                    <div style={{ display: "flex", gap: "10px", margin: "12px 0px" }}>
                        {["visited", "nonvisited", "all"].map(type => (
                            <button
                                key={type}
                                onClick={() => setVisitStatusFilter(type)}
                                style={{
                                    padding: "6px 12px",
                                    borderRadius: "6px",
                                    border: "none",
                                    cursor: "pointer",
                                    backgroundColor: visitStatusFilter === type ? "#6f42c1" : "#e0e0e0",
                                    color: visitStatusFilter === type ? "#fff" : "#000",
                                    fontWeight: "600"
                                }}
                            >
                                {type === "visited"
                                    ? "Visited"
                                    : type === "nonvisited"
                                        ? "Non-Visited"
                                        : "All"}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="filters-container">
                <div className="date-filters">
                    <div className="filter-item">
                        <label>Date From:</label>
                        <input className="filterInput" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                    </div>

                    <div className="filter-item">
                        <label>Date To:</label>
                        <input className="filterInput" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                    </div>

                    <div className="filter-item">
                        <label>Financial Year:</label>
                        <select className="filterInput" value={financialYear} onChange={(e) => setFinancialYear(e.target.value)}>
                            <option value="">All</option>
                            {availableFY.map(fy => <option key={fy} value={fy}>{fy}</option>)}
                        </select>
                    </div>

                    <button
                        className="clear-btnq"
                        onClick={() => {
                            setSearch('');
                            setFromDate('');
                            setToDate('');
                            setFinancialYear('');
                        }}
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="table-fixed-wrapper" ref={rightRef}>
                <table className="leads-table">
                    <thead>
                        <tr style={{ whiteSpace: "nowrap" }}>
                            <th>Sl</th>

                            <th
                                onClick={() => handleSort("createdAt")}
                                style={{ cursor: "pointer", whiteSpace: "nowrap" }}
                            >
                                Enquiry Date {sortField === "createdAt" ? (sortAsc ? "" : "") : ""}
                            </th>

                            <th>Name</th>

                            <th onClick={() => handleSort("visitDate")} style={{ cursor: "pointer", padding: '4px' }}>
                                Visit Date {sortField === "visitDate" ? (sortAsc ? "" : "") : ""}
                            </th>

                            <th>Mobile</th>
                            <th>Tickets</th>
                            <th>Total Amt</th>
                            <th>User Id</th>
                            <th>Payment Id</th>
                            <th>Visited At</th>
                            <th>Notes</th>
                            <th>Day/Night</th>
                            {[
                                'Follow Up Date 1', 'Follow Up Date 2', 'Follow Up Date 3', 'Follow Up Date 4',
                                'Follow Up Date 5'
                                // 'Drop',
                            ].map(header => (
                                <th key={header}>{header}</th>
                            ))}

                            {/* <th>Source</th> */}

                        </tr>
                    </thead>

                    <tbody>
                        {finalEnquiries.map((enq, index) => {

                            const isCancelled = !enq.paymentId;

                            const rowBg =
                                isCancelled
                                    ? "#ffbec0"
                                    : "#5ffe64";

                            return (
                                <tr
                                    key={enq.id}
                                    style={{
                                        backgroundColor: rowBg,
                                        transition: "0.3s ease"
                                    }}
                                >
                                    <td style={{ backgroundColor: rowBg }}>
                                        {finalEnquiries.length - index}.
                                    </td>

                                    <td style={{ backgroundColor: rowBg }}>{enq.createdAt}</td>

                                    <td
                                        style={{
                                            backgroundColor: rowBg
                                        }}
                                    >
                                        {`${enq.prefix || ''} ${enq.name || '-'}`.trim()}
                                    </td>

                                    <td style={{ backgroundColor: rowBg }} >
                                        <div style={{ display: "flex", flexDirection: "column" }}>

                                            <span>{formatDate(enq.visitDate)}</span>

                                            {(() => {

                                                const followUps = Array.isArray(enq.followUpDetails)
                                                    ? enq.followUpDetails.filter(f => f?.createdAt)
                                                    : [];

                                                const completed = followUps.length;

                                                // ✅ If 5 completed → ONLY show buttons
                                                if (completed >= 5) {
                                                    return (
                                                        <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                                                            <button
                                                                style={{
                                                                    backgroundColor: "#4CAF50",
                                                                    color: "white",
                                                                    border: "none",
                                                                    padding: "4px 6px",
                                                                    borderRadius: "4px",
                                                                    fontSize: "11px",
                                                                    cursor: "pointer"
                                                                }}
                                                                onClick={() => navigate("/BookingLead", { state: { enquiry: enq } })}
                                                            >
                                                                Send to Lead
                                                            </button>

                                                            <button
                                                                style={{
                                                                    backgroundColor: "#FF9800",
                                                                    color: "white",
                                                                    border: "none",
                                                                    padding: "4px 6px",
                                                                    borderRadius: "4px",
                                                                    fontSize: "11px",
                                                                    cursor: "pointer"
                                                                }}
                                                                onClick={() => navigate("/booking", { state: { enquiry: enq, sourceDoc: enq.monthYear } })}
                                                            >
                                                                Send to Booking
                                                            </button>
                                                        </div>
                                                    );
                                                }

                                                // ⭐ If 1–4 followups → show stars
                                                if (completed > 0) {
                                                    return (
                                                        <div style={{ display: "flex", gap: "2px", marginTop: "4px" }}>
                                                            {[...Array(5)].map((_, i) => (
                                                                <span
                                                                    key={i}
                                                                    style={{
                                                                        color: i < completed ? "#ffb700" : "#ccc",
                                                                        fontSize: "16px"
                                                                    }}
                                                                >
                                                                    ★
                                                                </span>
                                                            ))}
                                                        </div>
                                                    );
                                                }

                                                // 🟢 If no followup → show NEW
                                                return (
                                                    <span
                                                        style={{
                                                            backgroundColor: "#4CAF50",
                                                            color: "white",
                                                            fontSize: "10px",
                                                            padding: "2px 6px",
                                                            borderRadius: "10px",
                                                            width: "fit-content",
                                                            marginTop: "4px",
                                                            fontWeight: "600"
                                                        }}
                                                    >
                                                        NEW
                                                    </span>
                                                );

                                            })()}

                                        </div>
                                    </td>


                                    <td style={{ fontWeight: '700', backgroundColor: rowBg }}>

                                        <a href={`tel:${enq.phone}`} style={{ color: '#000000', textDecoration: 'none' }}>
                                            {enq.phone}
                                        </a>

                                    </td>

                                    <td style={{ backgroundColor: rowBg }}>
                                        {enq.tickets && typeof enq.tickets === "object"
                                            ? Object.entries(enq.tickets)
                                                .map(([key, value]) => `${key}: ${value}`)
                                                .join(", ")
                                            : enq.tickets || "-"}
                                    </td>

                                    <td style={{ backgroundColor: rowBg }}>
                                        ₹{enq.total?.toLocaleString("en-IN")}
                                    </td>

                                    <td style={{ backgroundColor: rowBg }}>
                                        {enq.id}
                                    </td>

                                    <td style={{ backgroundColor: rowBg }}>
                                        {enq.paymentId ? enq.paymentId : "Payment Cancelled"}
                                    </td>

                                    <td style={{ backgroundColor: rowBg }}>
                                        {enq.visitedAt
                                            ? new Date(enq.visitedAt).toLocaleString("en-GB", {
                                                timeZone: "Asia/Kolkata",
                                                day: "2-digit",
                                                month: "2-digit",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                hour12: true,
                                            })
                                            : " "}
                                    </td>

                                    <td style={{ backgroundColor: rowBg }}>{enq.note}</td>

                                    <td style={{ backgroundColor: rowBg }}>{enq.dayNight}</td>

                                    {[0, 1, 2, 3, 4].map(index => {
                                        const followUp = enq.followUpDetails?.[index] || {};
                                        const isActive = editing[enq.id]?.[index];

                                        const prevFollowUp = enq.followUpDetails?.[index - 1];
                                        const canAdd = index === 0 || prevFollowUp?.createdAt;

                                        return (
                                            <td
                                                key={`${enq.id}-followup-${index}`}
                                                style={{
                                                    verticalAlign: "top",
                                                    overflow: "hidden",
                                                    backgroundColor: rowBg
                                                }}
                                            >

                                                {isActive ? (

                                                    /* ================= EDIT MODE ================= */
                                                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>

                                                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                                            <label style={{ fontSize: "12px" }}>Next FollowUp Date:</label>
                                                            <input
                                                                type="date"
                                                                value={getTempFollowUp(enq.id, index).date ?? followUp.date ?? ''}
                                                                onChange={(e) =>
                                                                    setTempFollowUp(enq.id, index, { date: e.target.value })
                                                                }
                                                                style={{ flex: 1, padding: "4px", borderRadius: "4px" }}
                                                            />
                                                        </div>

                                                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                                            <label style={{ fontSize: "12px" }}>Next FollowUp Time:</label>
                                                            <input
                                                                type="time"
                                                                value={getTempFollowUp(enq.id, index).time ?? followUp.time ?? ''}
                                                                onChange={(e) =>
                                                                    setTempFollowUp(enq.id, index, { time: e.target.value })
                                                                }
                                                                style={{ flex: 1, padding: "4px", borderRadius: "4px" }}
                                                            />
                                                        </div>

                                                        <textarea
                                                            placeholder="Remark"
                                                            value={getTempFollowUp(enq.id, index).remark ?? followUp.remark ?? ''}
                                                            onChange={(e) =>
                                                                setTempFollowUp(enq.id, index, { remark: e.target.value })
                                                            }
                                                            style={{
                                                                width: "100%",
                                                                padding: "4px",
                                                                borderRadius: "4px",
                                                                minHeight: "60px"
                                                            }}
                                                        />

                                                        <div style={{ display: "flex", gap: "6px" }}>
                                                            <button
                                                                style={{
                                                                    backgroundColor: "#4CAF50",
                                                                    color: "white",
                                                                    border: "none",
                                                                    padding: "4px 8px",
                                                                    borderRadius: "4px",
                                                                    cursor: "pointer"
                                                                }}
                                                                onClick={() => {
                                                                    const update = {
                                                                        ...followUp,
                                                                        ...getTempFollowUp(enq.id, index)
                                                                    };
                                                                    handleDateChange(enq.id, index, update);
                                                                }}
                                                            >
                                                                Save
                                                            </button>

                                                            <button
                                                                style={{
                                                                    backgroundColor: "#f44336",
                                                                    color: "white",
                                                                    border: "none",
                                                                    padding: "4px 8px",
                                                                    borderRadius: "4px",
                                                                    cursor: "pointer"
                                                                }}
                                                                onClick={() => handleDateChange(enq.id, index, {})}
                                                            >
                                                                Clear
                                                            </button>

                                                            {/* CANCEL */}
                                                            <button
                                                                style={{
                                                                    backgroundColor: "#fe6663",
                                                                    color: "white",
                                                                    border: "none",
                                                                    padding: "4px 8px",
                                                                    borderRadius: "4px",
                                                                    cursor: "pointer"
                                                                }}
                                                                onClick={() => handleCancelEdit(enq.id, index)}
                                                            >
                                                                Cancel
                                                            </button>

                                                        </div>
                                                    </div>

                                                ) : (

                                                    /* ================= VIEW MODE ================= */
                                                    <div style={{ padding: "6px" }}>

                                                        {followUp.date ? (
                                                            <>
                                                                <div style={{ fontSize: "13px", fontWeight: 600 }}>
                                                                    Next followUp: {formatDate(followUp.date)} {followUp.time && ` at ${formatTime12Hour(followUp.time)}`}
                                                                </div>

                                                                {followUp.remark && (
                                                                    <div style={{
                                                                        marginTop: "4px",
                                                                        fontSize: "12px",
                                                                        wordBreak: "break-word",
                                                                        whiteSpace: "normal",
                                                                        overflowWrap: "anywhere",
                                                                        maxWidth: "200px"
                                                                    }}>
                                                                        Remark: {followUp.remark}
                                                                    </div>
                                                                )}

                                                                {followUp.createdAt && (
                                                                    <div style={{ marginTop: "4px", fontSize: "11px", color: "gray" }}>
                                                                        From: {followUp.by}, <div> {followUp.createdAt} </div>
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <div style={{ fontSize: "12px", color: "#888" }}>
                                                                No FollowUp
                                                            </div>
                                                        )}

                                                        {/* 🔥 EDIT BUTTON */}
                                                        {canAdd && (
                                                            <div style={{ marginTop: "6px" }}>
                                                                <button
                                                                    style={{
                                                                        backgroundColor: "#2196F3",
                                                                        color: "white",
                                                                        border: "none",
                                                                        padding: "3px 6px",
                                                                        borderRadius: "4px",
                                                                        fontSize: "11px",
                                                                        cursor: "pointer"
                                                                    }}
                                                                    onClick={() => handleEdit(enq.id, index)}
                                                                >
                                                                    {followUp.date ? "Edit" : "+ Add"}
                                                                </button>
                                                            </div>
                                                        )}

                                                    </div>

                                                )}

                                            </td>
                                        );
                                    })}

                                    {/* <td style={{ backgroundColor: rowBg }}>{enq.source}
                                        <div style={{ color: "gray", fontSize: "13px" }}> {enq.referredBy} </div>
                                    </td> */}

                                </tr>
                            )
                        })}
                    </tbody>
                </table>

                {/* Left Scroll Button */}
                <button
                    onClick={() => rightRef.current?.scrollBy({ left: -300, behavior: "smooth" })}
                    style={{
                        position: "fixed",
                        left: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        zIndex: 999,
                        background: "rgba(255, 255, 255, 0.33)",
                        border: "1px solid #c7c7c7",
                        borderRadius: "5px",
                        width: "25px",
                        height: "100px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                        cursor: "pointer",
                        color: "black",
                    }} className="scroll-btn"
                >
                    ◀
                </button>

                {/* Right Scroll Button */}
                <button
                    onClick={() => rightRef.current?.scrollBy({ left: 300, behavior: "smooth" })}
                    style={{
                        position: "fixed",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        zIndex: 999,
                        background: "rgba(255, 255, 255, 0.33)",
                        border: "1px solid #c7c7c7",
                        borderRadius: "5px",
                        width: "25px",
                        height: "100px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                        cursor: "pointer",
                        color: "black",
                    }} className="scroll-btn"
                >
                    ▶
                </button>

            </div>

            <div style={{ marginBottom: '50px' }}></div>
        </div>
    );
};

export default WaterParkTable;