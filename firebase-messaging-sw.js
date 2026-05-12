/* BillBud — FCM background service worker.
 *
 * The Firebase Messaging SDK auto-registers this file (at its own sub-scope
 * /firebase-cloud-messaging-push-scope), so it does NOT interfere with sw.js
 * (which controls the app shell + cache). Initializing messaging here is what
 * lets a push that carries a `notification` payload show automatically while
 * the app is in the background; the message's webpush.fcm_options.link handles
 * the tap → it opens the app.
 *
 * compat builds are used because service workers can't use ES modules + the
 * modular SDK here.
 */
/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCNc_WFupX5qJEULas4_Ovi7wnzsdVoUXY",
  authDomain: "billos-edd54.firebaseapp.com",
  projectId: "billos-edd54",
  storageBucket: "billos-edd54.firebasestorage.app",
  messagingSenderId: "789835550134",
  appId: "1:789835550134:web:c47369bf01914f53e88517",
});

firebase.messaging();
