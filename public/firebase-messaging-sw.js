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


messaging.onBackgroundMessage(function (payload) {
    console.log("🔥 BG PAYLOAD:", payload);

    self.registration.showNotification(payload.data.title, {
        body: payload.data.body,
        icon: "/logo192.png",
        data: {
            url: payload.data.url
        }
    });
});

self.addEventListener("notificationclick", function (event) {
    event.notification.close();

    const url = event.notification.data?.url || "/";

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true })
            .then((clientList) => {

                for (const client of clientList) {
                    if (client.url.includes("jrenquiry.netlify.app")) {
                        client.focus();
                        client.navigate(url);
                        return;
                    }
                }

                return clients.openWindow(url);
            })
    );
});