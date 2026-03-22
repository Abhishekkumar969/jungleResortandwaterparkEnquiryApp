import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';

const LeadSummary = forwardRef(({
    selectedMenus,
    hallCharges,
    gstBase,
    setGstBase,
    setTotalAmount,
    setGstAmount,
    setGrandTotal,
    meals,
    setSummaryData
}, ref) => {

    const [manualGst, setManualGst] = useState("");
    const [gstMode, setGstMode] = useState("auto");

    useImperativeHandle(ref, () => ({
        validateSummary: () => true
    }));

    // ✅ Calculate meal total across days
    const mealTotal = useMemo(() => {
        if (!meals) return 0;

        return Object.values(meals).reduce((daySum, dayMeals) => {
            if (!dayMeals || typeof dayMeals !== "object") return daySum;

            const totalForDay = Object.values(dayMeals).reduce((mealSum, meal) => {
                if (meal && typeof meal === "object") {
                    // Use total if present, otherwise fallback to pax * rate
                    const mealAmount = meal.total ?? (parseFloat(meal.pax || 0) * parseFloat(meal.rate || 0));
                    return mealSum + mealAmount;
                }
                return mealSum;
            }, 0);

            return daySum + totalForDay;
        }, 0);
    }, [meals]);

    // ✅ Always derive summaries from props + mealTotal
    const summaries = useMemo(() => {
        const hall = parseFloat(hallCharges || 0);

        const gstAmount =
            gstMode === "manual"
                ? parseFloat(manualGst || 0)
                : parseFloat(gstBase || 0) * 0.18;

        return Object.entries(selectedMenus).map(([menuName, item]) => {
            const total = parseFloat(item?.total || 0);
            const grandTotal = total + hall + mealTotal + gstAmount;

            return {
                menuName,
                menuTotal: total,
                mealTotal,
                gstBase: gstBase !== "" ? parseFloat(gstBase) : 0,
                gstAmount,
                grandTotal
            };
        });
    }, [selectedMenus, hallCharges, gstBase, mealTotal, manualGst, gstMode]);

    // ✅ push data to parent when summaries change
    useEffect(() => {
        const totalAmount = summaries.reduce((sum, cur) => sum + cur.menuTotal, 0);

        const gstAmount =
            gstMode === "manual"
                ? parseFloat(manualGst || 0)
                : parseFloat(gstBase || 0) * 0.18;

        const grandTotalAll = summaries.reduce((sum, cur) => sum + cur.grandTotal, 0);

        setTotalAmount(totalAmount);
        setGstAmount(gstAmount);
        setGrandTotal(grandTotalAll);
        setSummaryData(summaries);
        console.log("MealTotal Updated 👉", mealTotal, "Summaries 👉", summaries);
    }, [summaries, gstBase, mealTotal, gstMode, setTotalAmount, setGstAmount, setGrandTotal, setSummaryData, manualGst]);

    const formatIndianNumber = (value, maxDecimals = 2) => {
        if (value === "" || value === null || value === undefined) return "";

        const str = value.toString();

        // typing support like "12."
        if (str.endsWith(".")) return str;

        const [intPart, decimalPart] = str.split(".");
        const formattedInt = Number(intPart || 0).toLocaleString("en-IN");

        if (decimalPart !== undefined) {
            return `${formattedInt}.${decimalPart.slice(0, maxDecimals)}`;
        }

        return formattedInt;
    };

    return (
        <div style={{ marginTop: '20px' }}>
            {summaries.map(({ menuName, menuTotal, grandTotal }) => {
                const hall = parseFloat(hallCharges || 0);

                return (
                    <div
                        key={menuName}
                        className="summary-section"
                        style={{
                            padding: '16px',
                            border: '1px solid #ccc',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            backgroundColor: '#f9f9f9',
                        }}
                    >
                        <h4>Summary for: {menuName}</h4>

                        <div className="form-group">
                            <label>{menuName}</label>
                            <input
                                type="text"
                                value={formatIndianNumber(menuTotal)}
                                disabled
                            />
                        </div>


                        <div className="form-group">
                            <label>Meal Amount</label>
                            <input
                                type="text"
                                value={formatIndianNumber(mealTotal)}
                                disabled />
                        </div>

                        <div className="form-group">
                            <label>Venue Charges</label>
                            <input type="text" value={formatIndianNumber(hall, 0)} disabled />
                        </div>

                        <div className="form-group">
                            <label>Total (Menu + Meal + Venue)</label>
                            <input
                                type="text"
                                value={formatIndianNumber(
                                    (menuTotal + hall + mealTotal).toFixed(2),
                                    2
                                )}
                                disabled
                            />
                        </div>

                        <div className="form-group">
                            <label>GST Applicable Amount</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={formatIndianNumber(gstBase || "")}
                                onChange={(e) => {
                                    let val = e.target.value.replace(/,/g, "");

                                    if (!/^\d*(\.\d{0,2})?$/.test(val)) return;

                                    setGstMode("auto");     // 👈 IMPORTANT
                                    setGstBase(val);
                                    setManualGst("");       // 👈 manual reset
                                }}
                            />
                        </div>

                        <div className="form-group">
                            <label>GST (18%)</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={
                                    gstMode === "manual"
                                        ? formatIndianNumber(manualGst || "")
                                        : formatIndianNumber((Number(gstBase || 0) * 0.18).toFixed(2))
                                }
                                onChange={(e) => {
                                    let val = e.target.value.replace(/,/g, "");

                                    if (!/^\d*(\.\d{0,2})?$/.test(val)) return;

                                    setGstMode("manual");   // 👈 switch mode

                                    // ✅ empty ko empty rehne do
                                    if (val === "") {
                                        setManualGst("");
                                        setGstBase("");
                                        return;
                                    }

                                    setManualGst(val);

                                    // 👇 base sirf calculation ke liye
                                    const num = Number(val);
                                    if (!isNaN(num)) {
                                        setGstBase((num / 0.18).toFixed(2));
                                    }
                                }}
                            />
                        </div>


                        <div className="form-group">
                            <label>Grand Total (Menu + Venue + Meal + GST)</label>
                            <input
                                type="text"
                                value={formatIndianNumber((grandTotal || 0).toFixed(2))}
                                disabled
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

export default LeadSummary;
