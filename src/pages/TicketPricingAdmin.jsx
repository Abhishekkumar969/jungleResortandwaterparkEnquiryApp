import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebaseConfig";
import BackButton from "../components/BackButton";
import BottomNavigationBar from "../components/BottomNavigationBar";
import { useNavigate } from 'react-router-dom';
import "../styles/TicketPricingAdmin.css";

export default function TicketPricingAdmin() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);
    const [activeTab, setActiveTab] = useState("waterpark");

    const [tickets, setTickets] = useState([]);
    const [cottagePkgs, setCottagePkgs] = useState([]);
    const [toastMessage, setToastMessage] = useState("");

    // Tracks which card IDs are currently in edit mode
    const [editingIds, setEditingIds] = useState([]);

    // Check Access & Load from Firestore
    useEffect(() => {
        let unsubscribe = null;
        const checkAccessAndLoad = async () => {
            setLoading(true);
            try {
                const auth = getAuth();
                const user = auth.currentUser;

                if (!user) {
                    setHasAccess(false);
                    setLoading(false);
                    return;
                }

                // 1. Fetch user's role
                const userAccessRef = doc(db, "usersAccess", user.email);
                const userAccessSnap = await getDoc(userAccessRef);

                if (!userAccessSnap.exists()) {
                    setHasAccess(false);
                    setLoading(false);
                    return;
                }

                const userData = userAccessSnap.data();
                const role = userData.accessToApp;

                // 2. Fetch panel access list
                const panelAccessRef = doc(db, "pannelAccess", "Utilities");
                const panelAccessSnap = await getDoc(panelAccessRef);

                let isAllowed = false;
                if (role === "A") {
                    isAllowed = true;
                } else if (panelAccessSnap.exists()) {
                    const allowedRoles = panelAccessSnap.data().TicketPricingAdmin || [];
                    isAllowed = allowedRoles.includes(role);
                }

                setHasAccess(isAllowed);

                if (isAllowed) {
                    // 3. Load actual pricing data in real-time
                    const docRef = doc(db, "ticketPrices", "active");
                    unsubscribe = onSnapshot(docRef, (docSnap) => {
                        if (docSnap.exists()) {
                            const data = docSnap.data();
                            setTickets(data.waterparkTickets || []);
                            setCottagePkgs(data.cottagePackages || []);
                        }
                    }, (err) => {
                        console.error("Error in onSnapshot listener:", err);
                    });
                }
            } catch (err) {
                console.error("Error verifying access or loading data:", err);
                showToast("Error checking page permissions.");
            } finally {
                setLoading(false);
            }
        };
        checkAccessAndLoad();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(""), 3000);
    };

    // Save entire current state to Firestore
    const saveDatabaseState = async (updatedTickets, updatedCottages) => {
        try {
            const docRef = doc(db, "ticketPrices", "active");
            await setDoc(docRef, {
                waterparkTickets: updatedTickets || tickets,
                cottagePackages: updatedCottages || cottagePkgs,
                updatedAt: new Date().toISOString()
            });
            showToast("✅ Database updated successfully!");
        } catch (err) {
            console.error("Error saving data:", err);
            showToast("❌ Error saving to database.");
        }
    };

    // Enter editing mode for an item
    const enterEditMode = (id) => {
        setEditingIds([...editingIds, id]);
    };

    // Save individual card changes to Database
    const saveIndividualItem = async (id, tabType) => {
        setEditingIds(editingIds.filter(editingId => editingId !== id));
        await saveDatabaseState();
    };

    // Delete item directly
    const deleteItem = async (id, tabType) => {
        if (!window.confirm("Are you sure you want to delete this option?")) return;

        let updatedTickets = tickets;
        let updatedCottages = cottagePkgs;

        if (tabType === "waterpark") {
            updatedTickets = tickets.filter(t => t.id !== id);
            setTickets(updatedTickets);
        } else if (tabType === "cottage") {
            updatedCottages = cottagePkgs.filter(p => p.id !== id);
            setCottagePkgs(updatedCottages);
        }

        setEditingIds(editingIds.filter(editingId => editingId !== id));
        await saveDatabaseState(updatedTickets, updatedCottages);
    };

    // --- Ticket Handlers ---
    const addTicket = () => {
        const newId = `ticket_${Date.now()}`;
        const newTicket = {
            id: newId,
            name: "New Ticket Option",
            price: 399,
            originalPrice: 599,
            features: ["Wave Pool"],
            popular: false
        };
        setTickets([...tickets, newTicket]);
        setEditingIds([...editingIds, newId]);
    };

    const updateTicketValue = (id, key, value) => {
        setTickets(tickets.map(t => t.id === id ? { ...t, [key]: value } : t));
    };

    const addFeatureToTicket = (ticketId) => {
        setTickets(tickets.map(t => {
            if (t.id !== ticketId) return t;
            return { ...t, features: [...t.features, ""] };
        }));
    };

    const updateFeatureInTicket = (ticketId, index, value) => {
        setTickets(tickets.map(t => {
            if (t.id !== ticketId) return t;
            const updated = [...t.features];
            updated[index] = value;
            return { ...t, features: updated };
        }));
    };

    const deleteFeatureFromTicket = (ticketId, index) => {
        setTickets(tickets.map(t => {
            if (t.id !== ticketId) return t;
            return { ...t, features: t.features.filter((_, idx) => idx !== index) };
        }));
    };

    // --- Cottage Handlers ---
    const addCottagePkg = () => {
        const newId = `cottage_${Date.now()}`;
        const newPkg = {
            id: newId,
            duration: "6 Hours",
            price: 1999,
            highlights: ["Private AC Cottage Room"],
            waterIncluded: false,
            popular: false
        };
        setCottagePkgs([...cottagePkgs, newPkg]);
        setEditingIds([...editingIds, newId]);
    };

    const updateCottagePkgValue = (id, key, value) => {
        setCottagePkgs(cottagePkgs.map(p => p.id === id ? { ...p, [key]: value } : p));
    };

    const addHighlightToCottage = (cottageId) => {
        setCottagePkgs(cottagePkgs.map(p => {
            if (p.id !== cottageId) return p;
            return { ...p, highlights: [...p.highlights, ""] };
        }));
    };

    const updateHighlightInCottage = (cottageId, index, value) => {
        setCottagePkgs(cottagePkgs.map(p => {
            if (p.id !== cottageId) return p;
            const updated = [...p.highlights];
            updated[index] = value;
            return { ...p, highlights: updated };
        }));
    };

    const deleteHighlightFromCottage = (cottageId, index) => {
        setCottagePkgs(cottagePkgs.map(p => {
            if (p.id !== cottageId) return p;
            return { ...p, highlights: p.highlights.filter((_, idx) => idx !== index) };
        }));
    };

    if (loading) {
        return (
            <div className="loading-wrapper">
                <div className="loader"></div>
                <p>Verifying permissions...</p>
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <>
                <BackButton />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "70vh", fontFamily: "inherit", color: "#64748b" }}>
                    <span style={{ fontSize: "4rem" }}>🔒</span>
                    <h2 style={{ color: "#0f172a", marginTop: "15px", fontWeight: "800" }}>Access Denied</h2>
                    <p style={{ fontSize: "1rem", marginTop: "5px" }}>You do not have permission to access the Ticket Pricing Dashboard.</p>
                </div>
                <BottomNavigationBar navigate={navigate} />
            </>
        );
    }

    return (
        <>
            <BackButton />

            <div className="ticket-admin-container">
                <div className="ticket-admin-header">
                    <h2>🎫 Ticket Pricing Dashboard</h2>
                    <p>Manage ticket configurations. Click edit to modify individual packages.</p>
                </div>

                <div className="tabs-container">
                    <button
                        className={`tab-btn ${activeTab === "waterpark" ? "active" : ""}`}
                        onClick={() => setActiveTab("waterpark")}
                    >
                        🌊 Waterpark Tickets
                    </button>
                    <button
                        className={`tab-btn ${activeTab === "cottage" ? "active" : ""}`}
                        onClick={() => setActiveTab("cottage")}
                    >
                        🏡 Cottage Packages
                    </button>
                </div>

                {/* --- WATERPARK TICKETS --- */}
                {activeTab === "waterpark" && (
                    <div>
                        <button className="btn-add" onClick={addTicket}>➕ Add New Ticket</button>
                        {tickets.length === 0 ? (
                            <p style={{ textAlign: "center", marginTop: "20px", color: "#64748b" }}>No tickets available. Click "Add New Ticket" to create one.</p>
                        ) : (
                            <div className="cards-grid">
                                {tickets.map(ticket => {
                                    const isEditing = editingIds.includes(ticket.id);
                                    return (
                                        <div className={`ticket-admin-card ${isEditing ? "editing" : ""}`} key={ticket.id}>
                                            <div className="card-header-row">
                                                <span className="card-title-id">ID: {ticket.id}</span>
                                                <div className="card-buttons">
                                                    {isEditing ? (
                                                        <>
                                                            <button className="btn-success" onClick={() => saveIndividualItem(ticket.id, "waterpark")}>Save</button>
                                                            <button className="btn-danger" onClick={() => deleteItem(ticket.id, "waterpark")}>Delete</button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button className="btn-edit" onClick={() => enterEditMode(ticket.id)}>Edit</button>
                                                            <button className="btn-danger" onClick={() => deleteItem(ticket.id, "waterpark")}>Delete</button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {isEditing ? (
                                                /* --- EDIT MODE --- */
                                                <>
                                                    <div className="form-group">
                                                        <label>Ticket Name</label>
                                                        <input
                                                            type="text"
                                                            value={ticket.name}
                                                            onChange={(e) => updateTicketValue(ticket.id, "name", e.target.value)}
                                                        />
                                                    </div>

                                                    <div className="form-grid-2">
                                                        <div className="form-group">
                                                            <label>Price (₹)</label>
                                                            <input
                                                                type="number"
                                                                value={ticket.price}
                                                                onChange={(e) => updateTicketValue(ticket.id, "price", Number(e.target.value))}
                                                            />
                                                        </div>
                                                        <div className="form-group">
                                                            <label>Original Price (₹)</label>
                                                            <input
                                                                type="number"
                                                                value={ticket.originalPrice}
                                                                onChange={(e) => updateTicketValue(ticket.id, "originalPrice", Number(e.target.value))}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="form-group">
                                                        <label style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                            <span>Features</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => addFeatureToTicket(ticket.id)}
                                                                style={{ fontSize: "0.8rem", padding: "2px 8px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
                                                            >
                                                                + Add Feature
                                                            </button>
                                                        </label>
                                                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                                            {ticket.features.map((feature, idx) => (
                                                                <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                                                    <input
                                                                        type="text"
                                                                        value={feature}
                                                                        onChange={(e) => updateFeatureInTicket(ticket.id, idx, e.target.value)}
                                                                        placeholder={`Feature #${idx + 1}`}
                                                                        style={{ flex: 1, padding: "8px" }}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => deleteFeatureFromTicket(ticket.id, idx)}
                                                                        style={{ background: "#ef4444", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.9rem" }}
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="checkbox-row" onClick={() => updateTicketValue(ticket.id, "popular", !ticket.popular)}>
                                                        <input
                                                            type="checkbox"
                                                            checked={!!ticket.popular}
                                                            onChange={() => { }}
                                                        />
                                                        <span>Mark as Popular / Trending</span>
                                                    </div>
                                                </>
                                            ) : (
                                                /* --- VIEW MODE --- */
                                                <>
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                                        <h3 className="view-title">{ticket.name}</h3>
                                                        {ticket.popular && <span className="badge-popular">Popular</span>}
                                                    </div>

                                                    <div className="view-price-box">
                                                        <span className="view-price">₹{ticket.price}</span>
                                                        <span className="view-old-price">₹{ticket.originalPrice}</span>
                                                    </div>

                                                    <div className="form-group">
                                                        <label>Included Features</label>
                                                        <ul className="view-features-list">
                                                            {ticket.features.map((f, i) => <li key={i}>✅ {f}</li>)}
                                                        </ul>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* --- COTTAGE PACKAGES --- */}
                {activeTab === "cottage" && (
                    <div>
                        <button className="btn-add" onClick={addCottagePkg}>➕ Add Cottage Package</button>
                        {cottagePkgs.length === 0 ? (
                            <p style={{ textAlign: "center", marginTop: "20px", color: "#64748b" }}>No cottage packages available. Click "Add Cottage Package" to create one.</p>
                        ) : (
                            <div className="cards-grid">
                                {cottagePkgs.map(pkg => {
                                    const isEditing = editingIds.includes(pkg.id);
                                    return (
                                        <div className={`ticket-admin-card ${isEditing ? "editing" : ""}`} key={pkg.id}>
                                            <div className="card-header-row">
                                                <span className="card-title-id">ID: {pkg.id}</span>
                                                <div className="card-buttons">
                                                    {isEditing ? (
                                                        <>
                                                            <button className="btn-success" onClick={() => saveIndividualItem(pkg.id, "cottage")}>Save</button>
                                                            <button className="btn-danger" onClick={() => deleteItem(pkg.id, "cottage")}>Delete</button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button className="btn-edit" onClick={() => enterEditMode(pkg.id)}>Edit</button>
                                                            <button className="btn-danger" onClick={() => deleteItem(pkg.id, "cottage")}>Delete</button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {isEditing ? (
                                                /* --- EDIT MODE --- */
                                                <>
                                                    <div className="form-group">
                                                        <label>Duration / Stay</label>
                                                        <input
                                                            type="text"
                                                            value={pkg.duration}
                                                            onChange={(e) => updateCottagePkgValue(pkg.id, "duration", e.target.value)}
                                                        />
                                                    </div>

                                                    <div className="form-group">
                                                        <label>Base Price (₹)</label>
                                                        <input
                                                            type="number"
                                                            value={pkg.price}
                                                            onChange={(e) => updateCottagePkgValue(pkg.id, "price", Number(e.target.value))}
                                                        />
                                                    </div>

                                                    <div className="form-group">
                                                        <label style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                            <span>Highlights</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => addHighlightToCottage(pkg.id)}
                                                                style={{ fontSize: "0.8rem", padding: "2px 8px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
                                                            >
                                                                + Add Highlight
                                                            </button>
                                                        </label>
                                                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                                            {pkg.highlights.map((highlight, idx) => (
                                                                <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                                                    <input
                                                                        type="text"
                                                                        value={highlight}
                                                                        onChange={(e) => updateHighlightInCottage(pkg.id, idx, e.target.value)}
                                                                        placeholder={`Highlight #${idx + 1}`}
                                                                        style={{ flex: 1, padding: "8px" }}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => deleteHighlightFromCottage(pkg.id, idx)}
                                                                        style={{ background: "#ef4444", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.9rem" }}
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="checkbox-row" onClick={() => updateCottagePkgValue(pkg.id, "waterIncluded", !pkg.waterIncluded)}>
                                                        <input
                                                            type="checkbox"
                                                            checked={!!pkg.waterIncluded}
                                                            onChange={() => { }}
                                                        />
                                                        <span>🌊 Water Park Access Included</span>
                                                    </div>

                                                    <div className="checkbox-row" onClick={() => updateCottagePkgValue(pkg.id, "popular", !pkg.popular)}>
                                                        <input
                                                            type="checkbox"
                                                            checked={!!pkg.popular}
                                                            onChange={() => { }}
                                                        />
                                                        <span>⭐ Popular Package</span>
                                                    </div>
                                                </>
                                            ) : (
                                                /* --- VIEW MODE --- */
                                                <>
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                                        <h3 className="view-title">{pkg.duration}</h3>
                                                        <div style={{ display: "flex", gap: "6px" }}>
                                                            {pkg.popular && <span className="badge-popular">Popular</span>}
                                                            {pkg.waterIncluded && <span className="badge-popular" style={{ background: "#e0f2fe", color: "#0369a1" }}>Water Included</span>}
                                                        </div>
                                                    </div>

                                                    <div className="view-price-box">
                                                        <span className="view-price">₹{pkg.price}</span>
                                                    </div>

                                                    <div className="form-group">
                                                        <label>Package Highlights</label>
                                                        <ul className="view-features-list">
                                                            {pkg.highlights.map((h, i) => <li key={i}>✨ {h}</li>)}
                                                        </ul>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {toastMessage && <div className="toast-message">{toastMessage}</div>}

            <BottomNavigationBar navigate={navigate} />
        </>
    );
}
