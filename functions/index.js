const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

exports.newEnquiryNotification = onDocumentWritten(
  "enquiry/{monthYear}",
  async (event) => {

    const before = event.data?.before?.data() || {};
    const after = event.data?.after?.data() || {};

    const newKeys = Object.keys(after).filter(
      key => key !== "lastUpdated" && !before[key]
    );

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


    const res = await admin.messaging().sendEachForMulticast({
      tokens,

      notification: {
        title: "📩 New Enquiry",
        body: "New Enquiry Added From App"
      },

      data: {
        url: `https://jrenquiry.netlify.app/leadstabcontainer?tab=enquiry`,
        type: "NEW_ENQUIRY"
      },

      webpush: {
        fcmOptions: {
          link: `https://jrenquiry.netlify.app/leadstabcontainer?tab=enquiry`
        }
      }

    });

    console.log("✅ FCM RESPONSE:", res);
  }
);