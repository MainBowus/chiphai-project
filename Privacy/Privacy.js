// --- Firebase Imports ---
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyBQlq_ZgG1eUVrMGXo178wNW7GMr6imCDk",
  authDomain: "chiphailogin01.firebaseapp.com",
  projectId: "chiphailogin01",
  storageBucket: "chiphailogin01.appspot.com",
  messagingSenderId: "122413223952",
  appId: "1:122413223952:web:35a1f19668bf22be13fa95",
  measurementId: "G-2B1K7VV4ZT"
};

// --- Firebase Init ---
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Elements ---
const logoBtn = document.getElementById("logoBtn");
const profileBtn = document.getElementById("profileBtn");
const avatarEl = profileBtn?.querySelector(".avatar");
const nameEl = profileBtn?.querySelector(".profile-name");

// --- Logo Navigation ---
logoBtn?.addEventListener("click", () => {
  window.location.href = "../index.html";
});

profileBtn?.addEventListener("click", () => {
  window.location.href = "../Profile/Profile.html";
});

// --- Auth State Control ---
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    await signInAnonymously(auth);
    return;
  }

  const ref = doc(db, "users_create", user.uid);
  const snap = await getDoc(ref);
  const now = new Date();

  await setDoc(ref, {
    uid: user.uid,
    displayName: user.displayName || (user.email ? user.email.split("@")[0] : "User"),
    email: user.email || "",
    photoURL: user.photoURL || "",
    providerPrimary: (user.providerData?.[0]?.providerId || "").replace(".com", ""),
    providers: (user.providerData || []).map(p => p.providerId),
    lastLoginAt: now,
    createdAt: snap.exists() ? (snap.data().createdAt || now) : now
  }, { merge: true });

  const displayName = user.displayName || (user.email ? user.email.split("@")[0] : "Guest");
  const photoURL = user.photoURL || "";

  if (avatarEl) avatarEl.innerHTML = photoURL ? `<img src="${photoURL}" alt="${displayName}">` : "👤";
  if (nameEl) nameEl.textContent = displayName;

  // Profile click → redirect
  profileBtn.onclick = () => {
    window.location.href = "../Profile/Profile.html";
  };
});

// --- Hamburger Menu ---
const hamburgerBtn = document.getElementById("hamburgerBtn");
const mobileMenu = document.getElementById("mobileMenu");

hamburgerBtn?.addEventListener("click", () => {
  const isOpen = mobileMenu.style.display === "flex";
  mobileMenu.style.display = isOpen ? "none" : "flex";

  // เพิ่ม/ลบ class บน body เพื่อเปลี่ยน icon
  document.body.classList.toggle("mobile-nav-open", !isOpen);
});
