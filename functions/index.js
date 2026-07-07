const Razorpay = require("razorpay");
const { defineSecret } = require("firebase-functions/params");
const { onRequest } = require("firebase-functions/v2/https");

const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();



// ================== 🔐 RAZORPAY ==================
const razorpayKey = defineSecret("RAZORPAY_KEY");
const razorpaySecret = defineSecret("RAZORPAY_SECRET");

// Force redeployment to pick up latest secrets
exports.createRazorpayOrder = onRequest(
  {
    secrets: ["RAZORPAY_KEY", "RAZORPAY_SECRET"],
  },
  async (req, res) => {

    // ✅ CORS headers (FIRST THING)
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    // ✅ HANDLE PREFLIGHT
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    try {
      let body = req.body;

      if (!body || Object.keys(body).length === 0) {
        try {
          body = JSON.parse(req.rawBody.toString());
        } catch (e) {
          body = {};
        }
      }

      const { amount } = body;

      console.log("FINAL BODY:", body);
      console.log("AMOUNT:", amount);

      if (!amount) {
        return res.status(400).json({ error: "Amount required" });
      }

      const razorpay = new Razorpay({
        key_id: razorpayKey.value().trim(),
        key_secret: razorpaySecret.value().trim(),
      });

      const order = await razorpay.orders.create({
        amount: amount * 100,
        currency: "INR",
        receipt: "receipt_" + Date.now(),
      });

      return res.json(order);

    } catch (err) {
      console.error("FULL ERROR:", err?.error || err);
      return res.status(500).json({ error: "Failed to create order" });
    }
  }
);




// ================== 🔔 ENQUIRY ==================
exports.newEnquiryNotification = onDocumentWritten(
  "enquiry/{monthYear}",
  async (event) => {
    try {
      console.log("🚀 ENQUIRY FUNCTION TRIGGERED");

      const before = event.data?.before?.data() || {};
      const after = event.data?.after?.data() || {};

      // 🔥 ONLY NEW KEYS (STABLE)
      const newKeys = Object.keys(after).filter(
        key => key !== "lastUpdated" && !(key in before)
      );

      if (newKeys.length === 0) {
        console.log("❌ No new enquiry detected");
        return;
      }

      console.log("🔥 NEW KEYS:", newKeys);

      // ✅ Latest enquiry
      const latestKey = newKeys[newKeys.length - 1];
      const enquiry = after[latestKey];

      // 🔥 DATA EXTRACT
      const name = enquiry?.name || "Guest";
      const mobile = enquiry?.mobile1 || "";
      const functionTypes = Array.isArray(enquiry?.functionTypes)
        ? enquiry.functionTypes.join(", ")
        : "General";

      console.log("📌", name, mobile, functionTypes);

      // ✅ TOKENS
      const snap = await admin.firestore().collection("fcmTokens").get();

      const tokens = snap.docs
        .map(doc => doc.data().token)
        .filter(Boolean);

      if (tokens.length === 0) {
        console.log("❌ No tokens found");
        return;
      }
      const source = enquiry?.source || "App";
      const url = `https://jrenquiry.netlify.app/leadstabcontainer?tab=enquiry`;

      // ✅ SEND NOTIFICATION
      const res = await admin.messaging().sendEachForMulticast({
        tokens,

        data: {
          title: `📩 New Enquiry (${source})`,
          body: `👤 ${name}\n📞 ${mobile}\n🎉 ${functionTypes}`,
          url: url,
          mobile: mobile
        }
      });

      console.log("✅ SUCCESS COUNT:", res.successCount);
      console.log("❌ FAILURE COUNT:", res.failureCount);

    } catch (err) {
      console.error("🔥 FUNCTION ERROR:", err);
    }
  }
);




// ================== 🌊 WATERPARK ==================
exports.newWaterParkNotification = onDocumentWritten(
  "WaterPark/{monthYear}",
  async (event) => {
    try {
      console.log("🚀 WATERPARK FUNCTION TRIGGERED");

      const before = event.data?.before?.data() || {};
      const after = event.data?.after?.data() || {};

      // 🔥 ONLY NEW KEYS DETECT (FINAL FIX)
      const newKeys = Object.keys(after).filter(
        key => key !== "lastUpdated" && !(key in before)
      );

      if (newKeys.length === 0) {
        console.log("❌ No new WaterPark booking");
        return;
      }

      console.log("🔥 NEW WATERPARK KEYS:", newKeys);

      // ✅ latest booking pick
      const latestKey = newKeys[newKeys.length - 1];
      const booking = after[latestKey];

      const name = booking?.name || "Guest";
      const mobile = booking?.phone || "";
      const total = booking?.tickets?.total || "";

      console.log("📌", name, mobile, total);

      // ✅ tokens
      const snap = await admin.firestore().collection("fcmTokens").get();

      const tokens = snap.docs
        .map(doc => doc.data().token)
        .filter(Boolean);

      if (tokens.length === 0) {
        console.log("❌ No tokens found");
        return;
      }

      const url = `https://jrenquiry.netlify.app/leadstabcontainer?tab=waterpark`;

      const res = await admin.messaging().sendEachForMulticast({
        tokens,

        data: {
          title: "🌊 WaterPark Booking",
          body: `👤 ${name}\n📞 ${mobile}\n💰 ₹${total}`,
          url: url,
          mobile: mobile
        }
      });

      console.log("✅ WATERPARK SUCCESS:", res.successCount);
      console.log("❌ WATERPARK FAIL:", res.failureCount);

    } catch (err) {
      console.error("🔥 WATERPARK ERROR:", err);
    }
  }
);