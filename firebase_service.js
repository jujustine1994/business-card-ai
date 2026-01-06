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
                const docData = doc.data();
                let finalData = null;

                // Decryption Logic
                if (docData.ciphertext) {
                    // Encrypted Data
                    try {
                        const decrypted = this.decrypt(docData.ciphertext);
                        finalData = { ...decrypted, id: doc.id };
                    } catch (e) {
                        console.error("Decryption failed for doc:", doc.id, e);
                        // Fallback: maybe key changed or corrupted? 
                        // We can't do much but maybe skip or show error placeholder
                        finalData = { company: "Error: Decryption Failed", people: [], id: doc.id };
                    }
                } else {
                    // Legacy (Plaintext) Data
                    finalData = { id: doc.id, ...docData };
                }

                if (finalData) data.push(finalData);
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

        // Encryption
        // We strip the 'id' before encrypting to avoid redundancy, 
        // though keeping it in the payload is also fine.
        // Let's keep specific fields to ensure clean data.
        const dataToEncrypt = {
            company: companyGroup.company,
            people: companyGroup.people,
            updatedAt: new Date().toISOString()
        };

        const ciphertext = this.encrypt(dataToEncrypt);
        const payload = { ciphertext: ciphertext };

        try {
            if (companyGroup.id) {
                // Update existing
                await collectionRef.doc(companyGroup.id).set(payload, { merge: true });
            } else {
                // Create new
                await collectionRef.add(payload);
            }
            console.log("Data saved to cloud (Encrypted)");
            if (window.App && window.App.showToast) {
                window.App.showToast('已同步至雲端');
            }
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

    // --- Encryption Helpers ---

    encrypt(dataObj) {
        if (!window.CryptoJS) return JSON.stringify(dataObj); // Fallback if lib missing
        const jsonStr = JSON.stringify(dataObj);
        // Use User UID as the key
        return CryptoJS.AES.encrypt(jsonStr, this.user.uid).toString();
    }

    decrypt(ciphertext) {
        if (!window.CryptoJS) return null;
        const bytes = CryptoJS.AES.decrypt(ciphertext, this.user.uid);
        const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
        return JSON.parse(decryptedStr);
    }

}

// Export singleton
window.FirebaseService = new FirebaseService();
