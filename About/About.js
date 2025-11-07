// --- Firebase Imports ---
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

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

// --- Helpers: Upsert Profile (เหมือน Chat.js) ---
async function upsertMyProfileFromAuth(user) {
  if (!user) return;
  const ref = doc(db, "users_create", user.uid);
  const now = new Date();
  const snap = await getDoc(ref);
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
}

// --- Auth State Control ---
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    await signInAnonymously(auth);
    return;
  }

  // ดึงข้อมูลผู้ใช้
  const photo = user.photoURL || "";
  const name = user.displayName || (user.email ? user.email.split("@")[0] : "Guest");

  if (avatarEl) {
    avatarEl.innerHTML = photo ? `<img src="${photo}" alt="${name}">` : "👤";
  }

  if (nameEl) {
    nameEl.textContent = name;
  }

});

// --- Section: ทีมพัฒนา ---
const team = [
  { name: "วรินทร แก้วสอาด", role: "Project Lead", avatar: "../image/f0b81d84a65ab018b1d05323dcb4de29_0.jpg" },
  { name: "อมรเทพ จีระมานะพงศ์", role: "Frontend", avatar: "../image/f5b1b6a3-2d97-45b6-96d5-c07a62f49722.jpg" },
  { name: "ปรัตภกร ดีทองอ่อน", role: "Backend", avatar: "../image/SPOILER_1702956801823.jpg" },
  { name: "จอมภัช ตรีธรปณธิ", role: "Designer", avatar: "../image/IMG_9048.jpg" },
  { name: "ธนกร เลขะวัฒนะ", role: "Designer", avatar: "../image/IMG_2057.jpg" } 
];

const grid = document.getElementById("teamGrid");
if (grid) {
  grid.innerHTML = "";
  team.forEach(m => {
    const a = document.createElement("article");
    a.className = "member";

    const avatarWrap = document.createElement("div");
    avatarWrap.className = "avatar";

    const isUrl = (s) => typeof s === "string" && /^https?:\/\//i.test(s);
    const isLocalPath = (s) => typeof s === "string" && (/^[.\/]/.test(s) || s.includes("/"));
    const isEmojiOrText = (s) => typeof s === "string" && !isUrl(s) && !isLocalPath(s);

    if (m.avatar && (isUrl(m.avatar) || isLocalPath(m.avatar))) {
      const img = document.createElement("img");
      img.loading = "lazy";
      img.src = m.avatar;
      img.alt = m.name;
      img.addEventListener("error", () => {
        avatarWrap.innerHTML = `<div class="avatar-emoji">👤</div>`;
      });
      avatarWrap.appendChild(img);
    } else {
      const emoji = (m.avatar && isEmojiOrText(m.avatar)) ? m.avatar : "👤";
      avatarWrap.innerHTML = `<div class="avatar-emoji">${emoji}</div>`;
    }

    const nameEl = document.createElement("div");
    nameEl.className = "member-name";
    nameEl.textContent = m.name;

    const roleEl = document.createElement("div");
    roleEl.className = "member-role";
    roleEl.textContent = m.role;

    a.appendChild(avatarWrap);
    a.appendChild(nameEl);
    a.appendChild(roleEl);
    grid.appendChild(a);
  });
}

// --- Typed Text ---
var typed = new Typed('#typed-text', {
  strings: [
    "CHIPHAI คือแพลตฟอร์มออนไลน์สำหรับการ “โพสต์ของหาย” และ “แจ้งเจอของหาย” เพื่อช่วยให้ทุกคนสามารถตามหาสิ่งของสำคัญของตนได้อย่างรวดเร็ว ปลอดภัย และน่าเชื่อถือ"
  ],
  typeSpeed: 20,
  backSpeed: 15,
  backDelay: 12000,
  loop: true
});

// --- Particles.js ---
particlesJS('particles-js', {
  "particles": {
    "number": { "value": 100, "density": { "enable": true, "value_area": 1500 } },
    "color": { "value": "#000000" },
    "shape": { "type": "circle" },
    "opacity": { "value": 0.8, "random": true },
    "size": { "value": 6, "random": true },
    "line_linked": { "enable": false },
    "move": { "enable": true, "speed": 1, "direction": "bottom", "straight": false, "out_mode": "out" }
  },
  "interactivity": {
    "events": { "onhover": { "enable": false }, "onclick": { "enable": false } }
  }
});
