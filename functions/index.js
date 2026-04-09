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

    const latestKey = newKeys[newKeys.length - 1];
    const enquiryData = after[latestKey];

    const name = enquiryData?.name || "Unknown";
    const mobile = enquiryData?.mobile1 || "No Number";

    const functionTypes = Array.isArray(enquiryData?.functionTypes)
      ? enquiryData.functionTypes.join(", ")
      : "General Enquiry";

    const snap = await admin.firestore().collection("fcmTokens").get();

    const tokens = [];
    snap.forEach(doc => tokens.push(doc.data().token));

    if (tokens.length === 0) {
      console.log("❌ No FCM tokens found");
      return;
    }

    const res = await admin.messaging().sendEachForMulticast({
      tokens,

      data: {
        url: url,
        mobile: mobile
      },

      webpush: {
        fcmOptions: {
          link: url
        },

        notification: {
          title: "📩 New Enquiry",
          body: `👤 ${name}\n📞 ${mobile}\n🎉 ${functionTypes}`,

          icon: "/logo192.png",
          badge: "/badge.png",
          requireInteraction: true,

          data: {
            url: url,
            mobile: mobile
          },

          actions: [
            { action: "call", title: "📞 Call Now" },
            { action: "whatsapp", title: "💬 WhatsApp" }
          ]
        }
      }
    });

    console.log("✅ FCM RESPONSE:", res);
  }
);