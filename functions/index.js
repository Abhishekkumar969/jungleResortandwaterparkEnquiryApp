const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

exports.newEnquiryNotification = onDocumentWritten(
  "enquiry/{monthYear}",
  async (event) => {
    try {
      const before = event.data?.before?.data() || {};
      const after = event.data?.after?.data() || {};

      // ✅ Detect new / updated keys properly
      const newKeys = Object.keys(after).filter(key => {
        if (key === "lastUpdated") return false;

        const beforeVal = before[key];
        const afterVal = after[key];

        return !beforeVal || JSON.stringify(beforeVal) !== JSON.stringify(afterVal);
      });

      if (newKeys.length === 0) {
        console.log("❌ No new enquiry detected");
        return;
      }

      console.log("🔥 NEW KEYS:", newKeys);

      // ✅ Latest enquiry pick kar (important)
      const latestKey = newKeys[newKeys.length - 1];
      const enquiry = after[latestKey];

      const source = enquiry?.source || "App";

      // ✅ Tokens fetch
      const snap = await admin.firestore().collection("fcmTokens").get();

      const tokens = snap.docs
        .map(doc => doc.data().token)
        .filter(Boolean); // 🔥 remove undefined/null

      if (tokens.length === 0) {
        console.log("❌ No tokens found");
        return;
      }

      console.log("📱 TOKENS COUNT:", tokens.length);

      const url = `https://jrenquiry.netlify.app/leadstabcontainer?tab=enquiry`;

      // ✅ Send notification
      const res = await admin.messaging().sendEachForMulticast({
        tokens,

        data: {
          url: url,
        },

        webpush: {
          fcmOptions: {
            link: url
          },

          notification: {
            title: "📩 New Enquiry",
            body: `New enquiry from ${source}`,

            icon: "/logo192.png",
            image: "/logo192.png",
            badge: "/badge.png",
            requireInteraction: true
          }
        }
      });

      console.log("✅ SUCCESS COUNT:", res.successCount);
      console.log("❌ FAILURE COUNT:", res.failureCount);

      // 🔥 OPTIONAL: remove invalid tokens
      res.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.log("❌ Invalid token:", tokens[idx]);
        }
      });

    } catch (err) {
      console.error("🔥 FUNCTION ERROR:", err);
    }
  }
);


exports.newWaterParkNotification = onDocumentWritten(
  "WaterPark/{monthYear}",
  async (event) => {
    try {
      const before = event.data?.before?.data() || {};
      const after = event.data?.after?.data() || {};

      const newKeys = Object.keys(after).filter(key => {
        if (key === "lastUpdated") return false;

        const beforeVal = before[key];
        const afterVal = after[key];

        return !beforeVal || JSON.stringify(beforeVal) !== JSON.stringify(afterVal);
      });

      if (newKeys.length === 0) {
        console.log("❌ No new WaterPark entry");
        return;
      }

      console.log("🔥 NEW WATERPARK KEYS:", newKeys);

      // const latestKey = newKeys[newKeys.length - 1];
      // const booking = after[latestKey];

      // const source = booking?.source || "App";

      const snap = await admin.firestore().collection("fcmTokens").get();

      const tokens = snap.docs
        .map(doc => doc.data().token)
        .filter(Boolean);

      if (tokens.length === 0) {
        console.log("❌ No tokens found");
        return;
      }

      const url = `https://jrenquiry.netlify.app/leadstabcontainer?tab=waterpark`; // 🔥 change route if needed

      const res = await admin.messaging().sendEachForMulticast({
        tokens,

        data: {
          url: url,
        },

        webpush: {
          fcmOptions: {
            link: url
          },

          notification: {
            title: "🌊 WaterPark Booking",
            body: `New WaterPark Booking `,

            icon: "/logo192.png",
            image: "/logo192.png",
            badge: "/badge.png",
            requireInteraction: true
          }
        }
      });

      console.log("✅ WATERPARK SUCCESS:", res.successCount);
      console.log("❌ WATERPARK FAIL:", res.failureCount);

    } catch (err) {
      console.error("🔥 WATERPARK ERROR:", err);
    }
  }
);