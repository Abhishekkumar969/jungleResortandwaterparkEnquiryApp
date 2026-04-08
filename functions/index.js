const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

exports.newEnquiryNotification = onDocumentWritten(
  "enquiry/{monthYear}",
  async (event) => {

    const before = event.data?.before?.data() || {};
    const after = event.data?.after?.data() || {};

    const newKeys = Object.keys(after).filter(key => !before[key]);

    if (newKeys.length === 0) {
      console.log("❌ No new enquiry detected");
      return;
    }

    console.log("🔥 NEW KEYS:", newKeys);

    const snap = await admin.firestore().collection("fcmTokens").get();

    const tokens = [];
    snap.forEach(doc => tokens.push(doc.data().token));

    console.log("TOKENS:", tokens);

    if (tokens.length === 0) return;

    // ✅ NEW METHOD
    const res = await admin.messaging().sendEachForMulticast({
      tokens: tokens,
      notification: {
        title: "📩 New Enquiry",
        body: `${newKeys.length} new enquiry added`
      }
    });

    console.log("✅ FCM RESPONSE:", res);
  }
);