


import React, { useEffect, useState, useCallback, useRef } from 'react';


import '../styles/MoneyReceipts.css';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

import BackButton from "../components/BackButton";
import BottomNavigationBar from "../components/BottomNavigationBar";
import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";
import { db, getAuth } from "../firebaseConfig";



const MoneyReceipts = () => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState([]);
  const [search, setSearch] = useState('');
  const location = useLocation();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedFY, setSelectedFY] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [userAppType, setUserAppType] = useState(null);
  const [bankNames, setBankNames] = useState([]);
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [sortKey, setSortKey] = useState("receiptDate");
  const [typeFilter, setTypeFilter] = useState([]);
  const [modeFilter, setModeFilter] = useState([]);
  const [creditDebitFilter, setCreditDebitFilter] = useState([]);
  const [cashToFilter, setCashToFilter] = useState([]);
  const [financialYears, setFinancialYears] = useState([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

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

          const aDate = a.receiptDate ? new Date(a.receiptDate).getTime() : 0;
          const bDate = b.receiptDate ? new Date(b.receiptDate).getTime() : 0;

          // 1️⃣ Date comparison first
          if (aDate !== bDate) {
            return sortOrder === "asc"
              ? aDate - bDate
              : bDate - aDate;
          }

          // 2️⃣ Extract only digits from slNo
          const extractNumber = (value) => {
            if (!value) return 0;
            const digits = value.toString().match(/\d+/g); // get all digit groups
            return digits ? parseInt(digits.join(""), 10) : 0;
          };

          const aNum = extractNumber(a.slNo);
          const bNum = extractNumber(b.slNo);

          return sortOrder === "asc"
            ? aNum - bNum
            : bNum - aNum;
        });

        setReceipts(sorted);
      },
      (error) => {
        console.error("Error fetching receipts:", error);
      }
    );

    return () => unsubscribe();
  }, [sortOrder]);

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

  const finalReceipts = React.useMemo(() => {
    let result = receipts;

    // 🔍 Search
    if (debouncedSearch) {
      const s = debouncedSearch.toLowerCase();
      result = result.filter(r =>
        (r.customerName || "").toLowerCase().includes(s) ||
        (r.partyName || "").toLowerCase().includes(s) ||
        (r.mobile || "").toString().includes(debouncedSearch) ||
        (r.slNo || "").toString().toLowerCase().includes(s) ||
        (r.type || "").toLowerCase().includes(s) ||
        (r.particularNature || "").toLowerCase().includes(s) ||
        (r.description || "").toLowerCase().includes(s) ||
        (r.amount || "").toString().includes(debouncedSearch) ||
        (r.receiptDate || "").toString().toLowerCase().includes(s)
      );
    }

    // Receipt type
    if (typeFilter.length > 0 && !typeFilter.includes('All')) {
      result = result.filter(r =>
        typeFilter.some(type =>
          (type === 'Cash' && r.type === 'Cash') ||
          (type === 'Bank' && r.type === 'Money Receipt') ||
          (type === 'Voucher' && r.type === 'Voucher') ||
          (type === 'Refund' && r.paymentFor === 'Refund') ||
          (type === 'BankCash' && (r.type === 'Cash' || r.type === 'Money Receipt'))
        )
      );
    }

    // Mode filter
    if (modeFilter.length > 0 && !modeFilter.includes('All')) {
      result = result.filter(r =>
        modeFilter.includes(r.mode)
      );
    }

    // Cash To
    if (cashToFilter.length > 0) {
      result = result.filter(r =>
        cashToFilter.includes(r.cashTo)
      );
    }

    // Date range
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom) : null;
      const to = dateTo ? new Date(dateTo) : null;

      result = result.filter(r => {
        if (!r.receiptDate) return true;
        const d = new Date(r.receiptDate);
        return (!from || d >= from) && (!to || d <= to);
      });
    }

    // Financial year
    if (selectedFY) {
      const [start, end] = selectedFY.split('-').map(Number);
      const fyStart = new Date(start, 3, 1);
      const fyEnd = new Date(end, 2, 31, 23, 59, 59);

      result = result.filter(r => {
        if (!r.receiptDate) return true;
        const d = new Date(r.receiptDate);
        return d >= fyStart && d <= fyEnd;
      });
    }

    // Credit / Debit
    if (creditDebitFilter.length > 0 && !creditDebitFilter.includes("All")) {
      result = result.filter(r =>
        creditDebitFilter.includes(r.paymentFor)
      );
    }

    return result;
  }, [
    receipts,
    debouncedSearch,
    typeFilter,
    modeFilter,
    cashToFilter,
    dateFrom,
    dateTo,
    selectedFY,
    creditDebitFilter,
  ]);

  const cashToOptions = React.useMemo(() => {
    const set = new Set();

    receipts.forEach(r => {
      if (r.mode === "Cash" && r.cashTo) {
        set.add(r.cashTo);
      }
    });

    return Array.from(set);
  }, [receipts]);

  const formatDate = (date) => {
    if (!date) return "-";

    const d = new Date(date);

    return d.toLocaleDateString("en-GB", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).replace(/\//g, "-");
  };

  const getDisplayName = (receipt) => {
    return (receipt.customerPrefix || '') + ' ' +
      (receipt.customerName || receipt.partyName || '-');
  };

  const handlePrint = useCallback(async (receipt) => {
    const auth = getAuth();
    const user = auth.currentUser;

    // Default values in case fetch fails
    let firmName = "Shangri-La Palace";
    let address = "A Unit of the Patli Hospitality LLP";
    let contactNo = "Mob. No. - 7004298385, 9334310274, 9234505587";

    if (user) {
      try {
        const userRef = doc(db, "usersAccess", user.email);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data.accessToApp === "A") {
            firmName = data.firmName || firmName;
            address = data.address || address;
            contactNo = data.contactNo || contactNo;
          }
        }
      } catch (err) {
        console.error("Error fetching user info:", err);
      }
    }

    const partyName = getDisplayName(receipt).trim();

    const content = `
  <html>
  <head>
    <title>Receipt - #${receipt.slNo}</title>
    <style>
      body {
        font-family: 'Calibri', sans-serif;
        color: #3c0000;
        font-size: 20px;
        padding: 0px;
      }
      .header-title {
        text-align: center;
        font-weight: bold;
        font-size: 19px;
        color: #3c0000;
      }
      .main-title {
        text-align: center;
        font-size: 38px;
        font-weight: bold;
        margin-top: 5px;
        color: maroon;
      }
      .sub-header {
        text-align: center;
        font-size: 15px;
        margin: 1px 0;
      }
      .line-group {
        display: flex;
        justify-content: space-between;
        margin-top: 20px;
      }
      .section {
        margin: 10px 0;
        display: flex;
        gap: 8px;
      }
      .underline {
        flex-grow: 1;
        border-bottom: 1px dotted #000;
        min-width: 150px;
      }
      .short-underline {
        display: inline-block;
        border-bottom: 1px dotted #000;
        min-width: 100px;
      }

      .payment-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 30px;
      }

      .payment-table {
        border: 1px solid maroon;
        border-collapse: collapse;
        font-size: 18px;
      }
      .payment-table th,
      .payment-table td {
        border: 1px solid maroon;
        padding: 2px 8px;
        text-align: center;
        min-width: 80px;
      }

      .rs-combo {
        display: flex;
        align-items: center;
      }

      .circle-rs {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: transparent;
        color: #3c0000;
        font-size: 30px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .bramount-box {
        border: 1px solid maroon;
        border: 1px solid maroon;
        padding: 1px 1px;
        font-weight: bold;
        min-width: 100px;
        font-size: 14px;
      }
      .amount-box {
        border: 1px solid maroon;
        border: 1px solid maroon;
        padding: 6px 14px;
        font-weight: bold;
        min-width: 100px;
        font-size: 30px;
      }

      .signature {
        font-weight: bold;
        font-size: 18px;
        text-align: right;
        margin-top: 20px;
      }
          .italic {
    font-style: italic;
  }
    </style>
  </head>
  <body>
   <div style="border: 1px solid maroon; padding: 1px">
    <div style="border: 1px solid maroon; padding: 30px">
    <div class="header-title">MONEY RECEIPT</div>
  <div class="main-title">${firmName}</div>
      <div class="sub-header">${address}</div>
      <div class="sub-header">${contactNo}</div>
      
    <div class="line-group">
      <div>No. <span>${receipt.slNo}</span></div>
      <div>Date <span class="short-underline">${new Date(receipt.receiptDate).toLocaleDateString('en-GB')}</span></div>
    </div>

    <div class="section italic">Received with thanks from <div class="underline">${partyName}</div></div>
    <div class="section italic "><span>Mob.:</span><div class="underline">${receipt.mobile || '-'}</div></div>
    <div class="section italic ">a sum of Rs. <div class="underline">₹${receipt.amountWords || '-'}</div></div>
    <div class="section italic ">
      for event of <div class="underline">${receipt.eventType || '-'}</div>
      <span style="margin-left:auto;">Dated <span class="short-underline">${new Date(receipt.eventDate).toLocaleDateString('en-GB')}</span></span>
    </div>

    <div class="payment-row">
      <!-- LEFT PAYMENT MODE TABLE -->
      <table class="payment-table">
        <tr><th colspan="2">Payment Mode</th></tr>
        <tr>
          <td class="italic ">${receipt.mode === 'Cash' ? '☑️ Cash' : 'Cash'}</td>
          <td className="italic">
${bankNames.includes(receipt.mode) ? '☑️ RTGS/NEFT' : 'RTGS/NEFT'}
          </td>
        </tr>
        <tr>
          <td class="italic ">${receipt.mode === 'Cheque' ? '☑️ Cheque' : 'Cheque'}</td>
          <td class="italic ">${receipt.mode === 'Card' ? '☑️ Card' : 'Card'}</td>
        </tr>
      </table>

      <!-- MIDDLE ₹ SYMBOL + AMOUNT IN BOX -->
      <div class="rs-combo">
        <div class="circle-rs">₹</div>
       <div class="bramount-box"> <div class="amount-box">${Number(receipt.amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    })} </div> </div>
      </div>

      <!-- RIGHT SIGNATURE -->
      <div class="signature">
      Issued By: <span class="short-underline">${receipt.receiverd || receipt.senderd || 'Accounts Dept.'}</span>
        </div>
      </div>
     </div>
    </div>
  </body>
  </html>
  `;

    // Check if iframe exists, otherwise create it
    let iframe = document.getElementById("print-frame");
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "print-frame";
      iframe.style.display = "none";
      document.body.appendChild(iframe);
    }

    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(content);
    iframeDoc.close();


    iframe.onload = function () {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    };
  }, [bankNames]);

  const handlePrintCash = useCallback((receipt) => {
    const partyName = getDisplayName(receipt).trim();

    const content = `
  <html>
  <head>
    <title>Receipt - #${receipt.slNo}</title>
    <style>
      body {
        font-family: 'Calibri', sans-serif;
        color: #000e3cff;
        font-size: 20px;
        padding: 0px;
      }
      .header-title {
        text-align: center;
        font-weight: bold;
        font-size: 19px;
        color: #000e3cff;
      }
      .main-title {
        text-align: center;
        font-size: 38px;
        font-weight: bold;
        margin-top: 5px;
        color: maroon;
      }
      .sub-header {
        text-align: center;
        font-size: 15px;
        margin: 1px 0;
      }
      .line-group {
        display: flex;
        justify-content: space-between;
        margin-top: 20px;
      }
      .section {
        margin: 10px 0;
        display: flex;
        gap: 8px;
      }
      .underline {
        flex-grow: 1;
        border-bottom: 1px dotted #000e3cff;
        min-width: 150px;
      }
      .short-underline {
        display: inline-block;
        border-bottom: 1px dotted #000e3cff;
        min-width: 100px;
      }

      .payment-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 30px;
      }

      .payment-table {
        border: 1px solid maroon;
        border-collapse: collapse;
        font-size: 18px;
      }
      .payment-table th,
      .payment-table td {
        border: 1px solid maroon;
        padding: 2px 8px;
        text-align: center;
        min-width: 80px;
      }

      .rs-combo {
        display: flex;
        align-items: center;
      }

      .circle-rs {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: transparent;
        color: #000e3cff;
        font-size: 30px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .bramount-box {
        border: 1px solid maroon;
        border: 1px solid maroon;
        padding: 1px 1px;
        font-weight: bold;
        min-width: 100px;
        font-size: 14px;
      }
      .amount-box {
        border: 1px solid maroon;
        border: 1px solid maroon;
        padding: 6px 14px;
        font-weight: bold;
        min-width: 100px;
        font-size: 30px;
      }

      .signature {
        font-weight: bold;
        font-size: 18px;
        text-align: right;
        margin-top: 20px;
      }
          .italic {
    font-style: italic;
  }
    </style>
  </head>
  <body>
   <div style="border: 1px solid maroon; padding: 1px">
    <div style="border: 1px solid maroon; padding: 30px">
    <div class="header-title">MONEY RECEIPT</div>
    

    <div class="line-group">
      <div>No. <span>${receipt.slNo}</span></div>
      <div>Date <span class="short-underline">${new Date(receipt.receiptDate).toLocaleDateString('en-GB')}</span></div>
    </div>

    <div class="section italic">Received with thanks from <div class="underline">${partyName}</div></div>
    <div class="section italic "><span>Mob.:</span><div class="underline">${receipt.mobile || '-'}</div></div>
    <div class="section italic ">a sum of Rs. <div class="underline">₹${receipt.amountWords || '-'}</div></div>
    <div class="section italic ">
      for event of <div class="underline">${receipt.eventType || '-'}</div>
      <span style="margin-left:auto;">Dated <span class="short-underline">${new Date(receipt.eventDate).toLocaleDateString('en-GB')}</span></span>
    </div>

    <div class="payment-row">
      <!-- LEFT PAYMENT MODE TABLE -->
      <table class="payment-table">
        <tr><th colspan="2">Payment Mode</th></tr>
        <tr>
          <td class="italic ">${receipt.mode === 'Cash' ? '☑️ Cash' : 'Cash'}</td>
          <td className="italic">
${bankNames.includes(receipt.mode) ? '☑️ RTGS/NEFT' : 'RTGS/NEFT'}
          </td>        
        </tr>
        <tr>
          <td class="italic ">${receipt.mode === 'Cheque' ? '☑️ Cheque' : 'Cheque'}</td>
          <td class="italic ">${receipt.mode === 'Card' ? '☑️ Card' : 'Card'}</td>
        </tr>
      </table>

      <!-- MIDDLE ₹ SYMBOL + AMOUNT IN BOX -->
      <div class="rs-combo">
        <div class="circle-rs">₹</div>
       <div class="bramount-box"> <div class="amount-box">${receipt.amount !== undefined && receipt.amount !== null
        ? receipt.amount.toLocaleString("en-IN")
        : "-"}</div> </div>
      </div>

      <!-- RIGHT SIGNATURE -->
      <div class="signature">
      <div> Issued By:  </div>

        <span class="short-underline">${receipt.receiverd || receipt.senderd || 'Accounts Dept.'}</span>
      </div>
      </div>
     </div>
    </div>
  </body>
  </html>
  `;

    let iframe = document.getElementById("print-frame");
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "print-frame";
      iframe.style.display = "none";
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(content);
    doc.close();

    iframe.onload = function () {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    };

  }, [bankNames]);

  const handlePrintOther = useCallback((receipt) => {
    const label = receipt.paymentFor === 'Credit' ? 'Received with thanks from' : 'Paid to';
    const partyName = getDisplayName(receipt).trim();
    const description = receipt.description || '-';
    const particularNature = receipt.particularNature || '-';
    const receiptDate = receipt.receiptDate ? new Date(receipt.receiptDate).toLocaleDateString('en-GB') : '-';

    const content = `
<html>
  <head>
    <title>Receipt #${receipt.slNo}</title>
    <style>
      body {
        font-family: 'Calibri', sans-serif;
        color: #3c0000;
        font-size: 20px;
        padding: 0px;
      }
      .header-title {
        text-align: center;
        font-weight: bold;
        font-size: 19px;
        color: #3c0000;
      }
      .section {
        margin: 10px 0;
        display: flex;
        gap: 8px;
        font-size: 18px;
      }
      .underline {
        flex-grow: 1;
        border-bottom: 1px dotted #000;
        min-width: 150px;
      }
      .short-underline {
        display: inline-block;
        border-bottom: 1px dotted #000;
        min-width: 100px;
      }
      .italic {
        font-style: italic;
      }
      .payment-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 30px;
      }
      .payment-table {
        border: 1px solid maroon;
        border-collapse: collapse;
        font-size: 18px;
      }
      .payment-table th,
      .payment-table td {
        border: 1px solid maroon;
        padding: 2px 8px;
        text-align: center;
        min-width: 80px;
      }
      .rs-combo {
        display: flex;
        align-items: center;
      }
      .circle-rs {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: transparent;
        color: #3c0000;
        font-size: 30px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .bramount-box {
        border: 1px solid maroon;
        padding: 1px 1px;
        font-weight: bold;
        min-width: 100px;
        font-size: 14px;
      }
      .amount-box {
        border: 1px solid maroon;
        padding: 6px 14px;
        font-weight: bold;
        min-width: 100px;
        font-size: 30px;
      }
      .signature {
        font-weight: bold;
        font-size: 18px;
        text-align: right;
        margin-top: 20px;
      }
    </style>
  </head>
  <body>
    <div style="border: 1px solid maroon; padding: 1px">
      <div style="border: 1px solid maroon; padding: 30px">
        <div class="header-title">VOUCHER RECEIPT</div>

        <div class="section">
          Sl No. <span class="short-underline">${receipt.slNo}</span>
          <span style="margin-left:auto;">Date <span class="short-underline">${receiptDate}</span></span>
        </div>

        <div class="section italic">${label} <div class="underline">${partyName}</div></div>
        <div class="section italic">Mobile No. <div class="underline">${receipt.mobile}</div></div>
        <div class="section italic">a sum of Rs. <div class="underline">₹${receipt.amountWords}</div></div>
        <div class="section italic">Purpose/Description: <div class="underline">${particularNature}, ${description}</div></div>

        <div class="payment-row">
          <!-- LEFT TABLE -->
          <table class="payment-table">
            <tr><th colspan="2">Payment Mode</th></tr>
            <tr>
              <td class="italic">${receipt.mode === 'Cash' ? '☑️ Cash' : 'Cash'}</td>
              <td className="italic">
${bankNames.includes(receipt.mode) ? '☑️ RTGS/NEFT' : 'RTGS/NEFT'}
             </td>            
          </tr>
            <tr>
              <td class="italic">${receipt.mode === 'Cheque' ? '☑️ Cheque' : 'Cheque'}</td>
              <td class="italic">${receipt.mode === 'Card' ? '☑️ Card' : 'Card'}</td>
            </tr>
          </table>

          <!-- MIDDLE ₹ SYMBOL + AMOUNT -->
          <div class="rs-combo">
            <div class="circle-rs">₹</div>
            <div class="bramount-box">
              <div class="amount-box">${parseFloat(receipt.amount).toLocaleString('en-IN')}</div>
            </div>
          </div>

          <!-- RIGHT SIGNATURE -->
          <div class="signature">
             Issued By: <span class="short-underline">${'Accounts Dept.'}</span>

          </div>
        </div>
      </div>
    </div>
  </body>
</html>
  `;

    let iframe = document.getElementById("print-frame");
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "print-frame";
      iframe.style.display = "none";
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(content);
    doc.close();

    iframe.onload = function () {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    };

  }, [bankNames]);

  useEffect(() => {
    const receipt = location.state?.printReceipt;
    if (receipt) {
      if (receipt.type === 'Other') {
        handlePrintOther(receipt);
      } else if (receipt.type === 'Cash') {
        handlePrintCash(receipt);
      } else {
        handlePrint(receipt);
      }
    }
  }, [location.state, handlePrint, handlePrintCash, handlePrintOther]);

  const { totalCredit, totalDebit } = React.useMemo(() => {
    let credit = 0, debit = 0;
    finalReceipts.forEach(r => {
      const amt = Number(r.amount || 0);
      if (r.paymentFor === "Credit") credit += amt;
      if (r.paymentFor === "Debit") debit += amt;
    });
    return { totalCredit: credit, totalDebit: debit };
  }, [finalReceipts]);

  const balance = totalCredit - totalDebit;

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
    const { from, to } = getCurrentMonthAndFY();

    setDateFrom(from);
    setDateTo(to);
    // setSelectedFY(fy);
  }, []);

  const toggleSelection = (value, state, setState) => {
    if (state.includes(value)) {
      setState(state.filter(v => v !== value));
    } else {
      setState([...state, value]);
    }
  };

  useEffect(() => {
    // Agar Cash mode select nahi hai
    if (!modeFilter.includes("Cash")) {
      setCashToFilter([]); // Cash To reset
    }
  }, [modeFilter]);

  const tableRows = React.useMemo(() => {
    const sortedReceipts = finalReceipts;
    let balance = 0;
    const runningBalances = [];

    for (let i = sortedReceipts.length - 1; i >= 0; i--) {
      const r = sortedReceipts[i];
      const amount = Number(r.amount || 0);

      if (r.paymentFor === "Credit") balance += amount;
      else if (r.paymentFor === "Debit") balance -= amount;

      runningBalances[i] = balance;
    }

    return sortedReceipts.map((r, index) => {
      const isCredit = r.paymentFor === "Credit";
      const isDebit = r.paymentFor === "Debit";

      const displayType =
        r.type === "Money Receipt" || r.type === "Cash"
          ? "MR"
          : r.type === "Voucher"
            ? "Voucher"
            : r.type;

      return (
        <tr
          key={r.id + "_" + index}
          style={{
            backgroundColor: index % 2 === 0 ? "#ffffff" : "#eaf4ff",
            color:
              r.approval === "Rejected"
                ? "black"
                : isCredit
                  ? "green"
                  : isDebit
                    ? "red"
                    : "black",
            fontWeight: '700'
          }}
        >
          <td style={{ fontWeight: "bold", color: 'black', backgroundColor: index % 2 === 0 ? "#ffffff" : "#eaf4ff", }}>
            {finalReceipts.length - index}.
          </td>
          <td style={{ backgroundColor: index % 2 === 0 ? "#ffffff" : "#eaf4ff", }}>{r.receiptDate ? formatDate(r.receiptDate) : ''}</td>
          <td style={{ backgroundColor: index % 2 === 0 ? "#ffffff" : "#eaf4ff", }}>
            {["Event Royalty", "Decoration Royalty"].includes(r.particularNature)
              ? r.particularNature
              : (r.eventType || r.particularNature)}
          </td>
          <td style={{ backgroundColor: index % 2 === 0 ? "#ffffff" : "#eaf4ff", }}>{displayType}</td>
          <td style={{ backgroundColor: index % 2 === 0 ? "#ffffff" : "#eaf4ff", }}>{r.customerName || r.partyName}</td>
          <td style={{ backgroundColor: index % 2 === 0 ? "#ffffff" : "#eaf4ff", }}>{r.mode || ""}</td>
          <td style={{ backgroundColor: index % 2 === 0 ? "#ffffff" : "#eaf4ff", }}>{r.cashTo || ""}</td>


          <td style={{ fontWeight: "bold", backgroundColor: index % 2 === 0 ? "#ffffff" : "#eaf4ff", width: "fit-content", }}>#{r.slNo}</td>
          <td style={{ fontWeight: "bold", width: "fit-content", backgroundColor: index % 2 === 0 ? "#ffffff" : "#eaf4ff", }}>{r.manualSlNo}</td>
          <td>{r.description ? r.description : "Advance Payment"}</td>
          <td>{r.paymentFor === "Credit" ? r.paymentFor : ""}</td>
          <td>{r.paymentFor === "Debit" ? r.paymentFor : ""}</td>
          <td>{r.mobile}</td>
          <td >{r.eventDate ? formatDate(r.eventDate) : ''}</td>
          <td>
            ₹{Number(r.amount || 0).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </td>
          {/* Print button */}
          <td>
            {r.slNo?.toString().startsWith("C") ? (
              <button
                onClick={() => {
                  if (r.approval !== "Accepted") {
                    alert("❌ Printing not allowed — approval is not granted.");
                    return;
                  }
                  handlePrintCash(r);
                }}
                style={{
                  background: r.approval === "Accepted" ? "#b52e2e" : "#888",
                  color: "#fff",
                  padding: "5px 10px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: r.approval === "Accepted" ? "pointer" : "not-allowed",
                }}
                disabled={r.approval !== "Accepted"}
              >
                Print
              </button>
            ) : (
              <button
                onClick={() => {
                  if (r.approval !== "Accepted") {
                    alert("❌ Printing not allowed — approval is not granted.");
                    return;
                  }
                  r.eventDate ? handlePrint(r) : handlePrintOther(r);
                }}
                style={{
                  background: r.approval === "Accepted" ? "#b52e2e" : "#888",
                  color: "#fff",
                  padding: "5px 10px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: r.approval === "Accepted" ? "pointer" : "not-allowed",
                }}
                disabled={r.approval !== "Accepted"}
              >
                Print
              </button>
            )}
          </td>
        </tr>
      );
    });
  }, [
    finalReceipts,
    handlePrint,
    handlePrintCash,
    handlePrintOther
  ]);

  return (
    <div className="page-scroller">
      <div className="receipts-container" style={{ margin: "0px" }}>
        <div style={{ marginBottom: '0px' }}> <BackButton /> </div>

        <div style={{ marginBottom: '10px' }}>
          <h2 className="title">Print Receipts</h2>
        </div>

        <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'right', alignItems: 'center', gap: '10px' }}>

          <div className="search-wrapper">
            <input
              type="text"
              placeholder="🔍 Search by Sl No., Type, name, mobile, event or date"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />

            {search && (
              <button
                className="clear-btn-cross"
                onClick={() => setSearch("")}
                type="button"
              >
                ✖
              </button>
            )}
          </div>

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

          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', margin: "15px 0px" }}>

          <div>
            <p style={{ fontWeight: '600', margin: "0px", marginBottom: '10px' }}>Receipt Type</p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>

              <button
                onClick={() => setTypeFilter([])}
                style={{
                  background: typeFilter.length === 0 ? '#2e6999' : '#b3b3b3',
                  color: '#fff',
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: '4px'
                }}>
                All
              </button>

              <button
                onClick={() => toggleSelection('Bank', typeFilter, setTypeFilter)}
                style={{
                  background: typeFilter.includes('Bank') ? '#2e6999' : '#b3b3b3',
                  color: '#fff',
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: '4px'
                }}>
                MR Bank
              </button>

              <button
                onClick={() => toggleSelection('Cash', typeFilter, setTypeFilter)}
                style={{
                  background: typeFilter.includes('Cash') ? '#2e6999' : '#b3b3b3',
                  color: '#fff',
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: '4px'
                }}>
                MR Cash
              </button>

              <button
                onClick={() => toggleSelection('Refund', typeFilter, setTypeFilter)}
                style={{
                  background: typeFilter.includes('Refund') ? '#2e6999' : '#b3b3b3',
                  color: '#fff',
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: '4px'
                }}>
                MR Refund
              </button>

              <button
                onClick={() => toggleSelection('Voucher', typeFilter, setTypeFilter)}
                style={{
                  background: typeFilter.includes('Voucher') ? '#2e6999' : '#b3b3b3',
                  color: '#fff',
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: '4px'
                }}>
                Voucher
              </button>

            </div>
          </div>

          <div>
            <p style={{ fontWeight: '600', margin: "0px", marginBottom: '10px' }}>
              Credit / Debit
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>

              <button
                onClick={() => toggleSelection('Credit', creditDebitFilter, setCreditDebitFilter)}
                style={{
                  background: creditDebitFilter.includes('Credit') ? '#2e6999' : '#b3b3b3',
                  color: '#fff',
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: '4px'
                }}
              >
                Credit
              </button>

              <button
                onClick={() => toggleSelection('Debit', creditDebitFilter, setCreditDebitFilter)}
                style={{
                  background: creditDebitFilter.includes('Debit') ? '#2e6999' : '#b3b3b3',
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

          <div>
            <p style={{ fontWeight: '600', margin: "0px", marginBottom: '10px' }}>Payment Modes</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {/* {['All', ...bankNames, 'Cash', 'Card', 'Cheque'].map(mode => ( */}
              {[...bankNames, 'Cash'].map(mode => (

                <button
                  key={mode}
                  onClick={() => toggleSelection(mode, modeFilter, setModeFilter)}
                  style={{
                    background: modeFilter.includes(mode) ? '#2e6999' : '#b3b3b3',
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

          {modeFilter.includes("Cash") && (
            <div>
              <p style={{ fontWeight: '600', margin: "0px", marginBottom: '10px' }}>Cash To</p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {cashToOptions.map(ct => (
                  <button
                    key={ct}
                    onClick={() => toggleSelection(ct, cashToFilter, setCashToFilter)}
                    style={{
                      background: cashToFilter.includes(ct) ? '#2e6999' : '#b3b3b3',
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

        {/* date from to  */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: "10px",
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

          <div className='dateFromToFilters' style={{ display: "none", alignItems: "center" }}>
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
          <span style={{ color: "green" }} >Credit: <span > ₹{totalCredit.toLocaleString("en-IN")} </span> </span>
          <span style={{ color: "red" }}  >Debit: <span > ₹{totalDebit.toLocaleString("en-IN")} </span> </span>
          <span style={{ color: "black" }}  >Balance: <span > ₹{balance.toLocaleString("en-IN")} </span> </span>
        </div>

        {/* Table */}
        <div className="leads-table-container" style={{ padding: "0px" }}>
          <div className="table-fixed-wrapper" ref={rightRef}>
            <table className="leads-table">
              <thead>
                <tr>
                  <th>SL</th>
                  <th
                    style={{
                      cursor: "pointer",
                      padding: '0px 2px',
                    }}

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
                  <th>Receipt Type</th>
                  <th>Name</th>
                  <th>Mode</th>
                  <th>Cash-Via</th>
                  <th>Auto Sl.No</th>
                  <th>Manual Sl.No</th>
                  <th>Description</th>
                  <th>Credit</th>
                  <th>Debit</th>
                  <th>Mobile</th>
                  <th>Function Date</th>
                  <th>Amount</th>
                  <th>Print</th>
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
      </div >

      <BottomNavigationBar navigate={navigate} userAppType={userAppType} />
    </div>
  );
};

export default MoneyReceipts; 