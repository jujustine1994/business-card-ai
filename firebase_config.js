// Firebase Configuration
// 請前往 Firebase Console -> Project Settings -> General -> Your apps -> SDK setup and configuration
// 複製 Config 內容並貼上覆蓋下方變數
const firebaseConfig = {
    apiKey: "AIzaSyBjTZsXQe1BupFs5pbP6R3zT7Hngp_r0CE",
    authDomain: "batch-business-card.firebaseapp.com",
    projectId: "batch-business-card",
    storageBucket: "batch-business-card.firebasestorage.app",
    messagingSenderId: "528312884568",
    appId: "1:528312884568:web:a97823a697ab733d81192d",
    measurementId: "G-F4X8WZHBDG"
};

// Initialize Firebase
// 這裡假設這兩個變數會由 HTML 的 SDK Script 載入後提供
// firebase.initializeApp(firebaseConfig);
// 為了避免重複宣告，我們將在 index.html 統一初始化，或在此處匯出
