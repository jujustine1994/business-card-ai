/**
 * Firebase Service Module
 * Handles Authentication and Cloud Firestore interactions
 */

class FirebaseService {
    constructor() {
        this.auth = null;
        this.db = null;
        this.user = null;
        this.unsubscribeSnapshot = null;
    }

    init() {
        if (!window.firebase) {
            console.error("Firebase SDK not loaded");
            return;
        }

        // Ensure firebase is initialized in index.html or firebase_config.js before this runs
        // If not initialized yet, we can try to init here if config is global
        if (!firebase.apps.length && window.firebaseConfig) {
            firebase.initializeApp(window.firebaseConfig);
        }

        this.auth = firebase.auth();
        this.db = firebase.firestore();

        // Auth State Listener
        this.auth.onAuthStateChanged((user) => {
            this.user = user;
            const loginBtn = document.getElementById('login-btn');
            const avatar = document.getElementById('user-avatar');

            if (user) {
                console.log("User logged in:", user.uid);
                // Update UI
                if (loginBtn) loginBtn.classList.add('hidden');
                if (avatar) {
                    avatar.src = user.photoURL || 'https://via.placeholder.com/40';
                    avatar.classList.remove('hidden');
                }

                // Start Syncing Data
                this.syncData();
            } else {
                console.log("User logged out");
                // Update UI
                if (loginBtn) loginBtn.classList.remove('hidden');
                if (avatar) avatar.classList.add('hidden');

                // Stop Syncing
                if (this.unsubscribeSnapshot) {
                    this.unsubscribeSnapshot();
                    this.unsubscribeSnapshot = null;
                }

                // Clear Local Display (Optional, or keep as cache)
                // App.render([]); 
            }
        });
    }

    // --- Authentication ---

    async signInWithGoogle() {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            await this.auth.signInWithPopup(provider);
        } catch (error) {
            console.error("Login failed:", error);
            alert("登入失敗: " + error.message);
        }
    }

    async signInWithEmail(email, password) {
        try {
            await this.auth.signInWithEmailAndPassword(email, password);
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        }
    }

    async registerWithEmail(email, password) {
        try {
            await this.auth.createUserWithEmailAndPassword(email, password);
        } catch (error) {
            console.error("Registration failed:", error);
            throw error;
        }
    }

    signOut() {
        this.auth.signOut();
    }

    // --- Firestore Data Sync ---

    /**
     * Listen to real-time updates from Firestore
     * Path: /users/{uid}/cards
     */
    syncData() {
        if (!this.user) return;

        const collectionRef = this.db.collection('users').doc(this.user.uid).collection('cards');

        this.unsubscribeSnapshot = collectionRef.onSnapshot((snapshot) => {
            const data = [];
            snapshot.forEach((doc) => {
                data.push({
                    id: doc.id, // Firestore Doc ID
                    ...doc.data()
                });
            });

            // Update App Data
            if (window.App) {
                window.App.data = data;
                window.App.render(data);
            }
        }, (error) => {
            console.error("Data sync error:", error);
        });
    }

    /**
     * Save/Update a company group to Firestore
     * Checks if we are updating an existing doc or creating new
     */
    async saveCardGroup(companyGroup) {
        if (!this.user) {
            alert("請先登入以儲存資料到雲端");
            return;
        }

        const collectionRef = this.db.collection('users').doc(this.user.uid).collection('cards');

        try {
            if (companyGroup.id) {
                // Update existing
                await collectionRef.doc(companyGroup.id).set(companyGroup, { merge: true });
            } else {
                // Create new
                // Check if company already exists (Client side check is fast, but Cloud check is safer)
                // Here we just add, but in App.js we usually handle merging before calling save.
                // Or we can query by company name here.

                // Strategy: We rely on App.js passing us a "Merged" specific group.
                // Ideally, App.js should know the ID if it came from syncData.

                await collectionRef.add(companyGroup);
            }
            console.log("Data saved to cloud");
        } catch (error) {
            console.error("Save error:", error);
            alert("儲存失敗: " + error.message);
        }
    }

    /**
     * Delete a whole group
     */
    async deleteGroup(groupId) {
        if (!this.user) return;
        await this.db.collection('users').doc(this.user.uid).collection('cards').doc(groupId).delete();
    }
}

// Export singleton
window.FirebaseService = new FirebaseService();
