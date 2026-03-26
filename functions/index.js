const {setGlobalOptions} = require("firebase-functions/v2");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

setGlobalOptions({maxInstances: 10});


// 🔥 1. ALL COLLECTIONS (basic)
exports.allCollectionsNotification = onDocumentCreated(
    "{collectionId}/{docId}",
    async (event) => {
      const data = event.data.data();

      await admin.messaging().send({
        notification: {
          title: "🔥 New Booking",
          body: `${data.name} booked ₹${data.total}`,
        },
        token: "PASTE_YOUR_TOKEN_HERE",
      });
    },
);


// 🔥 2. YOUR MAIN BOOKING COLLECTION
exports.bookingNotification = onDocumentCreated(
    "WaterPark/{month}/{bookingId}",
    async (event) => {
      const data = event.data.data();

      await admin.messaging().send({
        notification: {
          title: "🔥 New Booking",
          body: `${data.name} booked ₹${data.total}`,
        },
        topic: "admin",
      });
    },
);
