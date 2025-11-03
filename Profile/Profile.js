// --- Firebase Imports ---
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
// (อัปเดต) Import functions สำหรับ Query โพสต์
import { 
  getFirestore, doc, getDoc, setDoc, updateDoc, 
  collection, query, where, getDocs, orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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
const logoBtn = document.getElementById("logoBtn");
const profileBtn = document.getElementById("profileBtn");
const headerAvatarEl = profileBtn?.querySelector(".avatar");
const headerNameEl = profileBtn?.querySelector(".profile-name");

const profileImg = document.getElementById("profile-img");
const profileAvatarFallback = document.getElementById("profile-avatar-fallback");
const profileDisplayName = document.getElementById("profile-display-name");
const profileBioDisplay = document.getElementById("profile-bio-display");
const profileInfoHeader = document.querySelector('.profile-info-header');

const messageBtn = document.getElementById("messageBtn");
const editFormPanel = document.getElementById("edit-form-panel");
const dangerZone = document.getElementById("danger-zone");
const profileError = document.getElementById("profile-error");

const profileForm = document.getElementById("profileForm");
const displayNameInput = document.getElementById("displayName");
const bioInput = document.getElementById("bio");
const emailInput = document.getElementById("email");
const signOutBtn = document.getElementById("signOutBtn");

// (ใหม่) Elements สำหรับแสดงโพสต์
const userPostsContainer = document.getElementById("user-posts-container");
const userPostsGrid = document.getElementById("user-posts-grid");
const userPostsTitle = document.getElementById("user-posts-title");


// --- Logo Navigation ---
logoBtn?.addEventListener("click", () => {
  window.location.href = "../index.html";
});

// --- Auth State Control & Profile Loading ---
onAuthStateChanged(auth, async (currentUser) => {
  if (!currentUser) {
    try {
      await signInAnonymously(auth);
      return; 
    } catch (e) {
      console.error("Anonymous sign-in failed", e);
      return;
    }
  }

  updateHeaderUI(currentUser);
  
  const urlParams = new URLSearchParams(window.location.search);
  const profileUid = urlParams.get('partner') || urlParams.get('uid');
  const targetUid = profileUid || currentUser.uid;

  await loadProfile(targetUid, currentUser);
});


/**
 * โหลดและแสดงผลข้อมูลโปรไฟล์
 */
async function loadProfile(targetUid, currentUser) {
  // ซ่อนทุกอย่างไว้ก่อน
  editFormPanel.classList.add('hidden');
  dangerZone.classList.add('hidden');
  messageBtn.classList.add('hidden');
  profileError.classList.add('hidden');
  userPostsContainer.classList.add('hidden'); // (ใหม่) ซ่อนส่วนโพสต์
  profileInfoHeader.classList.remove('hidden'); 

  const ref = doc(db, "users_create", targetUid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    // ไม่เจอ User
    profileError.classList.remove('hidden');
    profileInfoHeader.classList.add('hidden'); 
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
  
  // (ใหม่) เปลี่ยนหัวข้อส่วนโพสต์
  userPostsTitle.textContent = isOwner ? "My Posts" : `Posts by ${userData.displayName || "User"}`;
  
  // (ใหม่) โหลดโพสต์ของผู้ใช้คนนี้ (ทำก่อนแสดงปุ่ม)
  await loadUserPosts(targetUid); 

  if (isOwner && !currentUser.isAnonymous) {
    // === เป็นเจ้าของ ===
    editFormPanel.classList.remove('hidden');
    dangerZone.classList.remove('hidden');
    
    displayNameInput.value = userData.displayName || "";
    bioInput.value = userData.bio || "";
    emailInput.value = userData.email || "No email provided";

  } else if (!isOwner && !currentUser.isAnonymous) {
    // === เป็นคนอื่น (และเราไม่ใช่ Guest) ===
    messageBtn.classList.remove('hidden');

  } else {
    // === เป็น Guest ===
    // ไม่ต้องแสดงปุ่มอะไรเลย
  }
}

/**
 * อัปเดต Header UI (เหมือนเดิม)
 */
async function updateHeaderUI(user) {
  if (!user) { 
    if (headerAvatarEl) headerAvatarEl.innerHTML = "👤";
    if (headerNameEl) headerNameEl.textContent = "Guest";
    return;
  }
  const ref = doc(db, "users_create", user.uid);
  const now = new Date();
  const snap = await getDoc(ref);
  const userData = {
    uid: user.uid,
    displayName: user.displayName || (user.email ? user.email.split("@")[0] : "User"),
    email: user.email || "",
    photoURL: user.photoURL || "",
    lastLoginAt: now,
    createdAt: snap.exists() ? (snap.data().createdAt || now) : now
  };
  await setDoc(ref, userData, { merge: true });
  const displayName = userData.displayName || "Guest";
  const photoURL = userData.photoURL;
  if (headerAvatarEl) headerAvatarEl.innerHTML = photoURL ? `<img src="${photoURL}" alt="${displayName}">` : "👤";
  if (headerNameEl) headerNameEl.textContent = displayName;
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

// (เหมือนเดิม) --- Submit Profile Form ---
profileForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user || user.isAnonymous) return;

  const newDisplayName = displayNameInput.value.trim();
  const newBio = bioInput.value.trim(); 
  if (!newDisplayName) return;
  
  const submitButton = e.target.querySelector('.btn-submit');
  submitButton.textContent = "กำลังบันทึก...";
  submitButton.disabled = true;

  try {
    await updateProfile(user, { displayName: newDisplayName });
    const ref = doc(db, "users_create", user.uid);
    await updateDoc(ref, {
      displayName: newDisplayName,
      bio: newBio, 
      lastLoginAt: new Date()
    });
    
    profileDisplayName.textContent = newDisplayName;
    if (headerNameEl) headerNameEl.textContent = newDisplayName;
    profileBioDisplay.textContent = newBio || "Click 'Save Changes' to add your bio!"; 
    
    alert("บันทึกโปรไฟล์สำเร็จ!");
  } catch (error) {
    console.error("Error updating profile:", error);
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

// (เหมือนเดิม) --- Message Button ---
messageBtn?.addEventListener('click', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const profileUid = urlParams.get('partner') || urlParams.get('uid');
  if (!profileUid) {
    alert("ไม่สามารถส่งข้อความได้: ไม่พบ ID ผู้ใช้");
    return;
  }
  if (profileUid === auth.currentUser?.uid) {
    alert("คุณไม่สามารถส่งข้อลความหาตัวเองได้");
    return;
  }
  window.location.href = `../Chat/Chat.html?partner=${profileUid}`;
});


/* ===============================================
  (ใหม่) Utility Functions (คัดลอกจาก Post.js)
=============================================== */
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
}
function parseFoundAt(foundAt){
  if(!foundAt) return null;
  if(typeof foundAt.toDate==="function") return foundAt.toDate();
  const d = new Date(foundAt);
  return isNaN(d)? null : d;
}
function formatThaiDateTime(dt){
  if(!dt) return "-";
  const d = dt.toLocaleDateString("th-TH",{day:"2-digit", month:"2-digit", year:"numeric"});
  const t = dt.toLocaleTimeString("th-TH",{hour:"2-digit", minute:"2-digit"});
  return `${d} เวลา ${t}`;
}

/* ===============================================
  (ใหม่) Render Card Function (คัดลอกจาก Post.js)
=============================================== */
function renderCard(docId, data) {
  const {
    itemName = "ไม่มีชื่อไอเท็ม",
    description = "",
    location = "",
    imageUrl = "",
    createdByName = "User",
    createdByPhotoURL = "",
    foundAt: rawFoundAt
  } = data;

  const foundAt = parseFoundAt(rawFoundAt);
  const dateText = formatThaiDateTime(foundAt);

  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <div class="meta">
      <div class="avatar">
        ${createdByPhotoURL
          ? `<img src="${createdByPhotoURL}" alt="${escapeHtml(createdByName)}">`
          : "👤"}
      </div>
      <div class="username">${escapeHtml(createdByName)}</div>
    </div>
    <div class="placeholder">
      ${imageUrl ? `<img src="${imageUrl}" alt="${escapeHtml(itemName)}">` : ""}
    </div>
    <div class="item-name">${escapeHtml(itemName)}</div>
    <div class="desc">${escapeHtml(description)}</div>
    <div class="lines">
      <div class="line">พบที่ ${escapeHtml(location)}</div>
      <div class="line">วันที่ ${escapeHtml(dateText)}</div>
    </div>
    <button class="view-btn" data-id="${escapeHtml(docId)}">View</button>
  `;

  card.querySelector(".view-btn")?.addEventListener("click", () => {
    window.location.href = `../Postview/Postview.html?id=${encodeURIComponent(docId)}`;
  });

  return card;
}

/* ===============================================
  (ใหม่) Load User's Posts Function
=============================================== */
async function loadUserPosts(uid) {
  // แสดง section และสถานะกำลังโหลด
  userPostsContainer.classList.remove('hidden');
  userPostsGrid.innerHTML = `<div class="card"><div class="item-name">กำลังโหลดโพสต์...</div></div>`;

  try {
    const itemsRef = collection(db, "lost_items");
    
    // (สำคัญ) Query หาโพสต์ที่ 'createdByUid' ตรงกับ uid ของโปรไฟล์นี้
    const q = query(
      itemsRef, 
      where("createdBy", "==", uid), 
      orderBy("createdAt", "desc")
    );
    
    const snap = await getDocs(q);

    if (snap.empty) {
      userPostsGrid.innerHTML = `<div class="card"><div class="item-name">ยังไม่มีโพสต์</div><div class="desc">ผู้ใช้นี้ยังไม่ได้สร้างโพสต์ใดๆ</div></div>`;
      return;
    }

    const frag = document.createDocumentFragment();
    snap.forEach(doc => {
      frag.appendChild(renderCard(doc.id, doc.data()));
    });
    
    userPostsGrid.innerHTML = ""; // เคลียร์สถานะ "กำลังโหลด"
    userPostsGrid.appendChild(frag);

  } catch (err) {
    console.error("Error loading user posts:", err);
    userPostsGrid.innerHTML = `<div class="card"><div class="item-name">โหลดโพสต์ไม่สำเร็จ</div><div class="desc">${escapeHtml(err?.message)}</div></div>`;
  }
}