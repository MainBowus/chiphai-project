// --- Firebase Imports ---
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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
const formEl = document.getElementById("reportForm");

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
});


particlesJS('particles-js', {
  particles: {
    number: { value: 100, density: { enable: true, value_area: 800 } },
    color: { value: "#9DE0BE" },
    shape: { type: "circle" },
    opacity: { value: 0.8, random: true },
    size: { value: 6, random: true },
    line_linked: { enable: false },
    move: { enable: true, speed: 1, direction: "bottom", out_mode: "out" }
  },
  interactivity: { events: { onhover: { enable: false }, onclick: { enable: false } } }
});

// --- Submit Ticket Form ---
formEl?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const category = document.getElementById("category").value.trim();
  const details = document.getElementById("details").value.trim();

  if (!email || !category || !details) {
    alert("กรุณากรอกข้อมูลให้ครบถ้วน");
    return;
  }

  const user = auth.currentUser;
  const uid = user?.uid || "anonymous";

  try {
    // --- เพิ่ม Ticket ลง Firestore ---
    await addDoc(collection(db, "tickets"), {
      email,
      category,
      details,
      uid,
      status: "pending",
      createdAt: serverTimestamp()
    });

    alert("✅ ส่งรายงานสำเร็จ! ทีมงานจะติดต่อกลับภายใน 2–3 วันทำการ");
    e.target.reset();
  } catch (err) {
    console.error("Error sending ticket:", err);
    alert("❌ เกิดข้อผิดพลาดในการส่งรายงาน");
  }
});
