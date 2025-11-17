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

// (*** ใหม่ ***) Elements สำหรับ Custom Alert
const customAlert = document.getElementById("customAlert");
const customAlertMessage = document.getElementById("customAlertMessage");
const customAlertOkBtn = document.getElementById("customAlertOkBtn");
const customAlertCancelBtn = document.getElementById("customAlertCancelBtn");

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
  // (อัปเดตเล็กน้อย) ใช้ displayName จาก user.displayName ก่อน
  const userData = snap.exists() ? snap.data() : {};
  const displayName = user.displayName || userData.displayName || (user.email ? user.email.split("@")[0] : "Guest");
  
  await setDoc(ref, {
    uid: user.uid,
    displayName: displayName,
    email: user.email || userData.email || "",
    photoURL: user.photoURL || userData.photoURL || "",
    lastLoginAt: now,
    createdAt: userData.createdAt || now
  }, { merge: true });

  const photoURL = user.photoURL || userData.photoURL || "";

  if (avatarEl) avatarEl.innerHTML = photoURL ? `<img src="${photoURL}" alt="${displayName}">` : "👤";
  if (nameEl) nameEl.textContent = displayName;
});


// --- Particles.js ---
particlesJS('particles-js', {
  particles: {
    number: { value: 100, density: { enable: true, value_area: 800 } },
    color: { value: "#ff9800" },
    shape: { type: "circle" },
    opacity: { value: 0.8, random: true },
    size: { value: 6, random: true },
    line_linked: { enable: false },
    move: { enable: true, speed: 1, direction: "bottom", out_mode: "out" }
  },
  interactivity: { events: { onhover: { enable: false }, onclick: { enable: false } } }
});

/* ===============================================
  (*** ใหม่ ***) Custom Alert Modal Logic
  (คัดลอกจาก Profile.js)
=============================================== */
let alertOkCallback = null;

/**
 * ฟังก์ชันสำหรับแสดง Alert (1 ปุ่ม)
 */
function showCustomAlert(message, onClose) {
  customAlertMessage.textContent = message;
  alertOkCallback = onClose || null;

  customAlertOkBtn.textContent = "ตกลง";
  customAlertOkBtn.classList.remove('is-danger');
  customAlertOkBtn.style.display = 'block';
  customAlertCancelBtn.style.display = 'none'; 

  customAlert.classList.remove('hidden');
  setTimeout(() => {
    customAlert.classList.add('show');
  }, 10);
}

/**
 * ฟังก์ชันสำหรับแสดง Confirm (2 ปุ่ม)
 */
function showCustomConfirm(message, onConfirm, isDanger = false) {
  customAlertMessage.textContent = message;
  alertOkCallback = onConfirm || null; 

  customAlertOkBtn.textContent = "ตกลง";
  customAlertOkBtn.style.display = 'block';
  customAlertCancelBtn.style.display = 'block'; 

  if (isDanger) {
    customAlertOkBtn.classList.add('is-danger');
  } else {
    customAlertOkBtn.classList.remove('is-danger');
  }

  customAlert.classList.remove('hidden');
  setTimeout(() => {
    customAlert.classList.add('show');
  }, 10);
}

/**
 * ฟังก์ชันสำหรับซ่อน Alert
 */
function hideCustomAlert(runCallback = false) {
  customAlert.classList.remove('show');
  
  setTimeout(() => {
    customAlert.classList.add('hidden');
    
    if (runCallback && typeof alertOkCallback === 'function') {
      alertOkCallback();
    }
    alertOkCallback = null; 
    
  }, 200);
}

// --- Event Listeners สำหรับ Modal ---
customAlertOkBtn?.addEventListener('click', () => {
  hideCustomAlert(true); 
});

customAlertCancelBtn?.addEventListener('click', () => {
  hideCustomAlert(false); 
});

customAlert?.addEventListener('click', (e) => {
  if (e.target === customAlert) {
    hideCustomAlert(false);
  }
});


// --- (*** อัปเดต ***) Submit Ticket Form ---
formEl?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const category = document.getElementById("category").value.trim();
  const details = document.getElementById("details").value.trim();

  if (!email || !category || !details) {
    showCustomAlert("กรุณากรอกข้อมูลให้ครบถ้วน");
    return;
  }

  const user = auth.currentUser;
  const uid = user?.uid || "anonymous";

  showCustomConfirm(
    "คุณยืนยันที่จะส่ง Report Ticket นี้หรือไม่?",
    async () => {
      try {
        await addDoc(collection(db, "tickets"), {
          email,
          category,
          details,
          uid,
          status: "pending",
          createdAt: serverTimestamp()
        });


        showCustomAlert("✅ ส่งรายงานสำเร็จ! ทีมงานจะติดต่อกลับภายใน 2–3 วันทำการ");
        e.target.reset();
      } catch (err) {

        console.error("Error sending ticket:", err);
        showCustomAlert(`❌ เกิดข้อผิดพลาดในการส่งรายงาน: ${err.message}`);
      }
    },
    false
  );
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
