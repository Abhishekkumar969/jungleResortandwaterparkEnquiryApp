import React, { useState } from "react";
import { db } from "../firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import "../styles/VendorAgreement.css";

const VendorAgreement = () => {

    const getTodayIST = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const [form, setForm] = useState({
        agreementDate: getTodayIST(),

        vendorCategory: "",
        vendorName: "",
        vendorMobile: "",
        aadhar: "",
        vendorAddress: "",

        workDescription: "",
        measurementType: "",
        quantity: "",
        rate: "",
        totalAmount: "",
        materialBy: "",
        startDate: "",
        endDate: "",
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
    };

    const quantity = Number(form.quantity || 0);
    const rate = Number(form.rate || 0);

    const calculatedTotal =
        form.measurementType === "lumsum"
            ? Number(form.totalAmount || 0)
            : quantity * rate;

    const handleSubmit = async () => {
        if (!form.vendorName || !form.vendorCategory || !form.workDescription) {
            alert("❌ Please fill required fields");
            return;
        }

        const payload = {
            agreementDate: form.agreementDate,

            vendor: {
                category: form.vendorCategory,
                name: form.vendorName,
                mobile: form.vendorMobile,
                aadhar: form.aadhar,
                address: form.vendorAddress,
            },

            work: {
                description: form.workDescription,
                measurementType: form.measurementType,
                quantity,
                rate,
                totalAmount: calculatedTotal,
                materialResponsibility: form.materialBy,
                startDate: form.startDate,
                endDate: form.endDate,
            },

            payment: {
                totalAmount: calculatedTotal,
            },

            notes:
                "Payment will be made as per actual site measurement. No extra payment without written approval.",

            status: "Draft",
            createdAt: serverTimestamp(),
        };

        await addDoc(collection(db, "vendorAgreements"), payload);
        alert("✅ Vendor Agreement Saved Successfully");
    };

    return (
        <div className="vendor-agreement-page">
            <h2>Vendor / Work Agreement</h2>

            {/* AGREEMENT DATE */}
            <div className="form-field">
                <label>Agreement Date</label>
                <input
                    type="date"
                    name="agreementDate"
                    value={form.agreementDate}
                    onChange={handleChange}
                />
            </div>

            {/* VENDOR DETAILS */}
            <h3>Vendor Details</h3>
            <div className="form-grid">

                <div className="form-field">
                    <label>Vendor Category</label>
                    <select
                        name="vendorCategory"
                        value={form.vendorCategory}
                        onChange={handleChange}
                    >
                        <option value="">Select Vendor Type</option>
                        <option value="Carpenter">Carpenter</option>
                        <option value="Tiles">Tiles / Marble</option>
                        <option value="Painter">Painter</option>
                        <option value="Electrician">Electrician</option>
                        <option value="Plumber">Plumber</option>
                        <option value="Fabricator">Fabricator</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div className="form-field">
                    <label>Vendor Name</label>
                    <input
                        name="vendorName"
                        value={form.vendorName}
                        onChange={handleChange}
                    />
                </div>

                <div className="form-field">
                    <label>Vendor Mobile</label>
                    <input
                        name="vendorMobile"
                        value={form.vendorMobile}
                        onChange={handleChange}
                    />
                </div>

                <div className="form-field">
                    <label>Aadhaar / ID (Optional)</label>
                    <input
                        name="aadhar"
                        value={form.aadhar}
                        onChange={handleChange}
                    />
                </div>

            </div>

            <div className="form-field">
                <label>Vendor Address</label>
                <input
                    name="vendorAddress"
                    value={form.vendorAddress}
                    onChange={handleChange}
                />
            </div>

            {/* WORK DETAILS */}
            <h3>Work Scope</h3>

            <div className="form-field">
                <label>Work Description</label>
                <textarea
                    name="workDescription"
                    value={form.workDescription}
                    onChange={handleChange}
                />
            </div>

            <div className="form-grid">

                <div className="form-field">
                    <label>Measurement Type</label>
                    <select
                        name="measurementType"
                        value={form.measurementType}
                        onChange={handleChange}
                    >
                        <option value="">Select Measurement</option>
                        <option value="sqft">Square Feet</option>
                        <option value="rft">Running Feet</option>
                        <option value="nos">Numbers</option>
                        <option value="lumsum">Lumsum</option>
                    </select>
                </div>

                {form.measurementType !== "lumsum" && (
                    <>
                        <div className="form-field">
                            <label>Quantity / Area</label>
                            <input
                                name="quantity"
                                value={form.quantity}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-field">
                            <label>Rate per Unit</label>
                            <input
                                name="rate"
                                value={form.rate}
                                onChange={handleChange}
                            />
                        </div>
                    </>
                )}

                {form.measurementType === "lumsum" && (
                    <div className="form-field">
                        <label>Total Lumsum Amount</label>
                        <input
                            name="totalAmount"
                            value={form.totalAmount}
                            onChange={handleChange}
                        />
                    </div>
                )}

                <div className="form-field">
                    <label>Material Responsibility</label>
                    <select
                        name="materialBy"
                        value={form.materialBy}
                        onChange={handleChange}
                    >
                        <option value="">Select</option>
                        <option value="Vendor">Vendor</option>
                        <option value="Client">Client</option>
                    </select>
                </div>

                <div className="form-field">
                    <label>Start Date</label>
                    <input
                        type="date"
                        name="startDate"
                        value={form.startDate}
                        onChange={handleChange}
                    />
                </div>

                <div className="form-field">
                    <label>End Date</label>
                    <input
                        type="date"
                        name="endDate"
                        value={form.endDate}
                        onChange={handleChange}
                    />
                </div>

            </div>

            {/* CALCULATION */}
            <div className="calc-box">
                💰 Calculated Amount: ₹{" "}
                {form.measurementType
                    ? calculatedTotal.toLocaleString("en-IN")
                    : "0"}
            </div>

            <button className="save-agreement-btn" onClick={handleSubmit}>
                💾 Save Agreement
            </button>
        </div>
    );
};

export default VendorAgreement;
