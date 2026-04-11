import React, { useState, useEffect, useRef, useCallback } from "react";
import "../styles/Booking.css";
import { db } from "../firebaseConfig";
import { doc, setDoc, collection, deleteField, getDoc, getDocs } from "firebase/firestore";
import FunctionTypeSelector from "./FunctionTypeSelector";
import { useLocation } from "react-router-dom";
import { useNavigate } from 'react-router-dom';
import { getAuth } from "firebase/auth";
import BackButton from "../components/BackButton";
import BottomNavigationBar from "../components/BottomNavigationBar";

const EnquiryPage = () => {
    const navigate = useNavigate();
    const [userAppType, setUserAppType] = useState(null);
    const [whatsappTemplate, setWhatsappTemplate] = useState("");
    const [winError, setWinError] = useState(false);
    const [bookingType, setBookingType] = useState("single");
    const [range, setRange] = useState({ start: null, end: null });
    const [selecting, setSelecting] = useState("start");
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const calendarRef = useRef(null);
    const [hoverDate, setHoverDate] = useState(null);

    useEffect(() => {
        if (range.start && range.end) {
            setFormData(prev => ({
                ...prev,
                functionDate: null,
                fromDate: range.start.toISOString().split("T")[0],
                toDate: range.end.toISOString().split("T")[0]
            }));
        }
    }, [range]);

    useEffect(() => {
        const fetchUserAppType = async () => {
            const auth = getAuth();
            const user = auth.currentUser;
            if (user) {
                try {
                    const userRef = doc(db, 'usersAccess', user.email);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        const data = userSnap.data();
                        setUserAppType(data.accessToApp);
                    }
                } catch (err) {
                    console.error("Error fetching user app type:", err);
                }
            }
        };
        fetchUserAppType();
    }, []);

    useEffect(() => {
        const fetchWhatsappTemplate = async () => {
            try {
                const ref = doc(db, "whatsappMessages", "Enquiry");
                const snap = await getDoc(ref);

                if (snap.exists()) {
                    setWhatsappTemplate(snap.data().text);
                }
            } catch (err) {
                console.error("Failed to fetch WhatsApp template", err);
            }
        };

        fetchWhatsappTemplate();
    }, []);

    const buildWhatsappMessage = () => {
        if (!whatsappTemplate) return "";

        let msg = whatsappTemplate
            .replace(
                "{functionDate}",
                formData.functionDate ? formatDate(formData.functionDate) : "-"
            )
            .replace("{name}", formData.name || "");

        // 🧨 ONLY remove exact "Guest Name" (case-insensitive)
        msg = msg
            .replace(/\bguest\s+name\b/gi, "")
            .replace(/\s{2,}/g, " ")   // extra spaces clean
            .replace(/,\s*,/g, ",")    // double commas
            .replace(/^,\s*/g, "")     // starting comma
            .trim();

        return msg;
    };

    const formatDateIST = (date) => {
        if (!date) return "-";

        const d = new Date(date);

        // Convert to IST (UTC + 5:30)
        const istOffset = 5 * 60 + 30; // minutes
        const istDate = new Date(d.getTime() + istOffset * 60 * 1000);

        const day = String(istDate.getUTCDate()).padStart(2, "0");
        const month = String(istDate.getUTCMonth() + 1).padStart(2, "0");
        const year = istDate.getUTCFullYear();
        const hours = String(istDate.getUTCHours()).padStart(2, "0");
        const minutes = String(istDate.getUTCMinutes()).padStart(2, "0");

        return `${day}-${month}-${year}, ${hours}:${minutes}`; // DD-MM-YYYY HH:MM IST
    };

    const formatDate = (date) => {
        if (!date) return "-";

        const d = new Date(date);

        // Convert to IST (UTC + 5:30)
        const istOffset = 5 * 60 + 30; // minutes
        const istDate = new Date(d.getTime() + istOffset * 60 * 1000);

        const day = String(istDate.getUTCDate()).padStart(2, "0");
        const month = String(istDate.getUTCMonth() + 1).padStart(2, "0");
        const year = istDate.getUTCFullYear();

        return `${day}-${month}-${year}`; // DD-MM-YYYY
    };

    const getTodayIST = () => {
        const now = new Date();
        const istOffset = 5 * 60 + 30; // minutes
        const istDate = new Date(now.getTime() + istOffset * 60 * 1000);

        const day = String(istDate.getUTCDate()).padStart(2, "0");
        const month = String(istDate.getUTCMonth() + 1).padStart(2, "0");
        const year = istDate.getUTCFullYear();

        return `${year}-${month}-${day}`; // YYYY-MM-DD
    };

    const location = useLocation();
    const enquiry = location.state?.enquiry || null;

    const [formData, setFormData] = useState({
        prefix: "Mr.",
        name: "",
        mobile1: "",
        mobile2: "",
        email: "",
        pax: "",
        functionTypes: [],
        functionDate: "",
        dayNight: "Night",
        enquiryDate: getTodayIST(),
        note: "",
        winProbability: "",
        shareMedia: { shareMedia: false, at: null }, // ✅ FIXED
    });

    useEffect(() => {
        if (enquiry) {
            const enquiryDateObj = new Date(enquiry.enquiryDate);
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

            const originalMonthYear =
                `${monthNames[enquiryDateObj.getMonth()]}${enquiryDateObj.getFullYear()}`;

            setFormData(prev => ({
                ...prev,
                ...enquiry,

                functionTypes:
                    enquiry.functionTypes ||
                    (enquiry.functionType ? [enquiry.functionType] : []),

                fieldId: enquiry.fieldId,   // 🔥 MUST
                originalMonthYear,

                shareMedia: enquiry.shareMedia || { shareMedia: false, at: null },
            }));
        }
    }, [enquiry]);

    const [showCalendar, setShowCalendar] = useState(false);
    const [errors, setErrors] = useState({});
    const [toast, setToast] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleWinChange = (e) => {
        const range = e.target.value;
        let mid = "";

        switch (range) {
            case "0-25": mid = 12; break;
            case "25-50": mid = 38; break;
            case "50-75": mid = 62; break;
            case "75-100": mid = 88; break;
            default: mid = "";
        }

        setFormData(prev => ({
            ...prev,
            winProbability: mid
        }));

        setWinError(!mid);
    };

    const validate = () => {
        const tempErrors = {};

        if (!formData.mobile1) tempErrors.mobile1 = "Mobile 1 is required";
        if (!formData.pax) tempErrors.pax = "Pax is required";

        if (bookingType === "single" && !formData.functionDate) {
            tempErrors.functionDate = "Function Date is required";
        }

        if (bookingType === "multi" && (!formData.fromDate || !formData.toDate)) {
            tempErrors.functionDate = "Select date range";
        }
        // 🔥 FIXED (array validation)
        if (!formData.functionTypes || formData.functionTypes.length === 0) {
            tempErrors.functionType = "Select at least one function";
        }

        if (!formData.winProbability) {
            tempErrors.winProbability = true;
            setWinError(true);
        }

        if (
            bookingType === "single" && !formData.functionDate
        ) {
            tempErrors.functionDate = "Function Date is required";
        }

        if (
            bookingType === "multi" &&
            (!formData.fromDate || !formData.toDate)
        ) {
            tempErrors.functionDate = "Select date range";
        }

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) {
            setToast("❌ Please fill all mandatory fields.");
            setTimeout(() => setToast(null), 5000);
            return;
        }

        try {
            const enquiryDateObj = new Date(formData.enquiryDate);
            if (isNaN(enquiryDateObj)) throw new Error("Invalid enquiry date");

            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const newMonthYear = `${monthNames[enquiryDateObj.getMonth()]}${enquiryDateObj.getFullYear()}`;
            const monthDocRef = doc(db, "enquiry", newMonthYear);

            // 🔹 Determine field ID
            const fieldIdToUse = formData.fieldId
                ? formData.fieldId
                : doc(collection(db, "enquiry")).id;

            // 🔹 Delete old month entry if enquiryDate month/year changed
            if (formData.fieldId && formData.originalMonthYear && formData.originalMonthYear !== newMonthYear) {
                const oldMonthRef = doc(db, "enquiry", formData.originalMonthYear);
                await setDoc(oldMonthRef, { [fieldIdToUse]: deleteField() }, { merge: true });
                console.log("🗑️ Deleted old enquiry from:", formData.originalMonthYear);
            }

            // 🔹 Prepare data to save
            const dataToSave = {
                ...formData,
                fieldId: fieldIdToUse,

                bookingType,

                functionDate:
                    bookingType === "single" ? formData.functionDate : null,

                fromDate:
                    bookingType === "multi" ? formData.fromDate : null,

                toDate:
                    bookingType === "multi" ? formData.toDate : null,

                displayDate:
                    bookingType === "single"
                        ? formData.functionDate
                        : `${formData.fromDate} → ${formData.toDate}`,

                functionTypes: formData.functionTypes,

            };

            // 🔹 Save/update enquiry in Firestore
            await setDoc(monthDocRef, { [fieldIdToUse]: dataToSave }, { merge: true });

            setToast(formData.fieldId ? "✅ Enquiry updated successfully!" : "✅ Enquiry submitted successfully!");

            // 🔹 Reset form if new
            if (!formData.fieldId) {
                setFormData({
                    fieldId: "",
                    name: "Guest Name",
                    mobile1: "",
                    mobile2: "",
                    email: "",
                    pax: "",
                    functionTypes: [],
                    functionDate: "",
                    note: "",
                    dayNight: "Night",
                    enquiryDate: getTodayIST(),
                    winProbability: "",
                    shareMedia: { shareMedia: false, at: null }, // ✅ updated
                });
            }

            // 🔹 WhatsApp share
            if (formData.shareMedia.shareMedia && formData.mobile1) {
                let phone = formData.mobile1.trim().replace(/\D/g, "");
                if (!phone.startsWith("91")) phone = phone.length === 10 ? "91" + phone : "91" + phone;

                const message = encodeURIComponent(buildWhatsappMessage());
                window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
            }

            setTimeout(() => setToast(null), 4000);
            setTimeout(() => window.history.back(), 1200);

        } catch (error) {
            console.error("❌ Error saving enquiry:", error);
            setToast("❌ Failed to submit enquiry: " + error.message);
            setTimeout(() => setToast(null), 4000);
        }
    };

    const formatIndianNumber = (value) => {
        if (!value) return "";
        const num = value.replace(/,/g, "");
        return Number(num).toLocaleString("en-IN");
    };

    const getDaysInMonth = (year, month) => {
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = [];

        for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) {
            days.push(null);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            days.push(new Date(year, month, d));
        }

        return days;
    };

    const checkDuplicate = useCallback(async () => {
        if (
            !formData.mobile1 ||
            !formData.functionTypes ||
            formData.functionTypes.length === 0 ||
            !formData.functionDate
        ) return;

        const snap = await getDocs(collection(db, "enquiry"));

        for (let docSnap of snap.docs) {
            const data = docSnap.data();

            for (let item of Object.values(data)) {
                if (
                    item.mobile1 === formData.mobile1 &&
                    JSON.stringify(item.functionTypes || []) === JSON.stringify(formData.functionTypes || []) &&
                    item.functionDate === formData.functionDate &&
                    item.fieldId !== formData.fieldId
                ) {
                    setToast("⚠️ Duplicate Entry Found!");
                    return true;
                }
            }
        }

        return false;
    }, [formData.mobile1, formData.functionDate, formData.functionTypes, formData.fieldId]);

    useEffect(() => {
        checkDuplicate();
    }, [checkDuplicate]);

    return (
        <div className="page-scroller">
            <div style={{ color: "black" }}>
                <BackButton />

                <form style={{ marginTop: "70px", display: 'flex', justifyContent: 'space-between' }} onSubmit={handleSubmit}>
                    <div></div>
                    <div className="BookedOn">
                        <label
                            style={{
                                fontWeight: 600,
                                fontSize: "14px",
                                color: "#333",
                                whiteSpace: "nowrap",
                            }}
                        >
                            Enquiry on:
                        </label>
                        <input
                            type="date"
                            name="enquiryDate"
                            value={formData.enquiryDate}
                            onChange={handleChange}
                            style={{ color: 'red', width: '150px' }}
                        />
                    </div>
                </form>

                <div className="booking-lead-container">

                    <h2>{enquiry ? "Edit Enquiry" : "New Enquiry"}</h2>

                    <form style={{ marginTop: "0px" }} onSubmit={handleSubmit}>

                        {/* Single Day and Multi Day / Multi Functions */}
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: "30px", alignItems: "center" }}>
                            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", width: "fit-content" }}>
                                <button
                                    type="button"
                                    onClick={() => setBookingType("single")}
                                    style={{
                                        flex: 1,
                                        padding: "18px 15px",
                                        background: bookingType === "single" ? "#00bbff" : "#ddd",
                                        color: bookingType === "single" ? "#fff" : "#000",
                                        border: "none",
                                        borderRadius: "15px",
                                        width: "fit-content",
                                        whiteSpace: "nowrap"
                                    }}
                                >
                                    Single Day
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setBookingType("multi")}
                                    style={{
                                        flex: 1,
                                        padding: "18px 15px",
                                        background: bookingType === "multi" ? "#00bbff" : "#ddd",
                                        color: bookingType === "multi" ? "#fff" : "#000",
                                        border: "none",
                                        borderRadius: "15px",
                                        width: "fit-content",
                                        whiteSpace: "nowrap"
                                    }}
                                >
                                    Multi Day / Multi Functions
                                </button>
                            </div>
                        </div>

                        {/* Name with Prefix */}
                        <div className="form-group">
                            <label style={{ color: 'red' }}>Name:</label>
                            <div style={{ display: 'flex', gap: '10px' }}>

                                <select
                                    onChange={(e) => handleChange({ target: { name: 'prefix', value: e.target.value } })}
                                    value={formData.prefix || ''}
                                    style={{ width: '100px' }}
                                >
                                    <option value="Mr.">Mr.</option>
                                    <option value="Ms.">Ms.</option>
                                    <option value="Mrs.">Mrs.</option>
                                    <option value="Dr.">Dr.</option>
                                    <option value="Md.">Md.</option>
                                    <option value="">Blank</option>
                                </select>

                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={(e) => {
                                        let value = e.target.value.replace(/\b\w/g, char => char.toUpperCase());
                                        handleChange({ target: { name: 'name', value } });
                                    }}
                                    placeholder=" "
                                    style={{ width: "100%" }}
                                />
                            </div>
                        </div>

                        {/* Mobile 1 */}
                        <div className="form-group">
                            <label style={{ color: 'red' }}>Mobile 1*:</label>
                            <input
                                type="text"
                                name="mobile1"
                                value={formData.mobile1}
                                maxLength={10}
                                onChange={(e) => {
                                    const onlyNums = e.target.value.replace(/[^0-9]/g, "");
                                    if (onlyNums.length <= 10) {
                                        handleChange({ target: { name: "mobile1", value: onlyNums } });
                                    }
                                    // Live validation
                                    if (onlyNums.length > 0 && onlyNums.length < 10) {
                                        setErrors((prev) => ({
                                            ...prev,
                                            mobile1: "Enter a valid 10-digit numberd",
                                        }));
                                    } else {
                                        setErrors((prev) => {
                                            const { mobile1, ...rest } = prev;
                                            return rest;
                                        });
                                    }
                                }}
                                inputMode="numeric"
                                placeholder="Enter 10-digit number"
                            />
                            {errors.mobile1 && <span className="error">{errors.mobile1}</span>}
                        </div>

                        {/* Mobile 2 */}
                        <div className="form-group">
                            <label>Mobile 2:</label>
                            <input
                                type="text"
                                name="mobile2"
                                value={formData.mobile2}
                                maxLength={10}
                                onChange={(e) => {
                                    const onlyNums = e.target.value.replace(/[^0-9]/g, "");
                                    if (onlyNums.length <= 10) {
                                        handleChange({ target: { name: "mobile2", value: onlyNums } });
                                    }
                                    // Live validation for optional field
                                    if (onlyNums.length > 0 && onlyNums.length < 10) {
                                        setErrors((prev) => ({
                                            ...prev,
                                            mobile2: "Enter a valid 10-digit number",
                                        }));
                                    } else {
                                        setErrors((prev) => {
                                            const { mobile2, ...rest } = prev;
                                            return rest;
                                        });
                                    }
                                }}
                                inputMode="numeric"
                                placeholder="Enter 10-digit number"
                            />
                            {errors.mobile2 && <span className="error">{errors.mobile2}</span>}
                        </div>

                        {/* Email */}
                        <div className="form-group">
                            <label>Email ID:</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} />
                        </div>

                        {/* Source */}
                        <div className="form-group">
                            <label>Source of Lead</label>
                            <select
                                name="source"
                                onChange={handleChange}
                                value={formData.source || ""}
                            >
                                <option value=""></option>
                                <option value="Walk-In">Walk-In</option>
                                <option value="Just Dial">Just Dial</option>
                                <option value="Reference">Reference</option>
                                <option value="Social Media">Social Media</option>
                                <option value="Past Booked">Past Booked</option>
                            </select>
                            {errors.source && <span className="error">Required</span>}
                        </div>

                        {/* Referred By */}
                        {formData.source === "Reference" && (
                            <div className="form-group">
                                <label>Referred By</label>
                                <input
                                    type="text"
                                    name="referredBy"
                                    value={formData.referredBy || ""}
                                    onChange={handleChange}
                                />
                                {errors.referredBy && <span className="error">Required</span>}
                            </div>
                        )}

                        {/* Pax */}
                        <div className={`form-group ${errors.pax ? "section-error" : ""}`}>
                            <label style={{ color: 'red' }}>Pax*:</label>
                            <input
                                type="text"
                                name="pax"
                                value={formatIndianNumber(formData.pax)}
                                onChange={(e) => {
                                    const onlyNums = e.target.value.replace(/[^0-9]/g, ""); // सिर्फ digits allow
                                    handleChange({ target: { name: "pax", value: onlyNums } });
                                }}
                                inputMode="numeric"
                                placeholder=""
                            />
                            {errors.pax && <span className="error">{errors.pax}</span>}
                        </div>

                        {/* Function Type */}
                        <div className="form-group">
                            <label style={{ color: 'red' }}>Function Type*:</label>
                            <FunctionTypeSelector
                                selectedType={formData.functionTypes}
                                multi={true}
                                onSelect={(types) =>
                                    setFormData(prev => ({
                                        ...prev,
                                        functionTypes: Array.isArray(types) ? types : [types],
                                    }))
                                }
                            />

                            {errors.functionTypes && <span className="error">{errors.functionTypes}</span>}
                        </div>

                        {/* Day/Night */}
                        <div className="form-group">
                            <label>Day / Night</label>
                            <select name="dayNight" value={formData.dayNight || ""} onChange={handleChange}>
                                <option value="Night">Night</option>
                                <option value="Day">Day</option>
                                <option value="Both">Both</option>
                            </select>
                        </div>

                        {/* Function Date */}
                        {bookingType === "single" ? (

                            <div className="form-group">
                                <label className="required-label">Function Date*</label>
                                <input
                                    type="date"
                                    className="date-input"
                                    value={formData.functionDate}
                                    onChange={(e) =>
                                        setFormData(prev => ({
                                            ...prev,
                                            functionDate: e.target.value,
                                            fromDate: "",
                                            toDate: ""
                                        }))
                                    }
                                />
                            </div>

                        ) : (
                            <div className="form-group calendar-wrapper">
                                <label className="required-label">Date Range*</label>

                                <input
                                    type="text"
                                    className="range-input"
                                    readOnly
                                    value={
                                        range.start && range.end
                                            ? `${range.start.toLocaleDateString()} → ${range.end.toLocaleDateString()}`
                                            : ""
                                    }
                                    onClick={() => setShowCalendar(true)}
                                />

                                {showCalendar && (
                                    <div ref={calendarRef} className="custom-calendar">

                                        <div className="calendar-header">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
                                                }
                                            >
                                                ‹
                                            </button>

                                            <span>
                                                {currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}
                                            </span>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
                                                }
                                            >
                                                ›
                                            </button>
                                        </div>

                                        <div className="calendar-grid">

                                            {["M", "T", "W", "T", "F", "S", "S"].map(d => (
                                                <div key={d} className="calendar-week">{d}</div>
                                            ))}

                                            {getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth()).map((date, i) => {

                                                if (!date) return <div key={i} className="calendar-empty"></div>;

                                                const isStart = range.start && date.toDateString() === range.start.toDateString();
                                                const isEnd = range.end && date.toDateString() === range.end.toDateString();

                                                const inRange =
                                                    range.start &&
                                                    (range.end || hoverDate) &&
                                                    date > range.start &&
                                                    date < (range.end || hoverDate);

                                                return (
                                                    <div
                                                        key={i}
                                                        className={`calendar-day 
                                                               ${isStart || isEnd ? "selected" : ""} 
                                                               ${inRange ? "in-range" : ""}`}
                                                        onMouseEnter={() => selecting === "end" && setHoverDate(date)}
                                                        onMouseLeave={() => setHoverDate(null)}
                                                        onClick={() => {
                                                            if (selecting === "start") {
                                                                setRange({ start: date, end: null });
                                                                setSelecting("end");
                                                            } else {
                                                                if (date < range.start) {
                                                                    setRange({ start: date, end: range.start });
                                                                } else {
                                                                    setRange({ ...range, end: date });
                                                                }
                                                                setSelecting("start");
                                                                setShowCalendar(false);
                                                            }
                                                        }}
                                                    >
                                                        {date.getDate()}
                                                    </div>
                                                );
                                            })}

                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Notes */}
                        <div className="form-group">
                            <label>Notes:</label>
                            <textarea
                                name="note"
                                value={formData.note || ""}
                                onChange={handleChange}
                                placeholder="Enter any special notes or details here..."
                                style={{
                                    width: "100%",
                                    minHeight: "70px",
                                    borderRadius: "5px",
                                    border: "1px solid #ccc",
                                    padding: "8px",
                                    fontSize: "14px",
                                    resize: "vertical",
                                    boxShadow:
                                        "inset 2px 2px 5px rgba(255, 255, 255, 0.8), inset -2px -2px 5px #00000045",
                                }}
                            />
                        </div>

                        {/* Booking Confirmation Probability */}
                        <div className="form-group">
                            <label>Booking Confirmation Probability</label>
                            <select
                                onChange={handleWinChange}
                                value={
                                    formData.winProbability === 12 ? '0-25' :
                                        formData.winProbability === 38 ? '25-50' :
                                            formData.winProbability === 62 ? '50-75' :
                                                formData.winProbability === 88 ? '75-100' : ''
                                }
                                style={{
                                    backgroundColor:
                                        formData.winProbability === 12 ? '#f44336' :
                                            formData.winProbability === 38 ? '#ff9800' :
                                                formData.winProbability === 62 ? '#ffeb3b' :
                                                    formData.winProbability === 88 ? '#4caf50' :
                                                        '#fff',
                                    color: 'black',
                                    fontWeight: 'bold',
                                    border: winError ? '1px solid red' : '1px solid #ccc',
                                    padding: '8px',
                                    borderRadius: '4px'
                                }}
                            >
                                <option style={{ backgroundColor: 'white' }} value=""></option>
                                <option style={{ backgroundColor: 'white' }} value="0-25">0 - 25%</option>
                                <option style={{ backgroundColor: 'white' }} value="25-50">25 - 50%</option>
                                <option style={{ backgroundColor: 'white' }} value="50-75">50 - 75%</option>
                                <option style={{ backgroundColor: 'white' }} value="75-100">75 - 100%</option>
                            </select>
                            {winError && <span className="error">Required</span>}
                        </div>

                        {/* Share Media */}
                        <div className="form-group">
                            <label>
                                <input
                                    type="checkbox"
                                    name="shareMedia"
                                    checked={formData.shareMedia.shareMedia} // ✅ fixed
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            shareMedia: {
                                                shareMedia: e.target.checked,
                                                at: e.target.checked ? formatDateIST(new Date()) : null, // ✅ use formatted IST
                                            },
                                        }))
                                    }
                                />
                                Share Media
                            </label>
                        </div>

                        {/* Submit */}
                        <div className="footer-buttons">
                            <button type="submit" className="save-button">
                                {enquiry ? "Update Enquiry" : "Submit Enquiry"}
                            </button>
                        </div>
                    </form>

                    {toast && (
                        <div className="custom-toast">
                            {toast}
                            <div className="toast-progress"></div>
                        </div>
                    )}

                </div>
                <div style={{ paddingBottom: '60px' }}></div>
            </div>
            <BottomNavigationBar navigate={navigate} userAppType={userAppType} />
        </div>
    );
};

export default EnquiryPage;