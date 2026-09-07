


import React, { useEffect, useState, useRef } from 'react';


import '../styles/MoneyReceipts.css';
import { useNavigate } from 'react-router-dom';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import BackButton from "../components/BackButton";
import BottomNavigationBar from "../components/BottomNavigationBar";
import LogPopupCell from '../Book/AllLeads/LogPopupCell';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteField, onSnapshot } from "firebase/firestore";
import { db, getAuth } from "../firebaseConfig";



const MoneyReceipts = () => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('BankCash');
  const [modeFilter, setModeFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [financialYears, setFinancialYears] = useState([]);
  const [selectedFY, setSelectedFY] = useState("");
  const [sortKey, setSortKey] = useState("receiptDate");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showPopup, setShowPopup] = useState(false);
  const [newAmount, setNewAmount] = useState(0);
  const [newDescription, setNewDescription] = useState("");
  const [newDate, setNewDate] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [creditDebitFilter, setCreditDebitFilter] = useState('All');
  const [userAppType, setUserAppType] = useState(null);
  const [bankNames, setBankNames] = useState([]);
  const [groupFilter, setGroupFilter] = useState("All");
  const [cashToFilter, setCashToFilter] = useState("All");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [newCashTo, setNewCashTo] = useState("");
  const [newManualSlNo, setNewManualSlNo] = useState("");
  const [newParticularNature, setNewParticularNature] = useState("");
  const [newMode, setNewMode] = useState("");
  const [particularOptions, setParticularOptions] = useState([]);
  const [showNaturePopup, setShowNaturePopup] = useState(false);
  const [natureSearch, setNatureSearch] = useState("");
  const [customNature, setCustomNature] = useState("");

  useEffect(() => {
    const fetchParticularNatures = async () => {
      try {
        const snap = await getDocs(collection(db, "moneyReceipts"));
        const set = new Set();

        snap.forEach(docSnap => {
          const data = docSnap.data();

          Object.entries(data).forEach(([key, r]) => {

            // 🚫 Skip logs / meta
            if (
              !r ||
              typeof r !== "object" ||
              Array.isArray(r) ||
              !r.slNo ||              // 🔥 MUST be a receipt
              !r.amount ||
              !r.receiptDate
            ) return;

            if (
              typeof r.particularNature === "string" &&
              r.particularNature.trim().length > 0
            ) {
              set.add(r.particularNature.trim());
            }
          });
        });

        setParticularOptions(Array.from(set).sort());
      } catch (e) {
        console.error("Error fetching particular nature", e);
      }
    };

    fetchParticularNatures();
  }, []);

  const filteredNatureOptions = React.useMemo(() => {
    const q = natureSearch.toLowerCase();
    return particularOptions.filter(p =>
      p.toLowerCase().includes(q)
    );
  }, [natureSearch, particularOptions]);

  const getSortTimestamp = (r) => {
    if (r.addedAt) return new Date(r.addedAt).getTime();
    if (r.createdAt) return new Date(r.createdAt).getTime();
    return 0;
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const toISTDate = (dateStr) => {
    if (!dateStr) return null;

    // Always parse as UTC-safe date
    const d = new Date(dateStr);

    // Convert to Asia/Kolkata using Intl
    return new Date(
      d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );
  };

  const getISTDateTime = () => {
    return new Date().toLocaleString("en-GB", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  useEffect(() => {
    const fetchBankNames = async () => {
      try {
        const ref = doc(db, "accountant", "BankNames");
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          setBankNames(data.banks || []);
        }
      } catch (err) {
        console.error("Error fetching banks:", err);
      }
    };

    fetchBankNames();
  }, []);

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
    const q = collection(db, "moneyReceipts");

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let allReceipts = [];

        snapshot.docs.forEach((docSnap) => {
          const monthYear = docSnap.id; // e.g. "Sep2025"
          const data = docSnap.data();

          Object.entries(data).forEach(([receiptId, receipt]) => {
            allReceipts.push({
              id: receiptId,
              monthYear,
              ...receipt,
            });
          });
        });

        const sorted = allReceipts.sort((a, b) => {
          const aTime = getSortTimestamp(a);
          const bTime = getSortTimestamp(b);

          return sortOrder === "asc"
            ? aTime - bTime
            : bTime - aTime;
        });

        setReceipts(sorted);
      },
      (error) => {
        console.error("Error fetching receipts:", error);
      }
    );

    return () => unsubscribe();
  }, [sortKey, sortOrder]);

  useEffect(() => {
    if (receipts.length) {
      const years = new Set();

      receipts.forEach(r => {
        if (r.receiptDate) { // Use receiptDate instead of eventDate
          const date = new Date(r.receiptDate);
          const month = date.getMonth() + 1; // Jan = 0
          // FY calculation: April to March
          const fy = month >= 4
            ? `${date.getFullYear()}-${date.getFullYear() + 1}`
            : `${date.getFullYear() - 1}-${date.getFullYear()}`;
          years.add(fy);
        }
      });

      // Sort descending (latest FY first)
      setFinancialYears([...years].sort((a, b) => {
        const [aStart] = a.split('-').map(Number);
        const [bStart] = b.split('-').map(Number);
        return aStart - bStart;
      }));
    }
  }, [receipts]);

  let result = receipts;

  // 1️⃣ SEARCH
  result = result.filter(r => {
    return (
      (r.customerName || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.partyName || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.mobile || "").toString().includes(search) ||
      (r.slNo || "").toString().toLowerCase().includes(search.toLowerCase()) ||
      (r.type || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.particularNature || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.description || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.amount || "").toString().includes(search) ||
      (r.receiptDate || "").toString().toLowerCase().includes(search.toLowerCase())
    );
  });

  // 2️⃣ TYPE FILTER
  result = result.filter(r => {
    return (
      typeFilter === 'All' ||
      (typeFilter === 'Cash' && r.type === 'Cash') ||
      (typeFilter === 'Bank' && r.type === 'Money Receipt') ||
      (typeFilter === 'Voucher' && r.type === 'Voucher') ||
      (typeFilter === 'Refund' && r.paymentFor === 'Refund') ||
      (typeFilter === 'BankCash' && (r.type === 'Cash' || r.type === 'Money Receipt'))
    );
  });

  // 3️⃣ MODE FILTER
  result = result.filter(r => {
    return (
      modeFilter === 'All' ||
      (bankNames.includes(modeFilter) && r.mode === modeFilter) ||
      (modeFilter === 'Cash' &&
        (r.mode === 'Cash' || (r.type === 'Voucher' && r.cashTo)))
    );
  });

  // 3️⃣.1️⃣ CASH TO FILTER (ONLY WHEN MODE = CASH)
  result = result.filter(r => {
    if (modeFilter !== "Cash") return true;
    if (cashToFilter === "All") return true;

    return r.cashTo === cashToFilter;
  });

  // 4️⃣ DATE RANGE
  result = result.filter(r => {
    if (!r.receiptDate) return true;

    const d = toISTDate(r.receiptDate);

    const from = dateFrom ? toISTDate(dateFrom) : null;
    const to = dateTo ? toISTDate(dateTo) : null;

    return (
      (!from || d >= from) &&
      (!to || d <= to)
    );
  });

  // 5️⃣ FINANCIAL YEAR — IST SAFE (FIXED)
  result = result.filter(r => {
    if (!selectedFY || !r.receiptDate) return true;

    const [start, end] = selectedFY.split('-').map(Number);

    const d = toISTDate(r.receiptDate);
    if (!d) return true;

    const fyStart = new Date(`${start}-04-01T00:00:00`);
    const fyEnd = new Date(`${end}-03-31T23:59:59`);

    return d >= fyStart && d <= fyEnd;
  });

  // 6️⃣ CREDIT / DEBIT
  result = result.filter(r => {
    return (
      creditDebitFilter === "All" || r.paymentFor === creditDebitFilter
    );
  });

  const getFinancialYear = (dateStr) => {
    const date = toISTDate(dateStr);
    if (!date) return null;

    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    return month >= 4
      ? `${year.toString().slice(2)}-${(year + 1).toString().slice(2)}`
      : `${(year - 1).toString().slice(2)}-${year.toString().slice(2)}`;
  };

  const cashToOptions = React.useMemo(() => {
    const set = new Set();

    receipts.forEach(r => {
      if (r.mode === "Cash" && r.cashTo) {
        set.add(r.cashTo);
      }
    });

    return ["All", ...Array.from(set)];
  }, [receipts]);

  const filteredReceipts = result;

  const groupedData = {};

  filteredReceipts.forEach(receipt => {
    if (!receipt.receiptDate) return;

    const date = toISTDate(receipt.receiptDate);
    if (!date) return;

    const month = date.getMonth() + 1;
    const fy = getFinancialYear(receipt.receiptDate);

    const key = `${fy}-${month}`;

    if (!groupedData[key]) {
      groupedData[key] = {
        fy,
        month,
        credit: 0,
        debit: 0,
      };
    }

    if (receipt.paymentFor === 'Credit') {
      groupedData[key].credit += Number(receipt.amount || 0);
    } else if (receipt.paymentFor === 'Debit') {
      groupedData[key].debit += Number(receipt.amount || 0);
    }
  });

  const finalReceipts = groupFilter === "All"
    ? filteredReceipts
    : filteredReceipts.filter(r => {
      const eventType = (r.eventType || "").trim().toLowerCase();
      const particular = (r.particularNature || "").trim().toLowerCase();

      return (
        eventType === groupFilter ||
        particular === groupFilter
      );
    });

  const formatDate = (date) => {
    if (!date) return "-";

    const d = new Date(date);

    return d.toLocaleDateString("en-GB", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).replace(/\//g, "-"); // DD-MM-YYYY
  };

  const handleImportReceipts = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      // ✅ Only keep rows where type === "Voucher"
      const filteredRows = data.filter(r => (r.type || "").trim().toLowerCase() === "voucher");

      const batchUpdates = {};

      for (let row of filteredRows) {
        let jsDate = null;

        // Convert receiptDate
        try {
          if (row.receiptDate) {
            if (typeof row.receiptDate === "number") {
              jsDate = new Date((row.receiptDate - 25569) * 86400 * 1000);
            } else if (typeof row.receiptDate === "string") {
              let parts;
              if (row.receiptDate.includes("-")) parts = row.receiptDate.split("-");
              else if (row.receiptDate.includes("/")) parts = row.receiptDate.split("/");

              if (parts && parts.length === 3) {
                let [first, second, third] = parts;

                if (parseInt(first) > 31) {
                  jsDate = new Date(`${first}-${second}-${third}`);
                } else {
                  let day = first, month = second, year = third;
                  if (parseInt(year) < 100) year = "20" + year;
                  jsDate = new Date(`${year}-${month}-${day}`);
                }
              }
            }
            if (jsDate && isNaN(jsDate)) jsDate = null;
          }
        } catch {
          jsDate = null;
        }

        const monthYear = jsDate
          ? jsDate.toLocaleString("en-US", { month: "short", year: "numeric" }).replace(" ", "")
          : "UnknownMonth";

        const receiptId = crypto.randomUUID();

        const receiptData = {
          id: receiptId,
          ...row,
          receiptDate: jsDate ? jsDate.toISOString().split("T")[0] : null,
          mobile: row.mobile ? row.mobile.toString() : "",
          type: row.type || "Unknown",
          createdAt: new Date().toISOString(),
        };

        if (!batchUpdates[monthYear]) batchUpdates[monthYear] = {};
        batchUpdates[monthYear][receiptId] = receiptData;
      }

      // Firestore updates
      for (const [monthYear, receiptsMap] of Object.entries(batchUpdates)) {
        const docRef = doc(db, "moneyReceipts", monthYear);
        try {
          await updateDoc(docRef, receiptsMap);
        } catch (err) {
          if (err.code === "not-found") {
            await setDoc(docRef, receiptsMap);
          } else console.error(err);
        }
      }

      alert(`✅ Import completed! Total Voucher rows imported: ${filteredRows.length}`);
    };

    reader.readAsBinaryString(file);
  };

  const handleExportReceipts = async () => {
    try {
      const receiptsCollection = collection(db, "moneyReceipts");
      const snapshot = await getDocs(receiptsCollection);

      let allReceipts = [];

      snapshot.forEach((docSnap) => {
        const monthYear = docSnap.id;
        const receiptsMap = docSnap.data();

        Object.values(receiptsMap).forEach((receipt) => {
          allReceipts.push({
            ...receipt,
            monthYear,
          });
        });
      });

      if (allReceipts.length === 0) {
        alert("⚠️ No receipts found for export.");
        return;
      }

      // Convert receipts array → worksheet
      const worksheet = XLSX.utils.json_to_sheet(allReceipts);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Receipts");

      // Generate Excel file and trigger download
      const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      saveAs(new Blob([wbout], { type: "application/octet-stream" }), "moneyReceipts.xlsx");

      alert(`✅ Export completed! Total receipts exported: ${allReceipts.length}`);
    } catch (error) {
      console.error("Export failed:", error);
      alert("❌ Export failed. Check console for details.");
    }
  };

  const totalCredit = finalReceipts
    .filter(r => r.paymentFor === "Credit")
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const totalDebit = finalReceipts
    .filter(r => r.paymentFor === "Debit")
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const balance = totalCredit - totalDebit;

  const handleUpdateReceipt = async (updatedReceipt) => {
    try {
      const {
        id,
        monthYear,
        slNo,
        amount,
        receiptDate,
        description,
        cashTo,
        mode,
        manualSlNo,
        particularNature,
      } = updatedReceipt;

      /* ===============================
         1️⃣ LOAD OLD RECEIPT
      =============================== */
      const receiptRef = doc(db, "moneyReceipts", monthYear);
      const snap = await getDoc(receiptRef);

      if (!snap.exists() || !snap.data()[id]) {
        alert("❌ Receipt not found");
        return;
      }

      const oldReceipt = snap.data()[id];

      /* ===============================
         2️⃣ BUILD CHANGE LOG
      =============================== */
      const changes = {};

      if (oldReceipt.amount !== amount)
        changes.amount = { old: oldReceipt.amount, new: amount };

      if (oldReceipt.receiptDate !== receiptDate)
        changes.receiptDate = { old: oldReceipt.receiptDate, new: receiptDate };

      if ((oldReceipt.manualSlNo || "") !== (manualSlNo || "")) {
        changes.manualSlNo = {
          old: oldReceipt.manualSlNo || "",
          new: manualSlNo || "",
        };
      }

      if ((oldReceipt.particularNature || "") !== (particularNature || "")) {
        changes.particularNature = {
          old: oldReceipt.particularNature || "",
          new: particularNature || "",
        };
      }

      if ((oldReceipt.description || "") !== (description || ""))
        changes.description = {
          old: oldReceipt.description || "",
          new: description || "",
        };

      if ((oldReceipt.cashTo || "") !== (cashTo || ""))
        changes.cashTo = {
          old: oldReceipt.cashTo || "",
          new: cashTo || "",
        };

      if ((oldReceipt.mode || "") !== (mode || ""))
        changes.mode = {
          old: oldReceipt.mode || "",
          new: mode || "",
        };

      /* ===============================
         3️⃣ NEXT updateLog NUMBER
      =============================== */
      const existingLogs = Object.keys(oldReceipt).filter(k =>
        k.startsWith("updateLog")
      );
      const nextLogKey = `updateLog${existingLogs.length + 1}`;

      /* ===============================
         4️⃣ EDITOR INFO
      =============================== */
      const authUser = getAuth().currentUser;
      const editor = {
        email: authUser?.email || "unknown",
        at: new Date().toISOString(),
      };

      /* ===============================
         5️⃣ UPDATE moneyReceipts + LOG
      =============================== */
      await updateDoc(receiptRef, {
        [`${id}.amount`]: amount,
        [`${id}.receiptDate`]: receiptDate,
        ...(description !== undefined && { [`${id}.description`]: description }),
        ...(cashTo !== undefined && { [`${id}.cashTo`]: cashTo }),
        ...(mode !== undefined && { [`${id}.mode`]: mode }),
        ...(manualSlNo !== undefined && { [`${id}.manualSlNo`]: manualSlNo }),
        ...(particularNature !== undefined && { [`${id}.particularNature`]: particularNature }),

        ...(Object.keys(changes).length > 0 && {
          [`${id}.${nextLogKey}`]: {
            by: editor,
            changes,
          },
        }),
      });

      console.log("✅ moneyReceipts updated with log");

      /* ===============================
         6️⃣ FIND SOURCE (prebookings / vendor / decoration)
      =============================== */
      const collections = ["prebookings", "vendor", "decoration", "roomBookings"];

      let found = null;

      for (const col of collections) {
        const snapCol = await getDocs(collection(db, col));

        for (const docSnap of snapCol.docs) {
          const docId = docSnap.id;
          const data = docSnap.data();

          for (const [bookingId, bookingData] of Object.entries(data)) {

            // ❌ skip meta fields
            if (
              bookingId === "updatedAt" ||
              typeof bookingData !== "object" ||
              Array.isArray(bookingData)
            ) continue;

            // 🔥 Decide correct payment array
            const paymentsArray =
              col === "roomBookings"
                ? bookingData?.payments
                : bookingData?.advancePayments;

            if (!Array.isArray(paymentsArray)) continue;

            const idx = paymentsArray.findIndex(
              p => String(p.slNo) === String(slNo)
            );

            if (idx !== -1) {
              found = {
                col,
                docId,
                bookingId,
                paymentsArray,
                idx,
              };
              break;
            }
          }
          if (found) break;
        }
        if (found) break;
      }

      /* ===============================
         7️⃣ UPDATE SOURCE ADVANCE PAYMENT
      =============================== */
      if (found) {
        const { col, docId, bookingId, paymentsArray, idx } = found;

        paymentsArray[idx] = {
          ...paymentsArray[idx],
          amount,
          receiptDate,
          ...(description !== undefined && { description }),
          ...(cashTo !== undefined && { cashTo }),
          ...(mode !== undefined && { mode }),
          ...(manualSlNo !== undefined && { manualSlNo }),
          ...(particularNature !== undefined && { particularNature }),

          updatedAt: new Date().toISOString(),
        };

        const fieldName =
          col === "roomBookings" ? "payments" : "advancePayments";

        await updateDoc(doc(db, col, docId), {
          [`${bookingId}.${fieldName}`]: paymentsArray,
        });

        console.log(`✅ ${col} payment updated`);
      }

    } catch (err) {
      console.error("❌ Update failed:", err);
      alert("❌ Receipt update failed");
    }
  };

  const isVoucher = selectedReceipt?.slNo?.startsWith("V");

  const openPopup = (receipt) => {
    setSelectedReceipt({
      ...receipt,
      source:
        receipt.source ??
        (receipt.particularNature === "Event Royalty"
          ? "vendor"
          : receipt.particularNature === "Decoration Royalty"
            ? "decoration"
            : "prebookings"),
    });

    setNewAmount(receipt.amount ?? 0);
    setNewDescription(receipt.description ?? "");
    setNewDate(receipt.receiptDate ?? "");
    setNewCashTo(receipt.cashTo ?? "");
    setNewManualSlNo(receipt.manualSlNo ?? "");
    setNewParticularNature(receipt.particularNature ?? "");
    setNewMode(receipt.mode ?? "");
    setShowPopup(true);
  };

  const handleSave = async () => {
    if (!selectedReceipt) return;

    const effectiveMode = newMode || selectedReceipt.mode;

    if (effectiveMode === "Cash" && !newCashTo) {
      alert("⚠️ Cash mode selected — please select Cash To");
      return;
    }

    const payload = {
      ...selectedReceipt,
      bookingId: selectedReceipt.bookingId || null,
      source: selectedReceipt.source || "prebookings",
      amount: Number(newAmount),
      description: newDescription,
      receiptDate: newDate || selectedReceipt.receiptDate,
      mode: newMode || selectedReceipt.mode || null,
      cashTo:
        (newMode || selectedReceipt.mode) === "Cash"
          ? newCashTo || null
          : null,
      manualSlNo: newManualSlNo || null,
      ...(selectedReceipt.slNo?.startsWith("V") && {
        particularNature:
          (newParticularNature || customNature || selectedReceipt.particularNature || "").trim(),
      }),
    };

    await handleUpdateReceipt(payload);
    setShowPopup(false);
  };

  const rightRef = useRef(null);

  const getCurrentMonthAndFY = () => {
    const now = new Date();

    // Current Month
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const format = (d) => d.toISOString().split("T")[0];

    // Financial Year (India: Apr–Mar)
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const fy =
      month >= 4
        ? `${year}-${year + 1}`
        : `${year - 1}-${year}`;

    return {
      from: format(firstDay),
      to: format(lastDay),
      fy,
    };
  };

  useEffect(() => {
    const { from, to, fy } = getCurrentMonthAndFY();

    setDateFrom(from);
    setDateTo(to);
    setSelectedFY(fy);
  }, []);

  const canEditReceipt = (receiptDate, userAppType) => {

    if (userAppType === "A" || userAppType === "B") return true;

    if (!receiptDate) return false;

    const receiptTime = new Date(receiptDate).getTime();
    const now = Date.now();

    const SIX_HRS = 12 * 60 * 60 * 1000;

    return now - receiptTime <= SIX_HRS;
  };

  const handleDeleteReceipt = async (receipt) => {
    if (!window.confirm("❌ Are you sure you want to DELETE this receipt?")) return;

    try {
      const { id, monthYear, slNo } = receipt;

      /* ===============================
         1️⃣ DELETE FROM moneyReceipts
      =============================== */
      const receiptRef = doc(db, "moneyReceipts", monthYear);

      await updateDoc(receiptRef, {
        [id]: deleteField(),
      });

      console.log("✅ Deleted from moneyReceipts");

      /* ===============================
         2️⃣ DELETE FROM SOURCE COLLECTION
      =============================== */
      const collections = ["prebookings", "vendor", "decoration", "roomBookings"];

      for (const col of collections) {
        const snapCol = await getDocs(collection(db, col));

        for (const docSnap of snapCol.docs) {
          const docId = docSnap.id;
          const data = docSnap.data();

          for (const [bookingId, bookingData] of Object.entries(data)) {

            if (
              bookingId === "updatedAt" ||
              typeof bookingData !== "object" ||
              Array.isArray(bookingData)
            ) continue;

            const paymentsField =
              col === "roomBookings" ? "payments" : "advancePayments";

            const arr = bookingData?.[paymentsField];
            if (!Array.isArray(arr)) continue;

            const newArr = arr.filter(p => String(p.slNo) !== String(slNo));

            if (newArr.length !== arr.length) {
              await updateDoc(doc(db, col, docId), {
                [`${bookingId}.${paymentsField}`]: newArr,
              });

              console.log(`✅ Deleted from ${col}`);
              return;
            }
          }
        }
      }

    } catch (err) {
      console.error("❌ Delete failed:", err);
      alert("❌ Failed to delete receipt");
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF("l", "pt");

    const PAGE_HEIGHT = doc.internal.pageSize.height;
    const BOTTOM_MARGIN = 40;

    const formatDDMMYYYY = (dateStr) => {
      if (!dateStr) return "";
      const [yyyy, mm, dd] = dateStr.split("-");
      return `${dd}/${mm}/${yyyy}`;
    };

    const calcTotals = (rows) => {
      let credit = 0;
      let debit = 0;

      rows.forEach(r => {
        const amt = Number(r.amount || 0);
        if (r.paymentFor === "Credit") credit += amt;
        if (r.paymentFor === "Debit") debit += amt;
      });

      return { credit, debit, balance: credit - debit };
    };

    const buildRows = (rows) =>
      rows.map((r, i) => [
        i + 1,
        r.receiptDate ? formatDate(r.receiptDate) : "-",
        r.customerName || r.partyName || "-",
        r.slNo,
        r.manualSlNo,
        r.type,
        r.paymentFor === "Credit"
          ? Number(r.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })
          : "",
        r.paymentFor === "Debit"
          ? Number(r.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })
          : "",
        r.eventType || r.particularNature || "-",
        r.description || "-",
        r.mobile || "-",
        Number(r.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 }),
      ]);

    // ================= FONT =================
    doc.setFont("helvetica", "normal");
    doc.setCharSpace(0);

    // ================= TITLE =================
    doc.setFontSize(14);
    doc.text("Receipts Report", 40, 30);

    // ================= OVERALL TOTAL =================
    const { credit: totalCredit, debit: totalDebit, balance } = calcTotals(finalReceipts);

    doc.setFontSize(10);
    doc.text(`Generated on: ${getISTDateTime()}`, 40, 46);

    doc.setTextColor(0, 128, 0);
    doc.text(`Credit: Rs. ${totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 300, 46);

    doc.setTextColor(220, 20, 60);
    doc.text(`Debit: Rs. ${totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 460, 46);

    doc.setTextColor(0, 0, 0);
    doc.text(`Balance: Rs. ${balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 610, 46);

    doc.line(40, 52, 800, 52);

    // ================= FILTERS =================
    const appliedFilters = [];
    if (typeFilter !== "All") appliedFilters.push(`Receipt Type: ${typeFilter}`);
    if (creditDebitFilter !== "All") appliedFilters.push(`Credit / Debit: ${creditDebitFilter}`);
    if (modeFilter !== "All") appliedFilters.push(`Payment Mode: ${modeFilter}`);
    if (modeFilter === "Cash" && cashToFilter !== "All") appliedFilters.push(`Cash To: ${cashToFilter}`);
    if (dateFrom || dateTo)
      appliedFilters.push(`Date: ${dateFrom ? formatDDMMYYYY(dateFrom) : "Start"} to ${dateTo ? formatDDMMYYYY(dateTo) : "End"}`);
    if (selectedFY) appliedFilters.push(`FY: ${selectedFY}`);
    if (debouncedSearch) appliedFilters.push(`Search: "${debouncedSearch}"`);

    let startY = 62;

    if (appliedFilters.length) {
      doc.setFontSize(11);
      doc.text("Applied Filters:", 40, startY);
      doc.setFontSize(9);

      appliedFilters.forEach((f, i) => {
        doc.text(`• ${f}`, 55, startY + 14 + i * 12);
      });

      startY += 14 + appliedFilters.length * 12 + 12;
    }

    // ================= GROUP BY PARTICULAR =================
    const grouped = {};
    finalReceipts.forEach(r => {
      const key =
        ["Event Royalty", "Decoration Royalty"].includes(r.particularNature)
          ? r.particularNature
          : (r.eventType || r.particularNature || "Others");

      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    });

    const particularSummary = Object.entries(grouped).map(([title, rows]) => {
      const { credit, debit, balance } = calcTotals(rows);
      return [
        title,
        credit.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
        debit.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
        balance.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
      ];
    });

    // ================= TABLE HEADER =================
    const tableColumn = [
      "Sl", "Receipt Date", "Name", "Auto Sl No", "Manual Sl No",
      "Type", "Credit", "Debit", "Particular", "Description", "Mobile", "Amount"
    ];

    // ================= PARTICULAR SUMMARY =================
    const summaryHeight = particularSummary.length * 18 + 60;
    if (startY + summaryHeight > PAGE_HEIGHT - BOTTOM_MARGIN) {
      doc.addPage();
      startY = 40;
    }

    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text("PARTICULARS SUMMARY", 40, startY);
    startY += 12;

    autoTable(doc, {
      head: [["Particular", "Credit (Rs.)", "Debit (Rs.)", "Balance (Rs.)"]],
      body: particularSummary,
      startY,
      styles: {
        fontSize: 9,
        cellPadding: 6,
        halign: "right",
      },
      columnStyles: {
        0: { halign: "left" },
      },
      headStyles: {
        fillColor: [33, 150, 243], // blue
        textColor: 255,
      },
      alternateRowStyles: {
        fillColor: [245, 248, 250],
      },
    });

    startY = doc.lastAutoTable.finalY + 30;

    // ================= PARTICULAR SECTIONS =================
    Object.entries(grouped).forEach(([title, rows]) => {
      const { credit, debit, balance } = calcTotals(rows);

      const estimatedHeight = rows.length * 18 + 80;
      if (startY + estimatedHeight > PAGE_HEIGHT - BOTTOM_MARGIN) {
        doc.addPage();
        startY = 40;
      }

      const boxStartY = startY - 10;

      // ===== HEADER =====
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(title.toUpperCase(), 50, startY);

      doc.setFontSize(10);
      doc.setTextColor(0, 128, 0);
      doc.text(`Credit: Rs. ${credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 300, startY);

      doc.setTextColor(220, 20, 60);
      doc.text(`Debit: Rs. ${debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 460, startY);

      doc.setTextColor(0, 0, 0);
      doc.text(`Balance: Rs. ${balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 620, startY);

      startY += 12;

      // ===== TABLE =====
      autoTable(doc, {
        head: [tableColumn],
        body: buildRows(rows),
        startY,
        styles: { fontSize: 8, cellPadding: 5 },
        headStyles: { fillColor: [90, 90, 90], textColor: 255 },
      });

      const boxEndY = doc.lastAutoTable.finalY + 10;

      // ===== BORDER =====
      doc.setDrawColor(120);
      doc.setLineWidth(1);
      doc.roundedRect(40, boxStartY, 760, boxEndY - boxStartY, 6, 6);

      startY = boxEndY + 25;
    });

    // ================= OVERALL =================
    doc.setFontSize(12);
    doc.text("OVERALL", 40, startY);
    startY += 10;

    autoTable(doc, {
      head: [tableColumn],
      body: buildRows(finalReceipts),
      startY,
      styles: { fontSize: 8, cellPadding: 5 },
      headStyles: { fillColor: [46, 105, 153], textColor: 255 },
    });

    startY = doc.lastAutoTable.finalY + 30;

    doc.save(`Money_Receipts_${Date.now()}.pdf`);
  };

  const tableRows = React.useMemo(() => {
    const sortedReceipts = finalReceipts;

    return sortedReceipts.map((r, index) => {
      const isCredit = r.paymentFor === "Credit";
      const isDebit = r.paymentFor === "Debit";

      return (
        <tr
          key={r.id + "_" + index}
          style={{
            color:
              r.approval === "Rejected"
                ? "black"
                : isCredit
                  ? "green"
                  : isDebit
                    ? "red"
                    : "black",
            fontWeight: '600'
          }}
        >
          <td style={{ fontWeight: '600', color: 'black', backgroundColor: "white" }}>
            {finalReceipts.length - index}.
          </td>
          <td style={{ fontWeight: '600', backgroundColor: "white" }}>{r.receiptDate ? formatDate(r.receiptDate) : ''}</td>
          <td style={{ fontWeight: '600', backgroundColor: "white" }}>
            {["Event Royalty", "Decoration Royalty"].includes(r.particularNature)
              ? r.particularNature
              : (r.eventType || r.particularNature)}
          </td>
          <td style={{ backgroundColor: "white", width: "fit-content", }}>#{r.slNo}</td>
          <td style={{ width: "fit-content", backgroundColor: "white" }}>{r.manualSlNo}</td>
          <td>{r.description ? r.description : "Advance Payment"}</td>
          <td>
            {r.type === "Money Receipt"
              ? "MR"
              : r.type === "Cash"
                ? "MR"
                : r.type === "Voucher"
                  ? "Voucher"
                  : r.type}  {r.mode} {r.cashTo}
          </td>
          <td>{r.paymentFor === "Credit" ? r.paymentFor : ""}</td>
          <td>{r.paymentFor === "Debit" ? r.paymentFor : ""}</td>
          <td style={{ backgroundColor: "white" }}>{r.customerName || r.partyName}</td>
          <td>{r.mobile}</td>
          <td >{r.eventDate ? formatDate(r.eventDate) : ''}</td>

          <td style={{ textAlign: "right" }}>
            ₹{Number(r.amount || 0).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </td>
        </tr>
      );
    });
  }, [
    finalReceipts,
    userAppType
  ]);

  return (
    <div className="page-scroller">
      <div className="receipts-container">
        <div style={{ marginBottom: '0px' }}> <BackButton /> </div>

        <div style={{ marginBottom: '10px' }}>
          <h2 className="title">Receipt Stats</h2>
        </div>

        <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'right', alignItems: 'center', gap: '10px' }}>
          <input type="text"
            placeholder="🔍 Search by Sl No., Type, name, mobile, event or date"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'right',
              alignItems: 'center',
              gap: '10px',
              whiteSpace: "nowrap"
            }}
          >
            <button
              onClick={() => navigate('/MoneyReceipt')}
              style={{
                padding: '10px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
              }}
            >
              MR
            </button>

            <button
              onClick={() => navigate('/Receipts')}
              style={{
                padding: '10px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
              }}
            >
              VR
            </button>

            <button
              onClick={handleDownloadPDF}
              style={{
                padding: "10px 14px",
                backgroundColor: "#2e6999",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              ⬇ PDF
            </button>
          </div>
        </div>

        <div>
          <div style={{ marginTop: '20px' }}>
            <p style={{ fontWeight: '600', marginBottom: '10px' }}>📆 Filter by Date Range</p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap'
            }}>

              {userAppType === 'A' && (
                <>
                  {/* Export */}
                  <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                    <button
                      onClick={handleExportReceipts}
                      style={{
                        padding: "8px 14px",
                        background: "#1eb619ff",
                        color: "#fff",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                      }}
                    >
                      Export
                    </button>
                  </div>

                  {/* Import */}
                  <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                    <label
                      style={{
                        padding: "8px 14px",
                        background: "#1eb619ff",
                        color: "#fff",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                      }}
                    >
                      Import
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleImportReceipts}
                        style={{ display: "none" }}
                      />
                    </label>
                  </div>
                </>
              )}

            </div>

          </div>

          <div style={{
            margin: '20px 0',
            padding: '0px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#f9f9f9',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>

              <div style={{ padding: '0px 20px', }}>
                <p style={{ fontWeight: '600', marginBottom: '10px' }}>Receipt Type</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  <button
                    onClick={() => setTypeFilter('All')}
                    style={{
                      background: typeFilter === 'All' ? '#2e6999' : '#b3b3b3',
                      color: '#fff',
                      padding: '8px 12px',
                      border: 'none',
                      borderRadius: '4px'
                    }}>
                    All
                  </button>

                  <button
                    onClick={() => setTypeFilter('BankCash')}
                    style={{
                      background: typeFilter === 'BankCash' ? '#2e6999' : '#b3b3b3',
                      color: '#fff',
                      padding: '8px 12px',
                      border: 'none',
                      borderRadius: '4px'
                    }}>
                    MR Bank + Cash
                  </button>

                  <button
                    onClick={() => setTypeFilter('Bank')}
                    style={{
                      background: typeFilter === 'Bank' ? '#2e6999' : '#b3b3b3',
                      color: '#fff',
                      padding: '8px 12px',
                      border: 'none',
                      borderRadius: '4px'
                    }}>
                    MR Bank
                  </button>
                  <button
                    onClick={() => setTypeFilter('Cash')}
                    style={{
                      background: typeFilter === 'Cash' ? '#2e6999' : '#b3b3b3',
                      color: '#fff',
                      padding: '8px 12px',
                      border: 'none',
                      borderRadius: '4px'
                    }}>
                    MR Cash
                  </button>
                  <button
                    onClick={() => setTypeFilter('Refund')}
                    style={{
                      background: typeFilter === 'Refund' ? '#2e6999' : '#b3b3b3',
                      color: '#fff',
                      padding: '8px 12px',
                      border: 'none',
                      borderRadius: '4px'
                    }}>
                    MR Refund
                  </button>
                  <button
                    onClick={() => setTypeFilter('Voucher')}
                    style={{
                      background: typeFilter === 'Voucher' ? '#2e6999' : '#b3b3b3',
                      color: '#fff',
                      padding: '8px 12px',
                      border: 'none',
                      borderRadius: '4px'
                    }}>
                    Voucher
                  </button>
                </div>
              </div>

              <div style={{ padding: '0px 20px', }}>
                <p style={{ fontWeight: '600', marginBottom: '10px' }}>➕➖ Credit / Debit</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  <button
                    onClick={() => setCreditDebitFilter('All')}
                    style={{
                      background: creditDebitFilter === 'All' ? '#2e6999' : '#b3b3b3',
                      color: '#fff',
                      padding: '8px 12px',
                      border: 'none',
                      borderRadius: '4px'
                    }}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setCreditDebitFilter('Credit')}
                    style={{
                      background: creditDebitFilter === 'Credit' ? '#2e6999' : '#b3b3b3',
                      color: '#fff',
                      padding: '8px 12px',
                      border: 'none',
                      borderRadius: '4px'
                    }}
                  >
                    Credit
                  </button>
                  <button
                    onClick={() => setCreditDebitFilter('Debit')}
                    style={{
                      background: creditDebitFilter === 'Debit' ? '#2e6999' : '#b3b3b3',
                      color: '#fff',
                      padding: '8px 12px',
                      border: 'none',
                      borderRadius: '4px'
                    }}
                  >
                    Debit
                  </button>
                </div>
              </div>

              <div style={{ padding: '0px 20px', }}>
                <p style={{ fontWeight: '600', marginBottom: '10px' }}>💳 Payment Modes</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {/* {['All', ...bankNames, 'Cash', 'Card', 'Cheque'].map(mode => ( */}
                  {['All', ...bankNames, 'Cash'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => setModeFilter(mode)}
                      style={{
                        background: modeFilter === mode ? '#2e6999' : '#b3b3b3',
                        color: '#fff',
                        padding: '8px 12px',
                        border: 'none',
                        borderRadius: '4px'
                      }}>
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {modeFilter === "Cash" && (
                <div style={{ padding: '0px 20px' }}>
                  <p style={{ fontWeight: '600', marginBottom: '10px' }}>💰 Cash To</p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {cashToOptions.map(ct => (
                      <button
                        key={ct}
                        onClick={() => setCashToFilter(ct)}
                        style={{
                          background: cashToFilter === ct ? '#2e6999' : '#b3b3b3',
                          color: '#fff',
                          padding: '8px 12px',
                          border: 'none',
                          borderRadius: '4px'
                        }}
                      >
                        {ct}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

          <div className="group-wrapper">

            {/* ALL BOX */}
            <div
              className={`group-card ${groupFilter === "All" ? "active" : ""}`}
              onClick={() => setGroupFilter("All")}
            >
              <h4>ALL</h4>
              <p>Show all receipts</p>
            </div>


            {(() => {
              const grouped = {};
              const displayNames = {};

              // GROUPS MUST ALWAYS USE ALL RECEIPTS
              filteredReceipts.forEach((r) => {

                // const eventType = (r.eventType || "").trim();
                // const particular = (r.particularNature || "").trim();

                // Key for grouping
                // const key = (eventType || particular || "unknown").toLowerCase();

                const eventType = (r.eventType || "").trim();
                const particular = (r.particularNature || "").trim();

                // 🔥 Decide what to display / group by
                const displayValue =
                  ["Event Royalty", "Decoration Royalty"].includes(particular)
                    ? particular
                    : (eventType || particular || "No Particular");

                // Key for grouping
                const key = displayValue.toLowerCase();

                if (!grouped[key]) {
                  grouped[key] = { credit: 0, debit: 0 };
                  displayNames[key] = displayValue;
                }

                // Search visibility ONLY 
                const searchable = `${eventType} ${particular} ${r.customerName} ${r.partyName}`.toLowerCase();
                if (!searchable.includes(search.toLowerCase())) return;

                // if (!grouped[key]) {
                //   grouped[key] = { credit: 0, debit: 0 };
                //   displayNames[key] = eventType || particular || "No Particular";
                // }

                const amt = Number(r.amount || 0);
                if (r.paymentFor === "Credit") grouped[key].credit += amt;
                if (r.paymentFor === "Debit") grouped[key].debit += amt;
              });

              return Object.keys(grouped).map((key) => {
                const { credit, debit } = grouped[key];
                const display = displayNames[key];

                return (
                  <div
                    key={key}
                    className={`group-card ${groupFilter === key ? "active" : ""}`}
                    onClick={() => setGroupFilter(groupFilter === key ? "All" : key)}
                  >
                    <h4>{display}</h4>

                    {credit > 0 && <p className="credit">Credit: ₹{credit.toLocaleString("en-IN")}</p>}
                    {debit > 0 && <p className="debit">Debit: ₹{debit.toLocaleString("en-IN")}</p>}
                  </div>
                );
              });
            })()}
          </div>

        </div>

        {/* date from to  */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: "10px"
        }}>
          <div className='dateFromToFilters' style={{ display: "flex", alignItems: "center" }}>
            <label style={{ fontSize: '14px' }}>From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                fontSize: '14px',
                maxWidth: "200px"
              }}
            />
          </div>

          <div className='dateFromToFilters' style={{ display: "flex", alignItems: "center" }}>
            <label style={{ fontSize: '14px' }}>To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                fontSize: '14px',
                maxWidth: "200px"
              }}
            />
          </div>

          <div className='dateFromToFilters' style={{ display: "flex", alignItems: "center" }}>
            <label style={{ fontSize: '14px' }}>Financial Year</label>
            <select
              value={selectedFY}
              onChange={(e) => setSelectedFY(e.target.value)}
              style={{ maxWidth: "200px", padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }}
            >
              <option value="">All</option>
              {financialYears.map(fy => (
                <option key={fy} value={fy}>{fy}</option>
              ))}
            </select>
          </div>

          {(dateFrom || dateTo) && (
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setSelectedFY('');
              }}
              style={{
                padding: '6px 12px',
                background: '#92f56b7f',
                color: '#026500',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: "700"
              }}
            >
              Show All
            </button>
          )}
        </div>

        <div className="summary-bar">
          <span style={{ color: "green" }}>Credit: <span > ₹{totalCredit.toLocaleString("en-IN")} </span> </span>
          <span style={{ color: "red" }}>Debit: <span > ₹{totalDebit.toLocaleString("en-IN")} </span> </span>
          <span style={{ color: "black" }}>Balance: <span > ₹{balance.toLocaleString("en-IN")} </span> </span>
        </div>

        {/* Table */}
        <div className="leads-table-container" style={{ padding: "0px" }}>
          <div className="table-fixed-wrapper" ref={rightRef}>
            <table className="leads-table">
              <thead>
                <tr>
                  <th>SL</th>
                  <th
                    style={{ cursor: "pointer", padding: '0px 2px', }}

                    onClick={() => {
                      if (sortKey === "receiptDate") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        setSortKey("receiptDate");
                        setSortOrder("desc");
                      }
                    }}>

                    Rcpt Date
                    <button
                      style={{
                        margin: "-1px",
                        cursor: "pointer",
                        border: "none",
                        background: "transparent",
                        padding: '0px'
                      }}
                    >
                      {sortKey === "receiptDate" ? (sortOrder === "asc" ? "" : "") : ""}
                    </button>
                  </th>
                  <th>Particular Nature</th>
                  <th>Auto Sl.No</th>
                  <th>Manual Sl.No</th>
                  <th>Description</th>
                  <th>MR/VR</th>
                  <th>Credit</th>
                  <th>Debit</th>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Function Date</th>
                  <th>Amount</th>
                </tr>
              </thead>

              <tbody>
                {tableRows}
              </tbody>
            </table>
          </div>
        </div>

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
            width: "50px",
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
            width: "50px",
            height: "100px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            cursor: "pointer",
            color: "black",
          }} className="scroll-btn"
        >
          ▶
        </button>

      </div >

      {showPopup && (
        <div
          className="popup-overlay1"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "#00000000",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 91000,
          }}
        >
          <div>
            <div
              className="popup-content"
              style={{
                backgroundColor: "#fff",
                padding: "22px",
                borderRadius: "10px",
                width: "360px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
              }}
            >
              <h3 style={{ margin: 0, textAlign: "center", color: "#2e6999" }}>
                ✏️ Edit Receipt
              </h3>

              {/* Manual Receipt No */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={labelStyle}>Manual Receipt No</label>
                <input
                  type="text"
                  placeholder="Enter manual receipt no"
                  value={newManualSlNo}
                  onChange={(e) => setNewManualSlNo(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Amount */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={labelStyle}>Amount (₹)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Enter amount"
                  value={newAmount}
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^0-9.]/g, "");
                    if ((val.match(/\./g) || []).length > 1) val = val.slice(0, -1);
                    setNewAmount(val);
                  }}
                  style={inputStyle}
                />
              </div>

              {/* Particular Nature */}
              {isVoucher && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={labelStyle}>Particular Nature</label>

                  <div
                    onClick={() => setShowNaturePopup(true)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #ccc",
                      cursor: "pointer",
                      background: "#fff",
                      fontWeight: "600"
                    }}
                  >
                    {newParticularNature || "Select / Add Particular Nature"}
                  </div>

                  {newParticularNature === "" && (
                    <input
                      type="text"
                      placeholder="Enter new particular nature"
                      value={customNature}
                      onChange={(e) => setCustomNature(e.target.value)}
                      style={{ ...inputStyle, marginTop: "6px" }}
                    />
                  )}
                </div>
              )}

              {showNaturePopup && (
                <div style={overlayStyle}>
                  <div style={popupStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <h3>Select Particular Nature</h3>
                      <button
                        onClick={() => setShowNaturePopup(false)}
                        style={{ ...closeBtn, style: "red" }} >✕
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="🔍 Search..."
                      value={natureSearch}
                      onChange={e => setNatureSearch(e.target.value)}
                      style={inputStyle}
                    />

                    <div style={{ maxHeight: "220px", overflowY: "auto" }}>
                      {filteredNatureOptions.map(p => (
                        <div
                          key={p}
                          onClick={() => {
                            setNewParticularNature(p);
                            setCustomNature("");
                            setShowNaturePopup(false);
                            setNatureSearch("");
                          }}
                          style={{ ...itemStyle }}
                        >
                          {p}
                        </div>
                      ))}

                      <div
                        onClick={() => {
                          setNewParticularNature("");
                          setCustomNature("");
                        }}
                        style={{ ...itemStyle, color: "#1890ff", fontWeight: "bold" }}
                      >
                        + Add New
                      </div>
                    </div>

                    {!filteredNatureOptions.length && (
                      <p style={{ textAlign: "center", fontSize: "13px" }}>No match found</p>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={labelStyle}>Description</label>
                <input
                  type="text"
                  placeholder="Enter description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Receipt Date */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={labelStyle}>Receipt Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Payment Mode */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={labelStyle}>Payment Mode</label>
                <select
                  value={newMode}
                  onChange={(e) => {
                    const selected = e.target.value;
                    setNewMode(selected);
                    if (selected !== "Cash") { setNewCashTo(""); }
                  }}
                  style={{
                    ...inputStyle,
                    backgroundColor: newMode ? "#eaf4ff" : "#fff",
                    fontWeight: newMode ? "600" : "normal",
                  }}
                >
                  <option value="">-- Select Mode --</option>
                  <option value="Cash">Cash</option>
                  {/* Bank names */}
                  {bankNames.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Cash To */}
              {newMode === "Cash" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={labelStyle}>Cash To</label>
                  <select
                    value={newCashTo}
                    onChange={(e) => setNewCashTo(e.target.value)}
                    style={{
                      ...inputStyle,
                      backgroundColor: newCashTo ? "#eaf4ff" : "#fff",
                      fontWeight: newCashTo ? "600" : "normal",
                    }}
                  >
                    <option value="">-- Select Cash Receiver --</option>
                    {cashToOptions
                      .filter(ct => ct !== "All")
                      .map(ct => (
                        <option key={ct} value={ct}>{ct}</option>
                      ))}
                  </select>
                </div>
              )}

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "10px",
                  gap: "10px"
                }}
              >
                <button
                  onClick={handleSave}
                  style={{
                    flex: 1,
                    padding: "8px",
                    background: "linear-gradient(180deg, #2ecc71, #27ae60)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  💾 Save
                </button>

                <button
                  onClick={() => setShowPopup(false)}
                  style={{
                    flex: 1,
                    padding: "8px",
                    background: "linear-gradient(180deg, #ff6b6b, #d63031)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  ✖ Cancel
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: "50px" }}></div>
      <BottomNavigationBar navigate={navigate} userAppType={userAppType} />
    </div>
  );
};

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  backgroundColor: "#00000000",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 99999,
};

const popupStyle = {
  background: "#fff",
  borderRadius: "10px",
  padding: "16px",
  width: "320px",
  maxHeight: "80vh",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
};

const closeBtn = {
  background: "transparent",
  border: "none",
  fontSize: "18px",
  cursor: "pointer",
  fontWeight: "bold",
};

const itemStyle = {
  padding: "8px 10px",
  borderBottom: "1px solid #eee",
  cursor: "pointer",
  fontSize: "14px",
};

const labelStyle = {
  fontSize: "13px",
  fontWeight: "600",
  color: "#333",
};

const inputStyle = {
  padding: "8px 10px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  fontSize: "14px",
  outline: "none",
};

export default MoneyReceipts;
