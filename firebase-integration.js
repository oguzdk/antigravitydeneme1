import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDUE9s_TsKYgayqMUODsUOmwlzsRjmMANE",
  authDomain: "habitflow-e5355.firebaseapp.com",
  projectId: "habitflow-e5355",
  storageBucket: "habitflow-e5355.firebasestorage.app",
  messagingSenderId: "558086172753",
  appId: "1:558086172753:web:b0eb0df1ed47cc83064870",
  measurementId: "G-S4670MCZ6R"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

window.currentUser = null;
let isInitialLoad = true;

onAuthStateChanged(auth, async (user) => {
    window.currentUser = user;
    const authBtn = document.getElementById('auth-button');
    const nameDisplay = document.getElementById('user-name-display');
    
    if (user) {
        if(authBtn) authBtn.innerHTML = '<i data-lucide="log-out"></i> Çıkış Yap';
        if(nameDisplay) nameDisplay.textContent = user.displayName;
        if(window.lucide) window.lucide.createIcons();
        
        if (isInitialLoad) {
            await downloadCloudData(user.uid);
            isInitialLoad = false;
        }
    } else {
        if(authBtn) authBtn.innerHTML = '<i data-lucide="log-in"></i> Giriş Yap';
        if(nameDisplay) nameDisplay.textContent = 'Misafir Kullanıcı';
        if(window.lucide) window.lucide.createIcons();
        isInitialLoad = false;
    }
});

window.handleAuthClick = async () => {
    if (window.currentUser) {
        await signOut(auth);
        alert('Çıkış yapıldı. Hesap güvenle kapatıldı.');
        location.reload();
    } else {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            // After successful auth, onAuthStateChanged will fetch data
        } catch(err) {
            console.error("Auth error", err);
            alert("Giriş esnasında hata: " + err.message);
        }
    }
};

window.syncToCloud = async (dataPayload) => {
    if (!window.currentUser) return;
    try {
        const userRef = doc(db, "users", window.currentUser.uid);
        // Merge ensures we don't wipe out existing unseen keys, but we fully update habits
        await setDoc(userRef, dataPayload, { merge: true });
        console.log("Bulutla eşitlendi!");
    } catch (e) {
        console.error("Buluta veri gönderme hatası:", e);
    }
};

async function downloadCloudData(uid) {
    try {
        const userRef = doc(db, "users", uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            if(data.habits && data.habits.length > 0) {
                localStorage.setItem('habits', JSON.stringify(data.habits));
            }
            if(data.userXP !== undefined) {
                localStorage.setItem('userXP', data.userXP.toString());
            }
            if(data.theme) {
                localStorage.setItem('theme', data.theme);
            }
            if(data.lastOpenedMonth) localStorage.setItem('lastOpenedMonth', data.lastOpenedMonth);
            if(data.lastOpenedYear) localStorage.setItem('lastOpenedYear', data.lastOpenedYear);
            
            if(data.notificationsEnabled !== undefined) localStorage.setItem('notificationsEnabled', data.notificationsEnabled);
            if(data.notificationTime) localStorage.setItem('notificationTime', data.notificationTime);
            if(data.lastNotificationDate) localStorage.setItem('lastNotificationDate', data.lastNotificationDate);
            
            if(window.reloadAppFromLocal) {
                window.reloadAppFromLocal();
            } else {
                location.reload();
            }
            console.log("Buluttan veriler indirildi ve güncellendi.");
        } else {
            console.log("Bulutta kayıtlı veri bulunamadı, yerel veriler buluta aktarılacak.");
            // If no data exists, we should push the current local data to the cloud
            if(window.triggerCloudSync) {
                window.triggerCloudSync();
            }
        }
    } catch(e) {
        console.error("Veri indirme hatası:", e);
    }
}

window.deleteCloudData = async () => {
    if (!window.currentUser) return;
    try {
        const userRef = doc(db, "users", window.currentUser.uid);
        // We set explicitly empty data or use deleteDoc
        // Since we didn't import deleteDoc, setting empty fields is safest:
        await setDoc(userRef, { habits: [], userXP: 0, theme: 'dark' });
        console.log("Buluttaki veriler tamamen temizlendi.");
    } catch (e) {
        console.error("Bulut veri temizleme hatası:", e);
    }
};
