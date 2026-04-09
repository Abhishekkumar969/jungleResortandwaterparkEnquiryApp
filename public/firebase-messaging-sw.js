importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "AIzaSyD8FBDt0oPJEO9N9DAdrKNmwx0zOQ25UV0",
    authDomain: "jungleresortwaterparkenquiry.firebaseapp.com",
    projectId: "jungleresortwaterparkenquiry",
    messagingSenderId: "462669648395",
    appId: "1:462669648395:web:ce772feca1be4405e1ed0e"
});

const messaging = firebase.messaging();


// 🔥 IMPORTANT: override default notification
messaging.onBackgroundMessage(function (payload) {
    console.log("🔥 BG MESSAGE:", payload);

    const data = payload.data || {};

    const title = data.title;
    const options = {
        body: data.body,
        icon: "/logo192.png",
        badge: "/badge.png",
        requireInteraction: true,

        data: {
            url: data.url,
            mobile: data.mobile
        },

        actions: [
            { action: "call", title: "📞 Call Now" },
            { action: "whatsapp", title: "💬 WhatsApp" }
        ]
    };

    self.registration.showNotification(title, options);
});


// 🔥 CLICK HANDLER (FINAL)
self.addEventListener("notificationclick", function (event) {
    event.notification.close();

    const action = event.action;
    const data = event.notification.data || {};

    const mobile = data.mobile;
    const url = data.url;

    console.log("ACTION:", action, "DATA:", data);

    if (action === "call" && mobile) {
        event.waitUntil(clients.openWindow(`tel:${mobile}`));
    } else if (action === "whatsapp" && mobile) {
        event.waitUntil(clients.openWindow(`https://wa.me/${mobile}`));
    } else {
        event.waitUntil(clients.openWindow(url || "/"));
    }
});