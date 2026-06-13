import React, { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, updateDoc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import '../styles/UserAccessTable.css';
import BackButton from "../components/BackButton";
import Modal from 'react-modal';
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import BottomNavigationBar from "../components/BottomNavigationBar";

Modal.setAppElement('#root');

const UserAccessPanel = () => {
    const navigate = useNavigate();

    const [approvedUsers, setApprovedUsers] = useState([]);
    const [accessRequests, setAccessRequests] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [loadingRequests, setLoadingRequests] = useState(true);
    const [userAppType, setUserAppType] = useState(null);
    const [showAccessModal, setShowAccessModal] = useState(false);
    const [selectedSection, setSelectedSection] = useState("");
    const [selectedItem, setSelectedItem] = useState("");
    const [selectedAccess, setSelectedAccess] = useState([]);
    const [allAccess, setAllAccess] = useState([]);
    const [accessCounts, setAccessCounts] = useState({});
    const [panelAccessData, setPanelAccessData] = useState({});

    useEffect(() => {
        const auth = getAuth();
        const user = auth.currentUser;

        // --- Live subscriptions array for cleanup ---
        const unsubscribers = [];

        try {

            const unsubUsers = onSnapshot(collection(db, "usersAccess"), (snap) => {
                const allUsers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

                const nonAdminUsers = allUsers.filter((u) => u.accessToApp !== "A");

                setApprovedUsers(nonAdminUsers);
                setLoadingUsers(false);

                if (user) {
                    const currentUser = allUsers.find((u) => u.id === user.email);
                    if (currentUser) setUserAppType(currentUser.accessToApp);
                }

                const accessArr = allUsers
                    .map((u) => u.accessToApp || [])
                    .flat()
                    .filter(Boolean);

                setAllAccess([...new Set(accessArr)]);
            });

            unsubscribers.push(unsubUsers);

            const unsubPanel = onSnapshot(collection(db, "pannelAccess"), (snap) => {
                const counts = {};
                const fullData = {};

                snap.forEach((docSnap) => {
                    const data = docSnap.data();
                    fullData[docSnap.id] = data;

                    Object.entries(data).forEach(([key, value]) => {
                        counts[`${docSnap.id}-${key}`] = Array.isArray(value) ? value.length : 0;
                    });
                });

                setPanelAccessData(fullData);   // ✅ AB USE HO RHA HAI
                setAccessCounts(counts);
            });

            unsubscribers.push(unsubPanel);

            /** 🔸 3. Listen to pending access requests */
            const unsubRequests = onSnapshot(collection(db, "accessRequests"), (snap) => {
                const requestsData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

                setAccessRequests(prev => {
                    const localMap = {};
                    prev.forEach(r => {
                        localMap[r.email] = r.currentApp;
                    });

                    return requestsData.map(r => ({
                        ...r,
                        currentApp: localMap[r.email] || r.currentApp || "G",
                    }));
                });

                setLoadingRequests(false);
            });

            unsubscribers.push(unsubRequests);

        } catch (err) {
            console.error("❌ Real-time subscription error:", err);
        }

        return () => unsubscribers.forEach((unsub) => unsub && unsub());
    }, []);


    useEffect(() => {
        const interval = setInterval(async () => {
            const now = new Date();

            for (const user of approvedUsers) {
                if (user.editData === "enable" && user.editExpiry) {
                    const expiry = new Date(user.editExpiry);

                    // If expiry time has passed
                    if (now >= expiry) {
                        try {
                            const userRef = doc(db, "usersAccess", user.email);
                            await updateDoc(userRef, {
                                editablePrebookings: [],
                                editData: "disable",
                                editExpiry: null,
                            });

                            setApprovedUsers(prev =>
                                prev.map(u =>
                                    u.email === user.email
                                        ? { ...u, editablePrebookings: [], editData: "disable", editExpiry: null }
                                        : u
                                )
                            );

                            console.log(`⏰ Auto-disabled edit access for ${user.email}`);
                        } catch (err) {
                            console.error("❌ Error auto-disabling edit access:", err);
                        }
                    }
                }
            }
        }, 10 * 60 * 1000); // ✅ check every 10 minutes

        return () => clearInterval(interval);
    }, [approvedUsers]);


    const toggleAccess = async (email, currentAccess) => {
        try {
            const newAccess = currentAccess === "enable" ? "disable" : "enable";
            await updateDoc(doc(db, "usersAccess", email), { access: newAccess });
            setApprovedUsers(prev =>
                prev.map(u =>
                    u.email === email ? { ...u, access: newAccess } : u
                )
            );
        } catch (err) {
            console.error(err);
            alert("Error toggling access.");
        }
    };

    const handleApprove = async (request) => {
        try {
            // Get current UTC time
            const now = new Date();

            // Convert to IST (UTC + 5:30)
            const istOffset = 5.5 * 60; // minutes
            const istTime = new Date(now.getTime() + istOffset * 60 * 1000).toISOString();

            // Save user access with IST timestamp
            await setDoc(doc(db, 'usersAccess', request.email), {
                name: request.name,
                email: request.email,
                accessToApp: request.currentApp,
                access: "enable",
                editData: "disable",
                approvedAt: istTime,
            });

            // Delete request from accessRequests
            await deleteDoc(doc(db, 'accessRequests', request.email));

            // Update state
            setAccessRequests(prev => prev.filter(r => r.email !== request.email));
            setApprovedUsers(prev => [
                ...prev,
                {
                    name: request.name,
                    email: request.email,
                    accessToApp: request.currentApp,
                    access: "enable",
                    editData: "disable",
                    approvedAt: istTime,
                },
            ]);
        } catch (err) {
            console.error(err);
            alert("Error approving request.");
        }
    };

    const handleReject = async (request) => {
        try {
            await deleteDoc(doc(db, 'accessRequests', request.email));
            setAccessRequests(prev => prev.filter(r => r.email !== request.email));
            alert(`❌ Rejected request from ${request.name}`);
        } catch (err) {
            console.error(err);
            alert("Error rejecting request.");
        }
    };

    const openAccessModal = async (section, item) => {
        setSelectedSection(section);
        setSelectedItem(item);

        const docRef = doc(db, "pannelAccess", section);
        const docSnap = await getDoc(docRef);
        setSelectedAccess(docSnap.exists() ? docSnap.data()[item] || [] : []);
        setShowAccessModal(true);
    };

    const saveSelectedAccess = async () => {
        try {
            const docRef = doc(db, "pannelAccess", selectedSection);
            const docSnap = await getDoc(docRef);
            const currentData = docSnap.exists() ? docSnap.data() : {};

            await setDoc(
                docRef,
                { ...currentData, [selectedItem]: selectedAccess },
                { merge: true }
            );

            setAccessCounts(prev => ({
                ...prev,
                [`${selectedSection}-${selectedItem}`]: selectedAccess.length,
            }));

            setShowAccessModal(false);
            setSelectedAccess([]);
        } catch (err) {
            console.error("Error saving access:", err);
            alert("❌ Error saving access");
        }
    };

    const getTextColor = (hex) => {
        const c = hex.substring(1);
        const rgb = parseInt(c, 16);
        const r = (rgb >> 16) & 0xff;
        const g = (rgb >> 8) & 0xff;
        const b = rgb & 0xff;
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        return luminance > 180 ? "#000000" : "#ffffff";
    };

    const accessSections = {
        Bookings: [
            { label: "📨 Enquiry", key: "Enquiry", color: "#fbc169ff", textColor: getTextColor("#ff9900") },
            { label: "🗂️ Enquiry Record", key: "Enquiry Record", color: "#fbc169ff", textColor: getTextColor("#ffb84d") },
            { label: "Water Park Records", key: "Water Park", color: "#fbc169ff", textColor: getTextColor("#ffb84d") },
            { label: "🗑️ Past Enquiry", key: "Past Enquiry", color: "#fbc169ff", textColor: getTextColor("#fff9e6") },
        ],
        Utilities: [
            { label: "Reserved Dates", key: "ReservedPage", color: "#80cfd6", textColor: getTextColor("#0393a7") },
            { label: "Whatsapp Message", key: "WhatsappMessage", color: "#80cfd6", textColor: getTextColor("#0393a7") },
            { label: "Blogs", key: "Blogs", color: "#80cfd6", textColor: getTextColor("#0393a7") },
            { label: "Ticket Prices", key: "TicketPricingAdmin", color: "#80cfd6", textColor: getTextColor("#0393a7") }
        ],
        Settings: [
            { label: "🔐 Access", key: "Access", color: "#fba472ff", textColor: getTextColor("#8f3ae3") },
        ],
    };

    const roleNames = {
        B: "📊 Manager",
        D: "🤝 Partner",
        F: "💰 Accountant",
        G: "👩‍💻 User",
        H: "📞 Enquiry Executive",
    };

    const UserAccessBtns = {
        padding: "16px",
        color: "white",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        fontWeight: "bold",
        boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
        transition: "0.3s",
        marginBottom: "10px",
        marginRight: '10px'
    };

    const updateUserRole = async (email, newRole) => {
        try {
            await updateDoc(doc(db, "usersAccess", email), {
                accessToApp: newRole,
                updatedAt: new Date().toISOString(),
            });

            setApprovedUsers(prev =>
                prev.map(u =>
                    u.email === email ? { ...u, accessToApp: newRole } : u
                )
            );
        } catch (err) {
            console.error("Error updating role:", err);
            alert("❌ Role update failed");
        }
    };

    const updateRequestedRole = (email, newRole) => {
        setAccessRequests(prev =>
            prev.map(r =>
                r.email === email
                    ? { ...r, currentApp: newRole }
                    : r
            )
        );
    };

    const getRoleWiseAccess = () => {
        const roleMap = {};

        Object.entries(panelAccessData || {}).forEach(([section, items]) => {
            Object.entries(items || {}).forEach(([itemKey, roles]) => {
                roles.forEach(role => {
                    if (!roleMap[role]) roleMap[role] = [];
                    roleMap[role].push({
                        section,
                        itemKey
                    });
                });
            });
        });

        return roleMap;
    };

    return (
        <div className="page-scroller">
            <div className="access-panel-wrapper">
                <div> <BackButton />  </div>

                <div className="assign-container access-requests">
                    <h2 className="assign-title">🧑‍💼 Access Requests</h2>
                    {loadingRequests ? (
                        <p>Loading requests...</p>
                    ) : accessRequests.length === 0 ? (
                        <p style={{ display: "flex", justifyContent: "center" }}>No Access Requests Available.</p>
                    ) : (
                        <div className="table-responsive">
                            <table className="assign-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>App Requested</th>
                                        <th>Requested At</th>
                                        <th>Approve</th>
                                        <th>Email</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {accessRequests.map((r, i) => (
                                        <tr key={i}>
                                            <td>{r.name}</td>
                                            <td>
                                                <select
                                                    value={r.currentApp || "G"}
                                                    onChange={(e) =>
                                                        updateRequestedRole(r.email, e.target.value)
                                                    }
                                                    style={{
                                                        padding: "6px",
                                                        borderRadius: "6px",
                                                        border: "1px solid #ccc",
                                                        fontWeight: "bold",
                                                        cursor: "pointer",
                                                        background: "#f8f8f8"
                                                    }}
                                                >
                                                    {Object.entries(roleNames).map(([key, label]) => (
                                                        <option key={key} value={key}>
                                                            {label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>

                                            <td>
                                                {new Date(r.requestedAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}{" "}
                                                {new Date(r.requestedAt).toLocaleTimeString("en-IN", {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                    hour12: true,
                                                    timeZone: "Asia/Kolkata",
                                                })}
                                            </td>

                                            <td className="button-group">
                                                <div>
                                                    <button
                                                        className="button approve"
                                                        onClick={() => handleApprove(r)}
                                                    >
                                                        Approve
                                                    </button>
                                                </div>
                                                <div style={{ display: 'none' }}>
                                                    <button
                                                        className="button reject"
                                                        onClick={() => handleReject(r)}
                                                    >
                                                        ❌
                                                    </button>
                                                </div>
                                            </td>
                                            <td>{r.email}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="assign-container approved-users">
                    <h2 className="assign-title">✅ Approved Users</h2>
                    {loadingUsers ? (
                        <p>Loading approved users...</p>
                    ) : approvedUsers.length === 0 ? (
                        <p>No approved users found.</p>
                    ) : (
                        <div className="table-responsive">
                            <table className="assign-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>App Role</th>
                                        <th>Id Premission</th>
                                        <th>Email</th>
                                        <th>Approved At</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {approvedUsers.map((u, i) => (
                                        <tr key={i}>
                                            <td style={{ color: "black", fontSize: "15px", fontWeight: "700" }}>{u.name}</td>

                                            <td>
                                                <div style={{ display: "flex", justifyContent: "center" }}>
                                                    <select
                                                        value={u.accessToApp}
                                                        onChange={(e) => updateUserRole(u.email, e.target.value)}
                                                        style={{
                                                            padding: "6px",
                                                            borderRadius: "6px",
                                                            border: "1px solid #ccc",
                                                            fontWeight: "bold",
                                                            cursor: "pointer",
                                                            background: "#f8f8f8",
                                                            width: "230px"
                                                        }}
                                                    >
                                                        {Object.entries(roleNames).map(([key, label]) => (
                                                            <option key={key} value={key}>
                                                                {label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </td>

                                            <td>
                                                <div style={{ display: "flex", justifyContent: "center" }}>
                                                    <button
                                                        className={`button ${u.access === "enable" ? "enable" : "disable"}`}
                                                        onClick={() => toggleAccess(u.email, u.access)}
                                                    >
                                                        {u.access === "enable" ? "Enabled" : "Disabled"}
                                                    </button>
                                                </div>
                                            </td>

                                            <td style={{ color: "black", fontSize: "15px", fontWeight: "700" }}>{u.email}</td>

                                            <td style={{ color: "black", fontSize: "15px", fontWeight: "700" }}>
                                                {new Date(u.approvedAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}{" "}
                                                , {new Date(u.approvedAt).toLocaleTimeString("en-IN", {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                    hour12: true,
                                                    timeZone: "Asia/Kolkata",
                                                })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* 🧩 Icon Wise Access */}
                <div className="assign-container access-requests" >
                    <h2 className="assign-title">🧩 Icon Wise Access</h2>

                    {Object.entries(accessSections).map(([sectionName, items]) => (
                        <div key={sectionName} className="assign-container access-requests"
                            style={{
                                marginTop: "20px",
                                border: 'none',
                                boxShadow: "inset 3px 3px 20px #d8dff7ff, 2px 2px 2px #858484ff",
                                width: "auto"
                            }}
                        >
                            <h2 className="assign-title"
                                style={{ fontWeight: "800", fontSize: "20px", color: "black" }}
                            >{sectionName}</h2>

                            <div
                                style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: "12px",
                                    alignItems: "flex-start", // ✅ YAHI LINE IMPORTANT HAI
                                    justifyContent: "center",
                                }}
                            >

                                {items.map(item => (
                                    <button
                                        key={item.key}
                                        onClick={() => openAccessModal(sectionName, item.key)}
                                        style={{
                                            ...UserAccessBtns,
                                            background: item.color,
                                            color: item.textColor || "black",
                                            position: "relative",
                                            minWidth: "240px",
                                            textAlign: "left",
                                        }}
                                    >
                                        {/* 🔹 Title */}
                                        <div style={{ fontWeight: "800", fontSize: "15px", color: "black" }}>
                                            {item.label}
                                        </div>

                                        {/* 🔹 Assigned roles */}
                                        <div
                                            style={{
                                                fontWeight: "800",
                                                marginTop: "6px",
                                                fontSize: "13px",
                                                opacity: 0.9,
                                                lineHeight: "1.6",
                                                color: "black",
                                                backgroundColor: "#ffffff",
                                                padding: "6px",
                                                borderRadius: "4px",
                                            }}
                                        >
                                            {panelAccessData?.[sectionName]?.[item.key]?.length > 0 ? (
                                                <ol style={{ margin: 0, paddingLeft: "18px" }}>
                                                    {panelAccessData[sectionName][item.key].map((r, index) => (
                                                        <li key={r} style={{ listStyleType: "decimal" }}>
                                                            {roleNames[r]}
                                                        </li>
                                                    ))}
                                                </ol>
                                            ) : (
                                                <span style={{ fontStyle: "italic", color: "#666" }}>
                                                    No access assigned
                                                </span>
                                            )}
                                        </div>

                                        {/* 🔹 Count badge */}
                                        {accessCounts[`${sectionName}-${item.key}`] > 0 && (
                                            <span
                                                style={{
                                                    position: "absolute",
                                                    top: "-6px",
                                                    right: "-6px",
                                                    backgroundColor: "#1384b8ff",
                                                    color: "white",
                                                    borderRadius: "50%",
                                                    fontSize: "12px",
                                                    padding: "4px 7px",
                                                    fontWeight: "bold",
                                                    boxShadow: "0 0 4px rgba(0,0,0,0.3)"
                                                }}
                                            >
                                                {accessCounts[`${sectionName}-${item.key}`]}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}

                    <Modal
                        isOpen={showAccessModal}
                        onRequestClose={() => setShowAccessModal(false)}
                        style={{
                            overlay: { backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000 },
                            content: {
                                top: '50%',
                                left: '50%',
                                right: 'auto',
                                bottom: 'auto',
                                marginRight: '-50%',
                                transform: 'translate(-50%, -50%)',
                                width: '320px',
                                maxHeight: '80vh',
                                padding: '10px',
                                borderRadius: '12px',
                                boxShadow: '5px 5px 10px rgba(0, 0, 0, 1)',
                                overflowY: 'auto',
                                maxWidth: '320px',
                            }
                        }}
                    >
                        <h2 style={{ marginBottom: '10px' }}>
                            Select Access for
                            <div style={{ color: 'red' }}> {selectedItem}</div>
                        </h2>

                        {/* 🔘 Select All Button */}
                        <div style={{ textAlign: 'right', marginBottom: '10px' }}>
                            <button
                                onClick={() => {
                                    if (selectedAccess.length === allAccess.filter(acc => acc !== "A").length) {
                                        // unselect all
                                        setSelectedAccess([]);
                                    } else {
                                        // select all except Admin
                                        setSelectedAccess(allAccess.filter(acc => acc !== "A"));
                                    }
                                }}
                                style={{
                                    padding: '6px 12px',
                                    backgroundColor: selectedAccess.length === allAccess.filter(acc => acc !== "A").length
                                        ? '#f44336'
                                        : '#2196F3',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 'bold'
                                }}
                            >
                                {selectedAccess.length === allAccess.filter(acc => acc !== "A").length
                                    ? 'Unselect All'
                                    : 'Select All'}
                            </button>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            {allAccess
                                .filter(acc => acc !== "A") // exclude Admin
                                .map((acc, idx) => (
                                    <div key={idx} style={{ marginBottom: '8px' }}>
                                        <label style={{ cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                value={acc}
                                                checked={selectedAccess.includes(acc)}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setSelectedAccess(prev =>
                                                        prev.includes(val)
                                                            ? prev.filter(a => a !== val)
                                                            : [...prev, val]
                                                    );
                                                }}
                                                style={{ marginRight: '8px' }}
                                            />
                                            {roleNames[acc] || acc} {/* Show role name instead of code */}
                                        </label>
                                    </div>
                                ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                style={{
                                    padding: '10px 15px',
                                    backgroundColor: '#4CAF50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                                onClick={saveSelectedAccess}
                            >
                                Save
                            </button>
                            <button
                                style={{
                                    padding: '10px 15px',
                                    backgroundColor: '#f44336',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                                onClick={() => setShowAccessModal(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </Modal>
                </div>

                {/* 🧩 Role Wise Access */}
                <div className="assign-container access-requests">
                    <h2 className="assign-title">🧩 Role Wise Access</h2>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                            gap: "20px",
                            marginTop: "16px",
                        }}
                    >
                        {Object.entries(getRoleWiseAccess()).map(([role, accessList]) => {
                            // 🔹 group by section
                            const grouped = accessList.reduce((acc, cur) => {
                                if (!acc[cur.section]) acc[cur.section] = [];
                                acc[cur.section].push(cur.itemKey);
                                return acc;
                            }, {});

                            return (
                                <div
                                    key={role}
                                    style={{
                                        background: "#ffffff",
                                        borderRadius: "12px",
                                        padding: "14px",
                                        boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
                                        borderTop: "6px solid #4f46e5",
                                    }}
                                >
                                    {/* 🔹 Role Header */}
                                    <div
                                        style={{
                                            fontSize: "20px",
                                            fontWeight: "700",
                                            marginBottom: "12px",
                                            color: "#080808ff",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            justifyContent: "center"
                                        }}
                                    >
                                        {roleNames[role]}
                                    </div>

                                    {/* 🔹 Section wise access */}
                                    {Object.entries(grouped).map(([section, items]) => (
                                        <div key={section} style={{ marginBottom: "12px" }}>
                                            <div
                                                style={{
                                                    fontSize: "15px",
                                                    fontWeight: "800",
                                                    color: "#7a0303ff",
                                                    marginBottom: "6px",
                                                }}
                                            >
                                                {section}
                                            </div>

                                            <div
                                                style={{
                                                    display: "flex",
                                                    flexWrap: "wrap",
                                                    gap: "6px",
                                                }}
                                            >
                                                {items.map((item, i) => (
                                                    <span
                                                        key={i}
                                                        style={{
                                                            fontSize: "12px",
                                                            padding: "5px 10px",
                                                            borderRadius: "999px",
                                                            background: "#eef2ff",
                                                            color: "#090178ff",
                                                            fontWeight: "700",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        {item}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>

            <div style={{ marginBottom: "50px" }}></div>
            <BottomNavigationBar navigate={navigate} userAppType={userAppType} />
        </div>
    );
};

export default UserAccessPanel;
