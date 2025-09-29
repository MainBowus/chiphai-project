// Post.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

/* ---------- Firebase config ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyBQlq_ZgG1eUVrMGXo178wNW7GMr6imCDk",
  authDomain: "chiphailogin01.firebaseapp.com",
  projectId: "chiphailogin01",
  storageBucket: "chiphailogin01.appspot.com",
  messagingSenderId: "122413223952",
  appId: "1:122413223952:web:35a1f19668bf22be13fa95",
  measurementId: "G-2B1K7VV4ZT"
};

/* ---------- Init ---------- */
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const auth = getAuth(app);

/* ---------- Elements ---------- */
const itemsEl   = document.getElementById("items");
const loginBtn  = document.getElementById("loginBtn");


document.getElementById("createBtn")?.addEventListener("click", () => {
  window.location.href = "../PostCreate/CreatePost.html";
});
document.getElementById("logoBtn")?.addEventListener("click", () => {
  window.location.href = "../index.html";
});
loginBtn?.addEventListener("click", () => {

  window.location.href = "../index.html";
});

/* ---------- Utils ---------- */
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[m]);
}
function parseFoundAt(foundAt) {
  if (!foundAt) return null;
  if (typeof foundAt.toDate === "function") return foundAt.toDate(); // Timestamp
  const d = new Date(foundAt);
  return isNaN(d) ? null : d;
}
function formatThaiDateTime(dt) {
  if (!dt) return "-";
  const d = dt.toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" });
  const t = dt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  return `${d} เวลา ${t}`;
}
function getUserDisplayName(user) {
  if (!user) return "Guest";
  if (user.displayName && user.displayName.trim()) return user.displayName.trim();
  const pd = (user.providerData && user.providerData[0]) ? user.providerData[0] : null;
  if (pd && pd.displayName && pd.displayName.trim()) return pd.displayName.trim();
  if (user.email && user.email.includes("@")) return user.email.split("@")[0];
  return user.isAnonymous ? "Guest" : "User";
}


onAuthStateChanged(auth, async (user) => {
  if (!user) {
    try {
      await signInAnonymously(auth);
    } catch (e) {
      console.error("Anonymous sign-in failed:", e);
    }
    return;
  }
  const name = getUserDisplayName(user);
  if (loginBtn) loginBtn.textContent = name;
});

/* ---------- สร้างการ์ด ---------- */
function renderCard(docId, data) {
  const {
    itemName = "ไม่มีชื่อไอเท็ม",
    description = "",
    location = "",
    imageUrl = "",
    createdByName = "User",
    foundAt: rawFoundAt
  } = data;

  const foundAt = parseFoundAt(rawFoundAt);
  const dateText = formatThaiDateTime(foundAt);

  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <div class="meta">
      <div class="avatar">👤</div>
      <div class="username">${escapeHtml(createdByName)}</div>
    </div>

    <div class="placeholder">
      ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="">` : ""}
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

/* ---------- โหลดโพสต์ ---------- */
async function loadPosts() {
  itemsEl.innerHTML = `
    <div class="card">
      <div class="item-name">กำลังโหลดรายการ...</div>
    </div>
  `;
  try {
    const q = query(
      collection(db, "lost_items"),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      itemsEl.innerHTML = `
        <div class="card">
          <div class="item-name">ยังไม่มีโพสต์</div>
          <div class="desc">กด "Create Post" เพื่อเพิ่มรายการแรก</div>
        </div>
      `;
      return;
    }

    const frag = document.createDocumentFragment();
    snap.forEach(doc => frag.appendChild(renderCard(doc.id, doc.data())));
    itemsEl.innerHTML = "";
    itemsEl.appendChild(frag);
  } catch (err) {
    console.error("[post] load error:", err);
    itemsEl.innerHTML = `
      <div class="card">
        <div class="item-name">โหลดรายการไม่สำเร็จ</div>
        <div class="desc">${escapeHtml(err?.message || String(err))}</div>
      </div>
    `;
  }
}

loadPosts();
