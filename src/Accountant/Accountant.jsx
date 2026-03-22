import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import BackButton from "../components/BackButton";
import styles from "../styles/accountant.module.css";
import { useNavigate } from 'react-router-dom';
import { getAuth } from "firebase/auth";
import BottomNavigationBar from "../components/BottomNavigationBar";

const AccountantDetails = () => {
    const navigate = useNavigate();
    const [records, setRecords] = useState([]);
    const [currentUserEmail, setCurrentUserEmail] = useState("");
    const [totals, setTotals] = useState({ userTotals: {} });
    const [sortOrder, setSortOrder] = useState("desc");
    const [userAppType, setUserAppType] = useState(null);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [fyOptions, setFyOptions] = useState([]);
    const [rawTransactions, setRawTransactions] = useState([]);

    const toYMD = (input) => {
        let d = input?.toDate ? input.toDate() : new Date(input);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };

    const toISTDate = (input) => {
        if (!input) return { date: "", time: "" };

        let d;

        if (input?.toDate) {
            d = input.toDate();
        } else {
            d = new Date(input);
        }

        // Convert UTC → IST (+5:30)
        const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);

        // Date format DD/MM/YYYY
        const dd = String(ist.getDate()).padStart(2, "0");
        const mm = String(ist.getMonth() + 1).padStart(2, "0");
        const yyyy = ist.getFullYear();

        // Time → hh:mm AM/PM
        let hours = ist.getHours();
        const minutes = String(ist.getMinutes()).padStart(2, "0");
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;
        const hh = String(hours).padStart(2, "0");

        return {
            date: `${dd}/${mm}/${yyyy}`,     // 👉 DD/MM/YYYY
            time: `${hh}:${minutes} ${ampm}` // 👉 HH:MM AM/PM
        };
    };

    useEffect(() => {
        const fetchUser = async () => {
            const auth = getAuth();
            if (auth.currentUser) {
                setCurrentUserEmail(auth.currentUser.email);
            }
        };
        fetchUser();
    }, []);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "accountant"), (querySnap) => {
            const allTransactions = [];

            querySnap.forEach((docSnap) => {
                const data = docSnap.data();
                const docId = docSnap.id;
                if (Array.isArray(data.transactions)) {
                    const formatted = data.transactions.map((t) => ({
                        ...t,
                        docId,
                        email: data.email || "",
                        name: data.name || docId,
                        userType: docId.includes("Locker")
                            ? "Locker"
                            : docId.toLowerCase().includes("cash")
                                ? "Cash"
                                : "Bank"
                    }));
                    allTransactions.push(...formatted);
                }
            });

            // ✅ Raw filtered (only approved + non-Cash)
            const baseTransactions = allTransactions.filter(
                (t) => t.userType !== "Cash"
            );

            setRawTransactions(baseTransactions); // save for filter effect
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!rawTransactions.length) return;

        let filtered = [...rawTransactions];

        if (fromDate && toDate) {
            filtered = filtered.filter((t) => {
                const ymd = toYMD(t.createdAt);
                return ymd >= fromDate && ymd <= toDate;
            });
        }

        // Sorting newest first
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const userTotals = {};
        filtered.forEach((t) => {
            if (t.approval === "denied") return;

            const amt = Number(t.amount || 0);
            const finalAmount = t.type === "Credit" ? amt : -amt;
            const key = `${t.name} - (${t.userType})`;

            userTotals[key] = (userTotals[key] || 0) + finalAmount;
        });

        setTotals({ userTotals });
        setRecords(filtered);
    }, [rawTransactions, fromDate, toDate]);

    useEffect(() => {
        if (!rawTransactions.length) return;

        const fySet = new Set();

        rawTransactions.forEach((t) => {
            let d;
            if (t.createdAt?.toDate) {
                d = t.createdAt.toDate();
            } else if (t.createdAt) {
                d = new Date(t.createdAt);
            } else if (t.date) {
                d = new Date(t.date);
            } else {
                return;
            }

            if (isNaN(d)) return;

            const fyStartYear = d.getMonth() + 1 < 4 ? d.getFullYear() - 1 : d.getFullYear();
            const fyEndYear = fyStartYear + 1;

            const formatDate = (d) => {
                const dd = String(d.getDate()).padStart(2, "0");
                const mm = String(d.getMonth() + 1).padStart(2, "0");
                const yyyy = d.getFullYear();
                return `${yyyy}-${mm}-${dd}`;
            };

            const start = formatDate(new Date(fyStartYear, 3, 1)); // 1 April
            const end = formatDate(new Date(fyEndYear, 2, 31));    // 31 March
            const label = `FY ${fyStartYear}-${fyEndYear.toString().slice(-2)}`;

            fySet.add(JSON.stringify({ label, start, end }));
        });

        const fyArr = Array.from(fySet).map(fy => JSON.parse(fy));
        fyArr.sort((a, b) => b.start.localeCompare(a.start));
        setFyOptions(fyArr);

        // ✅ Set default FY to current FY
        const today = new Date();
        const currentFYStartYear = today.getMonth() + 1 < 4 ? today.getFullYear() - 1 : today.getFullYear();
        const currentFYEndYear = currentFYStartYear + 1;
        const currentFYStart = `${currentFYStartYear}-${String(4).padStart(2, "0")}-01`;
        const currentFYEnd = `${currentFYEndYear}-${String(3).padStart(2, "0")}-31`;

        setFromDate(currentFYStart);
        setToDate(currentFYEnd);

    }, [rawTransactions]);

    const handleDateSort = () => {
        const newOrder = sortOrder === "asc" ? "desc" : "asc";
        setSortOrder(newOrder);

        const sorted = [...records].sort((a, b) => {
            if (newOrder === "asc") {
                return new Date(a.createdAt) - new Date(b.createdAt);
            } else {
                return new Date(b.createdAt) - new Date(a.createdAt);
            }
        });

        setRecords(sorted);
    };

    useEffect(() => {
        const receiptsUnsub = onSnapshot(collection(db, "moneyReceipts"), (snap) => {
            snap.forEach(docSnap => {
                const data = docSnap.data();

                Object.values(data).forEach(receipt => {
                    if ((receipt.mode || "").toLowerCase() !== "cash") return;

                    let receiptDate;
                    if (receipt.addedAt?.toDate) {
                        receiptDate = receipt.addedAt.toDate();
                    } else if (receipt.addedAt) {
                        receiptDate = new Date(receipt.addedAt);
                    } else {
                        return;
                    }

                    const ymd = toYMD(receiptDate);

                    if (fromDate && toDate) {
                        if (ymd < fromDate || ymd > toDate) return;
                    }
                });
            });
        });

        return () => receiptsUnsub();
    }, [fromDate, toDate]);

    const handleApprove = async (record) => {
        try {
            if (record.email !== currentUserEmail) {
                alert("You are not authorized to approve this transaction.");
                return;
            }

            const personRef = doc(db, "accountant", record.docId);
            const personSnap = await getDoc(personRef);
            if (!personSnap.exists()) return;

            const transactions = personSnap.data().transactions || [];
            const updatedTransactions = transactions.map((t) =>
                t.createdAt === record.createdAt ? { ...t, approval: "approved" } : t
            );

            await updateDoc(personRef, { transactions: updatedTransactions });
            console.log("Transaction approved successfully");
        } catch (err) {
            console.error("Error approving transaction:", err);
        }
    };

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

    return (
        <div className="page-scroller">
            <div className="leads-table-container">
                <BackButton />
                <h2 className={styles.title} style={{ marginTop: '40px' }}>Account Records</h2>

                {(userAppType === 'A') && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '10px 0' }}>
                            <button
                                onClick={() => navigate('/AccountantForm')}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#4CAF50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                }}
                            >
                                Go To Cashflow
                            </button>
                        </div>
                    </>
                )}

                <div className={styles.filterBar}>
                    <label>
                        From:{" "}
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            placeholder="Select From"
                        />
                    </label>
                    <label>
                        To:{" "}
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            placeholder="Select To"
                        />
                    </label>

                    <label>
                        Financial Year:{" "}
                        <select
                            value={fromDate && toDate ? `${fromDate}_${toDate}` : "all_all"}
                            onChange={(e) => {
                                const [start, end] = e.target.value.split("_");
                                if (start === "all" && end === "all") {
                                    setFromDate("");
                                    setToDate("");
                                } else {
                                    setFromDate(start);
                                    setToDate(end);
                                }
                            }}
                        >
                            <option value="all_all">All</option>
                            {fyOptions.map((fy, i) => (
                                <option key={i} value={`${fy.start}_${fy.end}`}>
                                    {fy.label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <div style={{ marginBottom: "15px", overflowX: "auto" }}>
                    <table style={{ borderCollapse: "collapse", width: "100%" }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ccc" }}>Account</th>
                                <th style={{ textAlign: "right", padding: "8px", borderBottom: "1px solid #ccc" }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* BANK ACCOUNTS */}
                            {Object.keys(totals.userTotals || {})
                                .filter((user) => !user.includes("Cash") && !user.includes("Locker"))
                                .map((user) => (
                                    <tr key={user}>
                                        <td style={{ padding: "8px", textAlign: "left", color: "#2c3e50" }}>{user}</td>
                                        <td style={{ padding: "8px", textAlign: "right", color: "#2c3e50" }}>
                                            ₹{totals.userTotals[user].toLocaleString()}
                                        </td>
                                    </tr>
                                ))}

                            {/* LOCKER ACCOUNTS */}
                            {Object.keys(totals.userTotals || {})
                                .filter((user) => user.includes("Locker"))
                                .map((user) => (
                                    <tr key={user}>
                                        <td style={{ padding: "8px", textAlign: "left", color: "#d35400" }}>{user}</td>
                                        <td style={{ padding: "8px", textAlign: "right", color: "#d35400" }}>
                                            ₹{totals.userTotals[user].toLocaleString()}
                                        </td>
                                    </tr>
                                ))}

                            {/* LOCKER TOTAL */}
                            <tr style={{ fontWeight: "bold", background: "#f3f2f2ff" }}>
                                <td style={{ padding: "8px", textAlign: "left", color: "#d35400" }}>Locker Total</td>
                                <td style={{ padding: "8px", textAlign: "right", color: "#d35400" }}>
                                    ₹{Object.keys(totals.userTotals || {})
                                        .filter((user) => user.includes("Locker"))
                                        .reduce((sum, user) => sum + totals.userTotals[user], 0)
                                        .toLocaleString()}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Table */}
                <div className="table-fixed-wrapper">
                    <table className="leads-table">
                        <thead>
                            <tr>
                                <th
                                    onClick={handleDateSort}
                                    style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap", width: "50px" }}
                                >
                                    Receipt Date {sortOrder === "asc" ? "" : ""}
                                </th>
                                <th>Receipt Time</th>
                                <th>Name</th>
                                <th>Credit</th>
                                <th>Debit</th>
                                <th>Amount</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.length > 0 ? (
                                records.map((rec, idx) => {
                                    const isDenied = rec.approval === "denied";
                                    const canApprove = isDenied && rec.email === currentUserEmail;

                                    return (
                                        <tr
                                            key={idx}
                                            style={{
                                                whiteSpace: "nowrap",
                                                color: rec.type?.toLowerCase() === "credit" ? "green" : "red",
                                            }}
                                        >
                                            {/* DATE (DD/MM/YYYY) */}
                                            <td style={{ width: "70px", backgroundColor: "white" }}>
                                                {rec.createdAt ? toISTDate(rec.createdAt).date : "-"}
                                            </td>

                                            {/* TIME (hh:mm AM/PM) */}
                                            <td style={{ width: "70px", backgroundColor: "white" }}>
                                                {rec.createdAt ? toISTDate(rec.createdAt).time : "-"}
                                            </td>

                                            {/* Name & User Type */}
                                            <td style={{ textAlign: "left", backgroundColor: "white" }}>
                                                {rec.name} - ({rec.userType})
                                            </td>

                                            {/* Type Columns */}
                                            <td style={{ backgroundColor: "white" }}>{rec.type === "Credit" ? rec.type : ""}</td>
                                            <td style={{ backgroundColor: "white" }}>{rec.type === "Debit" ? rec.type : ""}</td>

                                            {/* Amount & Approval */}
                                            <td>
                                                ₹{rec.amount || "-"}{" "}
                                                {isDenied && !canApprove && (
                                                    <span
                                                        style={{
                                                            background: "red",
                                                            color: "white",
                                                            padding: "5px 7px",
                                                            borderRadius: "7px",
                                                            marginLeft: "10px",
                                                            display: "inline-block",
                                                        }}
                                                    >
                                                        Not Accepted
                                                    </span>
                                                )}
                                                {canApprove && (
                                                    <button
                                                        className={styles.approveBtn}
                                                        onClick={() => handleApprove(rec)}
                                                        style={{
                                                            background: "green",
                                                            color: "white",
                                                            padding: "5px 10px",
                                                            borderRadius: "5px",
                                                            border: "none",
                                                            marginLeft: "10px",
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        Accept
                                                    </button>
                                                )}
                                            </td>

                                            {/* Description */}
                                            <td>{rec.description || " "}</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: "center", padding: "15px" }}>
                                        No records found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

            </div>

            <div style={{ marginBottom: '50px' }}></div>
            <BottomNavigationBar navigate={navigate} userAppType={userAppType} />
        </div>
    );

};

export default AccountantDetails;