// --- Firebase Imports ---
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// --- Firebase Config --- (เหมือนเดิม)
const firebaseConfig = {
  apiKey: "AIzaSyBQlq_ZgG1eUVrMGXo178wNW7GMr6imCDk",
  authDomain: "chiphailogin01.firebaseapp.com",
  projectId: "chiphailogin01",
  storageBucket: "chiphailogin01.appspot.com",
  messagingSenderId: "122413223952",
  appId: "1:122413223952:web:35a1f19668bf22be13fa95",
  measurementId: "G-2B1K7VV4ZT"
};

// --- Firebase Init --- (เหมือนเดิม)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Elements ---
// Header elements
const logoBtn = document.getElementById("logoBtn");
const profileBtn = document.getElementById("profileBtn");
const headerAvatarEl = profileBtn?.querySelector(".avatar");
const headerNameEl = profileBtn?.querySelector(".profile-name");

// Profile page elements
const profileImg = document.getElementById("profile-img");
const profileAvatarFallback = document.getElementById("profile-avatar-fallback");
const profileDisplayName = document.getElementById("profile-display-name");
const profileBioDisplay = document.getElementById("profile-bio-display");

// (ใหม่) Conditional Elements (ส่วนที่ต้องซ่อน/แสดง)
const messageBtn = document.getElementById("messageBtn");
const editFormPanel = document.getElementById("edit-form-panel");
const dangerZone = document.getElementById("danger-zone");
const profileError = document.getElementById("profile-error");

// Form elements
const profileForm = document.getElementById("profileForm");
const displayNameInput = document.getElementById("displayName");
const bioInput = document.getElementById("bio");
const emailInput = document.getElementById("email");
const signOutBtn = document.getElementById("signOutBtn");

// --- Logo Navigation --- (เหมือนเดิม)
logoBtn?.addEventListener("click", () => {
  window.location.href = "../index.html";
});

// --- Auth State Control & Profile Loading ---
// (Logic ใหม่ทั้งหมด)
onAuthStateChanged(auth, async (currentUser) => {
  // 1. ตรวจสอบ User ที่ล็อกอิน (อาจเป็น null หรือ anonymous)
  if (!currentUser) {
    try {
      await signInAnonymously(auth);
      // onAuthStateChanged จะถูกเรียกอีกครั้งหลัง sign-in
      return; 
    } catch (e) {
      console.error("Anonymous sign-in failed", e);
      return;
    }
  }

  // 2. อัปเดต Header (แสดงผลคนที่ล็อกอินอยู่เสมอ)
  updateHeaderUI(currentUser);
  
  // 3. หาว่าเรากำลังจะดูโปรไฟล์ของใคร (จาก URL)
  const urlParams = new URLSearchParams(window.location.search);
  const profileUid = urlParams.get('uid');

  // 4. ตัดสินใจว่าจะโหลดโปรไฟล์ของใคร
  // ถ้ามี 'uid' ใน URL: โหลดคนนั้น
  // ถ้าไม่มี: โหลด 'currentUser' (โปรไฟล์ตัวเอง)
  const targetUid = profileUid || currentUser.uid;

  // 5. โหลดและแสดงผลโปรไฟล์
  await loadProfile(targetUid, currentUser);
});


/**
 * (ใหม่) ฟังก์ชันสำหรับโหลดและแสดงผลข้อมูลโปรไฟล์
 * @param {string} targetUid - ID ของ User ที่จะแสดง
 * @param {User} currentUser - User ที่กำลังล็อกอินอยู่ (จาก Auth)
 */
async function loadProfile(targetUid, currentUser) {
  // ซ่อนทุกอย่างไว้ก่อน
  editFormPanel.classList.add('hidden');
  dangerZone.classList.add('hidden');
  messageBtn.classList.add('hidden');
  profileError.classList.add('hidden');

  // ดึงข้อมูลจาก Firestore
  const ref = doc(db, "users_create", targetUid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    // ไม่เจอ User
    profileError.classList.remove('hidden');
    profileDisplayName.textContent = "User Not Found";
    profileBioDisplay.textContent = "";
    profileImg.style.display = 'none';
    profileAvatarFallback.style.display = 'block';
    return;
  }

  // ได้ข้อมูล User
  const userData = snap.data();
  
  // 1. แสดงผลข้อมูลใน Banner (Avatar, Name, Bio)
  if (userData.photoURL) {
    profileImg.src = userData.photoURL;
    profileImg.alt = userData.displayName;
    profileImg.style.display = 'block';
    profileAvatarFallback.style.display = 'none';
  } else {
    profileImg.style.display = 'none';
    profileAvatarFallback.style.display = 'block';
  }
  profileDisplayName.textContent = userData.displayName || "User";
  profileBioDisplay.textContent = userData.bio || "No bio available.";
  
  // 2. ตรวจสอบว่าเป็นเจ้าของโปรไฟล์หรือไม่
  const isOwner = currentUser.uid === targetUid;
  
  if (isOwner && !currentUser.isAnonymous) {
    // === 2.1 ถ้าเป็นเจ้าของ (และไม่ใช่ Guest) ===
    // แสดงฟอร์มแก้ไข และปุ่ม Sign Out
    editFormPanel.classList.remove('hidden');
    dangerZone.classList.remove('hidden');
    
    // เติมข้อมูลลงในฟอร์ม
    displayNameInput.value = userData.displayName || "";
    bioInput.value = userData.bio || "";
    emailInput.value = userData.email || "No email provided";

  } else if (!isOwner && !currentUser.isAnonymous) {
    // === 2.2 ถ้าเป็นคนอื่น (และเราไม่ใช่ Guest) ===
    // แสดงปุ่ม Message
    messageBtn.classList.remove('hidden');

  } else {
    // === 2.3 กรณีอื่นๆ ===
    // (เช่น เราเป็น Guest ดูโปรไฟล์คนอื่น หรือ Guest ดูโปรไฟล์ Guest)
    // ไม่ต้องแสดงปุ่มอะไรเลย
    // (เราจะเห็นแค่ Banner)
  }
}

