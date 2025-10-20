// Chat.js — Realtime Chat ของ CHIPHAI
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, query, where,
  addDoc, updateDoc, onSnapshot, serverTimestamp, arrayUnion, setDoc, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

/* ---------- Firebase ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyBQlq_ZgG1eUVrMGXo178wNW7GMr6imCDk",
  authDomain: "chiphailogin01.firebaseapp.com",
  projectId: "chiphailogin01",
  storageBucket: "chiphailogin01.appspot.com",
  messagingSenderId: "122413223952",
  appId: "1:122413223952:web:35a1f19668bf22be13fa95",
  measurementId: "G-2B1K7VV4ZT"
};
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db  = getFirestore(app);
const auth= getAuth(app);

/* ---------- Elements ---------- */
const chatList     = document.getElementById("chatList");
const chatBody     = document.getElementById("chatBody");
const chatPartner  = document.getElementById("chatPartner");
const messageInput = document.getElementById("messageInput");
const sendBtn      = document.getElementById("sendBtn");

/* ---------- URL Params ---------- */
const params   = new URLSearchParams(location.search);
let partnerId  = params.get("partner") || null;
const postId   = params.get("post")    || null;
const title    = params.get("title")   || "";
const firstMsg = params.get("msg")     || null;

/* ---------- State ---------- */
let currentUserId = null;
let conversationId = null;
let unsubConv = null;
let unsubInbox = null;
const profileCache = new Map();

/* ---------- Helpers ---------- */
const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, m => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]
));
function setHeaderProfile({ name, photo }) {
  const nameEl = document.querySelector(".profile-name");
  const av = document.querySelector(".profile .avatar");
  if (nameEl) nameEl.textContent = name || "Guest";
  if (av) av.innerHTML = photo ? `<img src="${photo}" alt="me">` : "👤";
}
function updateTopbarAvatar(photoURL) {
  const el = document.querySelector(".chat-topbar .avatar");
  if (el) el.innerHTML = photoURL ? `<img src="${photoURL}" alt="avatar">` : "👥";
}
function scrollBottom() { chatBody.scrollTop = chatBody.scrollHeight; }

/* ---------- บันทึกโปรไฟล์ผู้ใช้ ---------- */
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

/* ---------- ดึงโปรไฟล์ผู้ใช้คนอื่น ---------- */
async function getUserProfile(uid) {
  if (!uid || uid === "undefined") {
    console.warn("⚠️ Invalid UID passed to getUserProfile:", uid);
    return { name: "Guest", photo: "" };
  }

  if (profileCache.has(uid)) return profileCache.get(uid);

  try {
    // ✅ ลองดึงจาก users_create ก่อน
    let ref = doc(db, "users_create", uid);
    let s = await getDoc(ref);

    // ถ้าไม่เจอ ลองจาก users_google
    if (!s.exists()) {
      console.log("🔁 Fallback to users_google for:", uid);
      ref = doc(db, "users_google", uid);
      s = await getDoc(ref);
    }

    if (s.exists()) {
      const d = s.data();
      const p = {
        name: d.displayName || d.email?.split("@")[0] || "User",
        photo: d.photoURL || ""
      };
      profileCache.set(uid, p);
      return p;
    } else {
      console.warn("⚠️ No user doc found for uid in both collections:", uid);
    }
  } catch (e) {
    console.warn("❌ getUserProfile error:", e);
  }

  const fallback = { name: "ไม่พบข้อมูลผู้ใช้", photo: "" };
  profileCache.set(uid, fallback);
  return fallback;
}

/* ---------- เลือกคู่คุย (ไม่ให้แสดงตัวเอง) ---------- */
function pickContactUid(participants = []) {
  if (!participants.length) return null;
  return participants.find(u => u !== currentUserId) || participants[0];
}

