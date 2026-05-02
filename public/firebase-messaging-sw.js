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
    const notification = payload.notification || {};

    const title = data.title || notification.title || "New Notification";

    const options = {
        body: data.body || notification.body || "",
        icon: "/logo192.png",
        badge: "/badge.png",
        requireInteraction: true,

        data: {
            url: data.url || "/",
            mobile: data.mobile || ""
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

    const action = event.action || "";
    const data = event.notification.data || {};

    const mobile = data.mobile;
    const url = data.url;

    console.log("ACTION:", action);
    console.log("MOBILE:", mobile);

    // 🔥 HARD CHECK (NO BUG)
    if (action === "call") {
        console.log("📞 CALL CLICKED");

        // mobile only environment me hi kaam karega
        if (/Android|iPhone/i.test(navigator.userAgent)) {
            event.waitUntil(clients.openWindow(`tel:${mobile}`));
        } else {
            // desktop fallback
            event.waitUntil(
                clients.openWindow(`https://wa.me/${mobile}`)
            );
        }

    } else if (action === "whatsapp") {
        console.log("💬 WHATSAPP CLICKED");

        const phone = mobile;

        // 🔥 Try opening app first
        event.waitUntil(
            clients.openWindow(`whatsapp://send?phone=${phone}`)
                .catch(() => {
                    // 🔥 fallback to web
                    return clients.openWindow(`https://wa.me/${phone}`);
                })
        );
    } else {
        console.log("🌐 DEFAULT CLICK");

        event.waitUntil(
            clients.openWindow(url || "/")
        );
    }
});