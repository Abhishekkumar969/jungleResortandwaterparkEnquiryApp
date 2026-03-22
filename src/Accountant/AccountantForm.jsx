import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, setDoc, arrayUnion } from "firebase/firestore";
import { db } from "../firebaseConfig";
import BackButton from "../components/BackButton";
import styles from "../styles/accountant.module.css";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import BottomNavigationBar from "../components/BottomNavigationBar";

const AccountantCashReceipts = () => {
    const [totalCash, setTotalCash] = useState(0);
    const [distribution, setDistribution] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState("");
    const [modalName, setModalName] = useState("");
    const [modalEmail, setModalEmail] = useState("");
    const [modalAmount, setModalAmount] = useState("");
    const [modalDescription, setModalDescription] = useState("");
    const [totalLockerBalance, setTotalLockerBalance] = useState(0);
    const [modalUserType, setModalUserType] = useState("");
    const navigate = useNavigate();
    const [userAppType, setUserAppType] = useState(null);
    const [moneyReceipts, setMoneyReceipts] = useState([]);
    const [accountantDocs, setAccountantDocs] = useState([]);
    const [assignedUsers, setAssignedUsers] = useState([]);
    const [bankSummary, setBankSummary] = useState([]);

    useEffect(() => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;

        const unsub = onSnapshot(
            doc(db, "usersAccess", user.email),
            snap => {
                if (snap.exists()) {
                    setUserAppType(snap.data().accessToApp);
                }
            }
        );

        return () => unsub();
    }, []);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "moneyReceipts"), snap => {
            const data = snap.docs.map(d => d.data());
            setMoneyReceipts(data);
        });

        return () => unsub();
    }, []);

    useEffect(() => {
        const lockerUnsub = onSnapshot(doc(db, "accountant", "AssignLocker"), snap => {
            const users = snap.exists() ? snap.data().users || [] : [];
            setAssignedUsers(prev => [
                ...prev.filter(u => u.type !== "Locker"),
                ...users.map(u => ({ ...u, type: "Locker" }))
            ]);
        });
        return () => {
            lockerUnsub();
        };
    }, []);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "accountant"), snap => {
            const docs = snap.docs.map(d => ({
                id: d.id,
                ...d.data()
            }));
            setAccountantDocs(docs);
        });

        return () => unsub();
    }, []);

    useEffect(() => {
        let cash = 0;

        moneyReceipts.forEach(monthDoc => {
            Object.values(monthDoc).forEach(r => {
                if ((r.mode || "").toLowerCase() === "cash") {
                    const amt = Number(r.amount || 0);
                    cash += (r.paymentFor || "").toLowerCase() === "credit" ? amt : -amt;
                }
            });
        });

        setTotalCash(cash);
    }, [moneyReceipts]);

    useEffect(() => {
        const bankUnsub = onSnapshot(
            doc(db, "accountant", "AssignBank"),
            snap => {
                const users = snap.exists() ? snap.data().users || [] : [];
                setAssignedUsers(prev => [
                    ...prev.filter(u => u.type !== "Bank"),
                    ...users.map(u => ({ ...u, type: "Bank" }))
                ]);
            }
        );

        return () => bankUnsub();
    }, []);

    useEffect(() => {
        const banks = assignedUsers.filter(u => u.type === "Bank");

        const map = {};
        banks.forEach(b => (map[b.name] = 0));

        moneyReceipts.forEach(monthDoc => {
            Object.values(monthDoc).forEach(r => {
                if (
                    r &&
                    r.mode?.toLowerCase() === "cash" &&
                    r.cashTo
                ) {
                    const bankName = r.cashTo.replace("-Bank", "").trim();

                    if (map.hasOwnProperty(bankName)) {
                        const amt = Number(r.amount || 0);
                        if (r.paymentFor?.toLowerCase() === "credit") map[bankName] += amt;
                        else if (r.paymentFor?.toLowerCase() === "debit") map[bankName] -= amt;
                    }
                }
            });
        });

        setBankSummary(
            Object.entries(map).map(([name, amount]) => ({ name, amount }))
        );
    }, [moneyReceipts, assignedUsers]);

    useEffect(() => {
        const dist = assignedUsers.map(user => {
            let total = 0;
            let hasDenied = false;

            if (user.type === "Bank") {
                // ✅ BANK CASH FROM moneyReceipts.cashTo
                moneyReceipts.forEach(monthDoc => {
                    Object.values(monthDoc).forEach(r => {
                        if (
                            r && (r.mode || "").toLowerCase() === "cash"
                        ) {
                            const amt = Number(r.amount || 0);
                            if ((r.paymentFor || "").toLowerCase() === "credit") total += amt;
                            else if ((r.paymentFor || "").toLowerCase() === "debit") total -= amt;
                        }
                    });
                });
            } else {
                // ✅ LOCKER / STAFF FROM accountantDocs
                accountantDocs
                    .filter(d => d.id.startsWith(`${user.name}-${user.type}`))
                    .forEach(doc => {
                        (doc.transactions || []).forEach(t => {
                            const amt = Number(t.amount || 0);
                            if (t.approval === "approved") {
                                total += t.type.toLowerCase() === "credit" ? amt : -amt;
                            }
                            if (t.approval === "denied") hasDenied = true;
                        });
                    });
            }

            return { ...user, amount: total, hasDenied };
        });

        const lockerTotal = dist
            .filter(d => d.type === "Locker")
            .reduce((s, d) => s + d.amount, 0);

        setDistribution(dist);
        setTotalLockerBalance(lockerTotal);

    }, [assignedUsers, accountantDocs, moneyReceipts, totalCash]);

    const handleTransaction = async () => {
        const amount = parseFloat(modalAmount);
        if (isNaN(amount) || amount <= 0) return alert("Invalid amount");
        if (!modalDescription.trim()) return alert("Enter description");

        setIsProcessing(true);
        setProgress(0);

        let progressVal = 0;
        const interval = setInterval(() => {
            progressVal += 5;
            setProgress(progressVal);
        }, 100);

        try {
            const user = distribution.find(
                u => u.name === modalName && u.type === modalUserType
            );
            if (!user) throw new Error("User not found");

            const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000);

            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, "0");
            const dd = String(now.getDate()).padStart(2, "0");

            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const monthLabel = monthNames[now.getMonth()];

            const newTransaction = {
                amount,
                type: modalType,
                approval: "denied",
                description: modalDescription,
                date: `${yyyy}-${mm}-${dd}`,
                createdAt: now.toISOString()
            };

            const docId = `${modalName}-${modalUserType}${monthLabel}${yyyy}`;
            const ref = doc(db, "accountant", docId);

            await setDoc(
                ref,
                {
                    name: modalName,
                    email: modalEmail,
                    type: modalUserType,
                    month: `${monthLabel}${yyyy}`,
                    transactions: arrayUnion(newTransaction)
                },
                { merge: true }
            );

            // 🔥 YAHI MAGIC HAI:
            // accountantDocs ka onSnapshot auto-fire hoga
            // distribution auto-recalculate ho jayega

            clearInterval(interval);
            setProgress(100);

            setTimeout(() => {
                setIsProcessing(false);
                setShowModal(false);
                setModalAmount("");
                setModalDescription("");
            }, 200);

        } catch (err) {
            console.error(err);
            clearInterval(interval);
            setIsProcessing(false);
        }
    };

    const formatIndianNumber = (value) => {
        if (!value) return "";
        const parts = value.split(".");
        parts[0] = Number(parts[0]).toLocaleString("en-IN");
        return parts.join(".");
    };

    const removeCommas = (value) => {
        return value.replace(/,/g, "");
    };

    const totalBankAmount = bankSummary.reduce(
        (sum, b) => sum + Number(b.amount || 0),
        0
    );

    const cashInHand = totalCash - totalBankAmount - totalLockerBalance;

    return (
        <div className="page-scroller">
            <div className={styles.container}>
                <BackButton />
                <div className={styles.header} style={{ marginTop: '40px' }}>
                    <h2 className={styles.title}>Cashflow</h2>
                </div>

                <div className={styles.cashInHand}>

                    <span>💰 Total Cash Bal:  <span style={{ fontWeight: "800", color: "#d20000" }}>  ₹{totalCash.toLocaleString("en-IN")}</span>  </span>

                    <div style={{ marginTop: "6px", marginLeft: "20px", fontSize: "14px" }}>
                        {bankSummary.map((b, i) => (
                            <div key={i}>
                                └─ 🏦 {b.name}: <span style={{ fontWeight: "800", color: "#d20000" }}> <b>₹{b.amount.toLocaleString("en-IN")}</b> </span>
                            </div>
                        ))}
                    </div>

                    <span>
                        🏦 Total Locker Bal: <span style={{ fontWeight: "800", color: "#d20000" }}>  ₹{totalLockerBalance.toLocaleString("en-IN")} </span>
                    </span>

                    {/* ✅ NEW LINE */}
                    <span style={{ display: "block", marginTop: "8px", fontWeight: "600", color: "#000000" }}>
                        💵 Cash-In-Hand: <span style={{ fontWeight: "800", color: "#d20000" }}> ₹{cashInHand.toLocaleString("en-IN")} </span>
                    </span>

                </div>

                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Amount</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {distribution
                                .filter(item => item.type !== "Bank")
                                .map((item, index) => (
                                    <tr key={index} style={{ whiteSpace: 'nowrap' }}>
                                        <td style={{ display: "flex", alignItems: "center", gap: "8px", height: "100%" }}>
                                            <span
                                                style={{
                                                    display: "inline-block",
                                                    width: "12px",
                                                    height: "12px",
                                                    borderRadius: "50%",
                                                    backgroundColor: item.hasDenied ? "red" : "transparent",
                                                    flexShrink: 0,
                                                }}
                                                title={item.hasDenied ? "Pending approval" : "All approved"}
                                            ></span>
                                            <span style={{ lineHeight: "2" }}>{item.name} - ({item.type})</span>
                                        </td>

                                        <td>₹{item.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                                        <td>
                                            <button
                                                className={styles.creditBtn}
                                                onClick={() => {
                                                    setModalName(item.name);
                                                    setModalEmail(item.email);
                                                    setModalType("Credit");
                                                    setModalUserType(item.type);
                                                    setShowModal(true);
                                                }}
                                            >
                                                Credit
                                            </button>
                                            <button
                                                className={styles.debitBtn}
                                                onClick={() => {
                                                    setModalName(item.name);
                                                    setModalEmail(item.email);
                                                    setModalType("Debit");
                                                    setModalUserType(item.type);
                                                    setShowModal(true);
                                                }}
                                            >
                                                Debit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>

                {showModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <h3>{modalType} for {modalName}</h3>
                            {isProcessing && (
                                <div className={styles.progressWrapper}>
                                    <div className={styles.progressBar} style={{ width: `${progress}%` }} />
                                </div>
                            )}

                            <textarea
                                placeholder="Enter description"
                                value={modalDescription}
                                onChange={(e) => setModalDescription(e.target.value)}
                                className={styles.textArea}
                            />

                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder="Enter amount"
                                value={formatIndianNumber(modalAmount)}
                                onChange={(e) => {
                                    let val = removeCommas(e.target.value);

                                    // Allow only numbers and decimal
                                    val = val.replace(/[^0-9.]/g, "");

                                    // Allow only one decimal
                                    if ((val.match(/\./g) || []).length > 1) return;

                                    setModalAmount(val);
                                }}
                            />

                            <div className={styles.modalActions}>
                                <button className={styles.saveBtn} onClick={handleTransaction}>Save</button>
                                <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <div style={{ marginBottom: '50px' }}></div>
            <BottomNavigationBar navigate={navigate} userAppType={userAppType} />
        </div>
    );
};

export default AccountantCashReceipts;