/* ---------- Auth Boot ---------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) { await signInAnonymously(auth); return; }
  currentUserId = user.uid;

  console.log("✅ Authenticated as:", currentUserId);
  setHeaderProfile({
    name: user.displayName || (user.email ? user.email.split("@")[0] : "Guest"),
    photo: user.photoURL || ""
  });

  await upsertMyProfileFromAuth(user);

  if (partnerId) {
    console.log("🎯 PartnerID:", partnerId);
    await openDirectChat(partnerId);
    const prof = await getUserProfile(partnerId);
    chatPartner.textContent = title ? `โพสต์: ${title} · ${prof.name}` : prof.name;
    updateTopbarAvatar(prof.photo);
    if (firstMsg) await sendFirstMessageIfEmpty(firstMsg);
  } else {
    chatPartner.textContent = "เลือกบทสนทนาทางซ้ายเพื่อเริ่มคุย";
    updateTopbarAvatar("");
    loadInboxRealtime();
  }
});

/* ---------- Inbox Realtime ---------- */
function loadInboxRealtime() {
  if (unsubInbox) unsubInbox();
  chatList.innerHTML = `<div class="chat-item"><div class="chat-info">กำลังโหลด…</div></div>`;
  const qy = query(collection(db, "conversations"), where("participants", "array-contains", currentUserId));

  unsubInbox = onSnapshot(qy, async (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!list.length) {
      chatList.innerHTML = `<div class="chat-item"><div class="chat-info">ยังไม่มีข้อความ</div></div>`;
      return;
    }

    const uids = new Set();
    list.forEach(c => { const u = pickContactUid(c.participants); if (u) uids.add(u); });
    await Promise.all([...uids].map(uid => getUserProfile(uid)));

    chatList.innerHTML = "";
    list.sort((a,b)=> (b.updatedAt?.seconds||0) - (a.updatedAt?.seconds||0));

    for (const c of list) {
      const contactUid = pickContactUid(c.participants);
      const prof = contactUid ? (profileCache.get(contactUid) || {name:"",photo:""}) : {name:"",photo:""};
      const item = document.createElement("div");
      item.className = "chat-item";
      item.innerHTML = `
        <span class="avatar">${prof.photo ? `<img src="${prof.photo}" alt="${escapeHtml(prof.name)}">` : "👤"}</span>
        <div class="chat-info">
          <p class="chat-name">${escapeHtml(prof.name || "ไม่ทราบชื่อ")}</p>
          <p class="chat-preview">${escapeHtml(c.lastMessage || "")}</p>
        </div>
      `;
      item.addEventListener("click", () => {
        [...chatList.querySelectorAll(".chat-item")].forEach(el => el.classList.remove("active"));
        item.classList.add("active");
        partnerId = contactUid;
        chatPartner.textContent = c.postTitle ? `โพสต์: ${c.postTitle} · ${prof.name}` : prof.name;
        updateTopbarAvatar(prof.photo);
        openChatById(c.id);
      });
      chatList.appendChild(item);
    }
    chatList.querySelector(".chat-item")?.click();
  });
}

/* ---------- เปิดห้องตาม id (Realtime) ---------- */
function openChatById(cid) {
  conversationId = cid;
  if (unsubConv) unsubConv();
  const ref = doc(db, "conversations", cid);
  unsubConv = onSnapshot(ref, async (snap) => {
    if (!snap.exists()) { chatBody.innerHTML = `<div>ไม่พบห้องสนทนา</div>`; return; }
    const data = snap.data();

    const contactUid = pickContactUid(data.participants || []);
    if (contactUid) {
      const prof = await getUserProfile(contactUid);
      chatPartner.textContent = data.postTitle ? `โพสต์: ${data.postTitle} · ${prof.name}` : prof.name;
      updateTopbarAvatar(prof.photo);
    }

    const msgs = (data.messages || []).slice().sort((a,b)=> (a.createdAt?.seconds||0) - (b.createdAt?.seconds||0));
    chatBody.innerHTML = "";
    for (const m of msgs) {
      const el = document.createElement("div");
      el.className = `message ${m.senderId === currentUserId ? "sent" : "received"}`;
      const time = m.createdAt?.toDate ? 
        new Date(m.createdAt.toDate()).toLocaleTimeString("th-TH",{hour:'2-digit',minute:'2-digit'}) : "";
      el.innerHTML = `<div class="msg-text">${escapeHtml(m.text)}</div><div class="msg-time">${time}</div>`;
      chatBody.appendChild(el);
    }
    scrollBottom();
  });
}

/* ---------- เปิดห้องตรงจากพารามิเตอร์ ---------- */
async function openDirectChat(otherUid) {
  const qy = query(collection(db, "conversations"), where("participants", "array-contains", currentUserId));
  const snap = await getDocs(qy);
  const found = snap.docs.find(d => (d.data().participants || []).includes(otherUid));
  if (found) {
    conversationId = found.id;
    openChatById(conversationId);
  } else {
    const ref = await addDoc(collection(db, "conversations"), {
      participants: [currentUserId, otherUid],
      postId: postId || null,
      postTitle: title || "",
      lastMessage: "",
      messages: [],
      updatedAt: serverTimestamp()
    });
    conversationId = ref.id;
    openChatById(conversationId);
  }
}

/* ---------- ส่งข้อความ ---------- */
sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !conversationId) return;
  const ref = doc(db, "conversations", conversationId);
  await updateDoc(ref, {
    messages: arrayUnion({ senderId: currentUserId, text, createdAt: Timestamp.now() }),
    lastMessage: text,
    updatedAt: serverTimestamp()
  });
  messageInput.value = "";
}

/* ---------- ส่งข้อความแรก (จาก query param msg) ---------- */
async function sendFirstMessageIfEmpty(text) {
  const ref = doc(db, "conversations", conversationId);
  const s = await getDoc(ref);
  const arr = s.data()?.messages || [];
  if (arr.length === 0) {
    await updateDoc(ref, {
      messages: arrayUnion({ senderId: currentUserId, text, createdAt: Timestamp.now() }),
      lastMessage: text,
      updatedAt: serverTimestamp()
    });
  }
}
