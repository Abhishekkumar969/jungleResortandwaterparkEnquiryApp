const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.newEnquiryNotification = functions.firestore
  .document("enquiry/{docId}")
  .onUpdate(async (change, context) => {

    const before = change.before.data();
    const after = change.after.data();

    // 🔥 detect new field added
    const beforeKeys = Object.keys(before || {});
    const afterKeys = Object.keys(after || {});

    if (afterKeys.length <= beforeKeys.length) return null;

    const payload = {
      notification: {
        title: "📩 New Enquiry",
        body: "New enquiry received"
      }
    };

    const snap = await admin.firestore().collection("fcmTokens").get();

    const tokens = [];
    snap.forEach(doc => tokens.push(doc.data().token));

    if (tokens.length === 0) return null;

    return admin.messaging().sendToDevice(tokens, payload);
  });