/**
 * (ใหม่) ฟังก์ชันอัปเดต Header UI (แสดงคนที่ล็อกอิน)
 */
async function updateHeaderUI(user) {
  if (!user) { // ถ้า Sign out หรือไม่มี
    if (headerAvatarEl) headerAvatarEl.innerHTML = "👤";
    if (headerNameEl) headerNameEl.textContent = "Guest";
    return;
  }

  // บันทึกข้อมูลตัวเองลง Firestore (เผื่อยังไม่มี)
  const ref = doc(db, "users_create", user.uid);
  const snap = await getDoc(ref);
  const now = new Date();
  
  const userData = {
    uid: user.uid,
    displayName: user.displayName || (user.email ? user.email.split("@")[0] : "User"),
    email: user.email || "",
    photoURL: user.photoURL || "",
    lastLoginAt: now,
    createdAt: snap.exists() ? (snap.data().createdAt || now) : now
  };
  await setDoc(ref, userData, { merge: true });

  // แสดงผลบน Header
  const displayName = userData.displayName || "Guest";
  const photoURL = userData.photoURL;

  if (headerAvatarEl) headerAvatarEl.innerHTML = photoURL ? `<img src="${photoURL}" alt="${displayName}">` : "👤";
  if (headerNameEl) headerNameEl.textContent = displayName;

  // (อัปเดต) ปุ่ม Profile ใน Header จะลิงก์ไปหน้า Profile *ตัวเอง* เสมอ (ไม่มี ?uid)
  profileBtn?.addEventListener("click", () => {
    window.location.href = "./Profile.html"; 
  });
}


// --- Particles.js --- (เหมือนเดิม)
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


// --- Event Listeners (สำหรับปุ่มต่างๆ) ---

// (เหมือนเดิม) --- Submit Profile Form (บันทึกการแก้ไข) ---
profileForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const user = auth.currentUser;
  if (!user || user.isAnonymous) {
    alert("คุณต้องเข้าสู่ระบบเพื่อบันทึกการเปลี่ยนแปลง");
    return;
  }

  const newDisplayName = displayNameInput.value.trim();
  const newBio = bioInput.value.trim(); 

  if (!newDisplayName) {
    alert("ชื่อที่แสดงต้องไม่ว่างเปล่า");
    return;
  }
  
  const submitButton = e.target.querySelector('.btn-submit');
  submitButton.textContent = "กำลังบันทึก...";
  submitButton.disabled = true;

  try {
    // 1. อัปเดต Auth
    await updateProfile(user, { displayName: newDisplayName });

    // 2. อัปเดต Firestore
    const ref = doc(db, "users_create", user.uid);
    await updateDoc(ref, {
      displayName: newDisplayName,
      bio: newBio, 
      lastLoginAt: new Date()
    });
    
    // 3. อัปเดต UI ทันที
    profileDisplayName.textContent = newDisplayName;
    if (headerNameEl) headerNameEl.textContent = newDisplayName;
    profileBioDisplay.textContent = newBio || "Click 'Save Changes' to add your bio!"; 
    
    alert("บันทึกโปรไฟล์สำเร็จ!");

  } catch (error) {
    console.error("Error updating profile:", error);
    alert("เกิดข้อผิดพลาดในการบันทึกโปรไฟล์");
  } finally {
    submitButton.textContent = "Save Changes";
    submitButton.disabled = false;
  }
});

// (เหมือนเดิม) --- Sign Out Button ---
signOutBtn?.addEventListener('click', async () => {
  if (!confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) return;
  
  try {
    await signOut(auth);
    alert("คุณออกจากระบบแล้ว");
    window.location.href = "../index.html"; 
  } catch (error) {
    console.error("Error signing out:", error);
  }
});

// (ใหม่) --- Message Button ---
messageBtn?.addEventListener('click', () => {
  // ดึง uid จาก URL อีกครั้ง
  const urlParams = new URLSearchParams(window.location.search);
  const profileUid = urlParams.get('uid');
  
  if (!profileUid) {
    alert("ไม่สามารถส่งข้อความได้: ไม่พบ ID ผู้ใช้");
    return;
  }
  
  if (profileUid === auth.currentUser?.uid) {
    alert("คุณไม่สามารถส่งข้อความหาตัวเองได้");
    return;
  }

  // ส่งไปหน้า Chat พร้อมกับ uid ของคนที่เราจะคุยด้วย
  window.location.href = `../Chat/Chat.html?uid=${profileUid}`;
});