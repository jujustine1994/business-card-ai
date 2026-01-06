// Firebase Configuration
// 請前往 Firebase Console -> Project Settings -> General -> Your apps -> SDK setup and configuration
// 複製 Config 內容並貼上覆蓋下方變數
var firebaseConfig = {
    apiKey: "AIzaSyBjTZsXQe1BupFs5pbP6R3zT7Hngp_r0CE",
    authDomain: "batch-business-card.firebaseapp.com",
    projectId: "batch-business-card",
    storageBucket: "batch-business-card.firebasestorage.app",
    messagingSenderId: "528312884568",
    appId: "1:528312884568:web:a97823a697ab733d81192d",
    measurementId: "G-F4X8WZHBDG"
};

// Ensure global accessibility for service module
window.firebaseConfig = firebaseConfig;

// Initialize Firebase immediately if SDK is loaded
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    try {
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase Initialized in config");
    } catch (e) {
        console.error("Firebase Init Error:", e);
    }
}
