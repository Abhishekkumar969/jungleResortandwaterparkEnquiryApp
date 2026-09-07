


import React, { useState, useEffect } from "react";


import "../styles/BookingAmenities.css";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig";



const FunctionTypeSelector = ({ selectedType = [], onSelect = () => { } }) => {
  const [types, setTypes] = useState([]);
  const [customType, setCustomType] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);

  // ✅ Fetch from Firestore
  useEffect(() => {
    const q = query(collection(db, "usersAccess"), where("accessToApp", "==", "A"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let allTypes = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (Array.isArray(data.functionTypes)) {
          allTypes.push(...data.functionTypes);
        }
      });

      const unique = [...new Set(allTypes)].sort();
      setTypes(unique);
    });

    return () => unsubscribe();
  }, []);

  // ✅ Sync selected (IMPORTANT FIX)
  useEffect(() => {
    if (!Array.isArray(selectedType)) return;

    selectedType.forEach((type) => {
      if (type && !types.includes(type)) {
        setTypes((prev) => [...prev, type]);
      }
    });
  }, [selectedType, types]);

  // ✅ Suggestions
  useEffect(() => {
    if (typeof customType !== "string" || customType.trim() === "") {
      setFilteredSuggestions([]);
      return;
    }

    const filtered = types.filter(
      (t) =>
        t.toLowerCase().includes(customType.toLowerCase()) &&
        t !== customType
    );

    setFilteredSuggestions(filtered);
  }, [customType, types]);

  // ✅ Toggle select
  const handleToggle = (type) => {
    let updated = Array.isArray(selectedType) ? [...selectedType] : [];

    if (updated.includes(type)) {
      updated = updated.filter((t) => t !== type);
    } else {
      updated.push(type);
    }

    onSelect(updated);
  };

  // ✅ Add custom
  const handleAddCustomType = () => {
    const trimmed =
      typeof customType === "string" ? customType.trim() : "";

    if (!trimmed) return;

    let updated = Array.isArray(selectedType) ? [...selectedType] : [];

    if (!types.includes(trimmed)) {
      setTypes((prev) => [...prev, trimmed]);
    }

    if (!updated.includes(trimmed)) {
      updated.push(trimmed);
    }

    onSelect(updated);
    setCustomType("");
  };

  return (
    <div className="function-type-container">

      {/* 🔥 BUTTON */}
      <button
        type="button"
        className="drawer-trigger"
        onClick={() => setDrawerOpen(true)}
      >
        {Array.isArray(selectedType) && selectedType.length > 0
          ? `🎉 ${selectedType.join(", ")}`
          : "Select Function Type"}
      </button>

      {/* 🔥 DRAWER */}
      {drawerOpen && (
        <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>

            <div className="drawer-header">
              <h3>Select Function Type</h3>
              <button onClick={() => setDrawerOpen(false)}>✕</button>
            </div>

            {/* 🔥 TYPES LIST */}
            <ul className="drawer-list">
              {types.length === 0 ? (
                <li>Loading...</li>
              ) : (
                types.map((type, index) => (
                  <li key={index}>
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedType.includes(type)}
                        onChange={() => handleToggle(type)}
                      />
                      {type}
                    </label>
                  </li>
                ))
              )}
            </ul>

            {/* 🔥 CUSTOM INPUT */}
            <div className="drawer-custom">
              <input
                type="text"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="Add Custom Function"
              />

              {customType.trim() !== "" && (
                <button type="button" onClick={handleAddCustomType}>
                  Add
                </button>
              )}

              {/* 🔥 SUGGESTIONS */}
              {filteredSuggestions.length > 0 && (
                <ul className="suggestion-box">
                  {filteredSuggestions.map((sug, index) => (
                    <li key={index} onClick={() => handleToggle(sug)}>
                      {sug}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ marginBottom: "70px" }}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FunctionTypeSelector;