const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.newEnquiryNotification = functions.firestore
  .document("enquiry/{docId}")
  .onWrite(async (change, context) => {

    const before = change.before.exists ? change.before.data() : {};
    const after = change.after.exists ? change.after.data() : {};

    // 🔥 find NEW keys (actual new enquiry)
    const newKeys = Object.keys(after).filter(key => !before.hasOwnProperty(key));

    if (newKeys.length === 0) {
      console.log("❌ No new enquiry");
      return null;
    }

    console.log("🔥 New enquiry keys:", newKeys);

    const payload = {
      notification: {
        title: "📩 New Enquiry",
        body: `${newKeys.length} new enquiry added`
      }
    };

    const snap = await admin.firestore().collection("fcmTokens").get();

    const tokens = [];
    snap.forEach(doc => tokens.push(doc.data().token));

    console.log("TOKENS:", tokens);

    if (tokens.length === 0) return null;

    return admin.messaging().sendToDevice(tokens, payload);
  });