// Post.js
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore, collection, getDocs, query, orderBy, limit, doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signInAnonymously
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
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db  = getFirestore(app);
const auth = getAuth(app);

/* ---------- Elements ---------- */
const itemsEl   = document.getElementById("items");
const loginBtn  = document.getElementById("loginBtn");
const profileBtn = document.getElementById("loginBtn"); // ใช้ loginBtn แสดงชื่อ/รูป profile
const logoBtn = document.getElementById("logoBtn");

/* ---------- Navigation ---------- */
logoBtn?.addEventListener("click", ()=>window.location.href="../index.html");

/* ---------- Auth & Profile ---------- */
async function upsertProfile(user){
  if(!user) return;
  const ref = doc(db,"users_create",user.uid);
  const now = new Date();
  const snap = await getDoc(ref);
  await setDoc(ref, {
    uid: user.uid,
    displayName: user.displayName || (user.email ? user.email.split("@")[0] : "User"),
    email: user.email || "",
    photoURL: user.photoURL || "",
    providerPrimary: (user.providerData?.[0]?.providerId || "").replace(".com",""),
    providers: (user.providerData || []).map(p=>p.providerId),
    lastLoginAt: now,
    createdAt: snap.exists()? (snap.data().createdAt||now) : now
  }, {merge:true});
}

onAuthStateChanged(auth, async (user)=>{
  if(!user){
    await signInAnonymously(auth);
    return;
  }
  await upsertProfile(user);
  const name = user.displayName || (user.email ? user.email.split("@")[0] : "Guest");
  const photo = user.photoURL || "";
  if(profileBtn){
    profileBtn.textContent = "";
    const span = document.createElement("span");
    span.className = "avatar";
    span.innerHTML = photo ? `<img src="${photo}" alt="${name}">` : "👤";
    profileBtn.appendChild(span);
    const nameSpan = document.createElement("span");
    nameSpan.textContent = name;
    nameSpan.style.marginLeft = "8px";
    profileBtn.appendChild(nameSpan);
  }
});

/* ---------- Utils ---------- */
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

/* ---------- Render Card ---------- */
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

/* ---------- Load Posts ---------- */
let allPosts = []; // เก็บโพสต์ทั้งหมด

async function loadPosts(){
  itemsEl.innerHTML = `<div class="card"><div class="item-name">กำลังโหลดรายการ...</div></div>`;
  try{
    const q = query(collection(db,"lost_items"), orderBy("createdAt","desc"), limit(50));
    const snap = await getDocs(q);
    if(snap.empty){
      itemsEl.innerHTML = `<div class="card"><div class="item-name">ยังไม่มีโพสต์</div><div class="desc">กด "Create Post" เพื่อเพิ่มรายการแรก</div></div>`;
      return;
    }
    const frag = document.createDocumentFragment();
    allPosts = []; // เคลียร์ก่อน
    snap.forEach(doc=>{
      const data = doc.data();
      allPosts.push({id: doc.id, data}); // เก็บโพสต์ทั้งหมด
      frag.appendChild(renderCard(doc.id, data));
    });
    itemsEl.innerHTML = "";
    itemsEl.appendChild(frag);
  }catch(err){
    console.error("[post] load error:",err);
    itemsEl.innerHTML = `<div class="card"><div class="item-name">โหลดรายการไม่สำเร็จ</div><div class="desc">${escapeHtml(err?.message||String(err))}</div></div>`;
  }
}


loadPosts();

const searchInput = document.querySelector(".header-right input[type=search]");

searchInput?.addEventListener("input", ()=>{
  const term = searchInput.value.trim().toLowerCase();
  itemsEl.innerHTML = "";
  if(!term){
    // ถ้าไม่มีคำค้น แสดงโพสต์ทั้งหมด
    const frag = document.createDocumentFragment();
    allPosts.forEach(p => frag.appendChild(renderCard(p.id, p.data)));
    itemsEl.appendChild(frag);
    return;
  }

  const filtered = allPosts.filter(p=>{
    const { itemName="", description="", location="" } = p.data;
    return itemName.toLowerCase().includes(term)
        || description.toLowerCase().includes(term)
        || location.toLowerCase().includes(term);
  });

  if(filtered.length === 0){
    itemsEl.innerHTML = `<div class="card"><div class="item-name">ไม่พบผลลัพธ์</div></div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  filtered.forEach(p=>frag.appendChild(renderCard(p.id, p.data)));
  itemsEl.appendChild(frag);
});


/* ---------- Create Button ---------- */
document.getElementById("createBtn")?.addEventListener("click", ()=>{
  window.location.href="../PostCreate/CreatePost.html";
});
