// Chat.js — Realtime chat (แสดง displayName/รูป, จัดกลุ่มตามโพสต์)
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, getDocs,
  query, where, addDoc, updateDoc, onSnapshot,
  serverTimestamp, arrayUnion, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

/* 🔧 Firebase */
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

/* 🧱 Elements */
const chatList     = document.getElementById("chatList");
const chatBody     = document.getElementById("chatBody");
const chatPartner  = document.getElementById("chatPartner");
const messageInput = document.getElementById("messageInput");
const sendBtn      = document.getElementById("sendBtn");

/* 🧭 URL Params */
const params   = new URLSearchParams(location.search);
let partnerId  = params.get("partner") || null;     // ถ้ามีคือเปิดห้องตรง
const postId   = params.get("post")    || null;
const title    = params.get("title")   || "(ไม่มีชื่อโพสต์)";
const firstMsg = params.get("msg")     || null;

/* ⚙️ State */
let currentUserId = null;
let conversationId = null;
let unsubConversation = null;
let unsubInbox = null;
let unsubMyProfile = null;
const profileCache = new Map();

/* 💄 Helpers */
const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
function updateTopbarAvatar(photoURL) {
  const avatar = document.querySelector(".chat-topbar .avatar");
  if (!avatar) return;
  avatar.innerHTML = photoURL
    ? `<img src="${photoURL}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`
    : "👥";
}
function scrollToBottom() { chatBody.scrollTop = chatBody.scrollHeight; }

/* === Simple display for header (auth first, then users_create) === */
function getAuthDisplay(user) {
  if (!user) return { name: "Guest", photo: "" };
  const name =
    (user.displayName && user.displayName.trim()) ||
    (user.email ? user.email.split("@")[0] : "") ||
    (user.isAnonymous ? "Guest" : "User");
  return { name, photo: user.photoURL || "" };
}
function setHeaderProfile({name, photo}) {
  const nameEl = document.querySelector(".profile-name");
  const avatarEl = document.querySelector(".profile .avatar");
  if (nameEl) nameEl.textContent = name || "User";
  if (avatarEl) {
    avatarEl.innerHTML = photo
      ? `<img src="${photo}" alt="me" style="width:1.2em;height:1.2em;border-radius:50%;object-fit:cover" />`
      : "👤";
  }
}

/* 👤 โปรไฟล์จาก users_create */
async function getUserProfile(uid) {
  if (!uid) return { name: "ผู้ใช้", photo: "" };
  if (profileCache.has(uid)) return profileCache.get(uid);

  // 1) doc id = uid
  try {
    const snap = await getDoc(doc(db, "users_create", uid));
    if (snap.exists()) {
      const d = snap.data();
      const prof = { name: d.displayName || d.name || d.email || "ผู้ใช้", photo: d.photoURL || "" };
      profileCache.set(uid, prof);
      return prof;
    }
  } catch {}

  // 2) field uid (กรณีใช้ random doc id)
  try {
    const qSnap = await getDocs(query(collection(db, "users_create"), where("uid", "==", uid)));
    if (!qSnap.empty) {
      const d = qSnap.docs[0].data();
      const prof = { name: d.displayName || d.name || d.email || "ผู้ใช้", photo: d.photoURL || "" };
      profileCache.set(uid, prof);
      return prof;
    }
  } catch {}

  const fallback = { name: "ผู้ใช้", photo: "" };
  profileCache.set(uid, fallback);
  return fallback;
}

/* 🚀 Auth boot */
onAuthStateChanged(auth, async (user) => {
  try {
    if (!user) {
      // ถ้ายังไม่มี user → ล็อกอินแบบ anonymous ให้ก่อน
      await signInAnonymously(auth);
      return;
    }

    currentUserId = user.uid;

    // แสดงชื่อจาก auth ทันที (เร็ว)
    const me = getAuthDisplay(user);
    setHeaderProfile(me);

    // ถ้ามี users_create ก็จะอัปเดตทับแบบ realtime
    watchMyProfileRealtime(currentUserId);

    if (partnerId) {
      // โหมดเปิดห้องตรง
      await openDirectChat(partnerId);
      const partnerProf = await getUserProfile(partnerId);
      chatPartner.textContent = `โพสต์: ${title} · ${partnerProf.name}`;
      updateTopbarAvatar(partnerProf.photo);
      if (firstMsg) await sendFirstMessageIfEmpty(firstMsg);
    } else {
      // โหมด inbox
      chatPartner.textContent = "เลือกบทสนทนาทางซ้ายเพื่อเริ่มคุย";
      updateTopbarAvatar(null);
      loadInboxRealtime();
    }
  } catch (e) {
    console.error("[boot error]", e);
    chatList.innerHTML = `<div style="padding:12px;color:#c00;">โหลดไม่สำเร็จ: ${escapeHtml(e?.message || e)}</div>`;
  }
});

/* ดูโปรไฟล์ตัวเองแบบ realtime */
function watchMyProfileRealtime(uid) {
  if (unsubMyProfile) unsubMyProfile();
  const ref = doc(db, "users_create", uid);
  unsubMyProfile = onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      const d = snap.data();
      setHeaderProfile({ name: d.displayName || d.name || d.email || "ผู้ใช้", photo: d.photoURL || "" });
    }
  });
}

/* 📬 Inbox realtime (จัดกลุ่มตามโพสต์) */
function loadInboxRealtime() {
  if (unsubInbox) unsubInbox();
  chatList.innerHTML = `<div style="padding:12px;color:#2e7d32;">กำลังโหลดรายการ...</div>`;

  const qy = query(
    collection(db, "conversations"),
    where("participants", "array-contains", currentUserId)
  );

  unsubInbox = onSnapshot(qy, async (snap) => {
    const convos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!convos.length) {
      chatList.innerHTML = `<div style="padding:12px;color:#6b7a7a;">ยังไม่มีข้อความ</div>`;
      return;
    }

    // เตรียมชื่อคู่คุยทุกคนล่วงหน้า
    const uids = new Set();
    convos.forEach(c => {
      const other = (c.participants || []).find(u => u !== currentUserId);
      if (other) uids.add(other);
    });
    await Promise.all([...uids].map(uid => getUserProfile(uid)));

    renderInboxGrouped(convos);
  }, (err) => {
    console.error("[inbox onSnapshot]", err);
    chatList.innerHTML = `<div style="padding:12px;color:#c00;">โหลด Inbox ไม่สำเร็จ: ${escapeHtml(err?.message || err)}</div>`;
  });
}

function renderInboxGrouped(convos) {
  chatList.innerHTML = "";

  // กลุ่มตาม postId (หรือ postTitle)
  const groups = new Map();
  for (const c of convos) {
    const key = c.postId || `__title__:${c.postTitle || "(ไม่มีชื่อโพสต์)"}`;
    if (!groups.has(key)) groups.set(key, { title: c.postTitle || "(ไม่มีชื่อโพสต์)", items: [] });
    groups.get(key).items.push(c);
  }

  // เรียงภายในกลุ่มตาม updatedAt ใหม่ก่อน
  for (const g of groups.values()) {
    g.items.sort((a,b) => (b.updatedAt?.seconds||0) - (a.updatedAt?.seconds||0));
  }

  // วาด
  for (const [key, group] of groups) {
    const header = document.createElement("div");
    header.className = "chat-group-title";
    header.textContent = group.title;
    chatList.appendChild(header);

    for (const c of group.items) {
      const otherUid = (c.participants || []).find(u => u !== currentUserId) || null;
      const prof = otherUid ? (profileCache.get(otherUid) || {name:"ผู้ใช้", photo:""}) : {name:"ผู้ใช้", photo:""};

      const item = document.createElement("div");
      item.className = "chat-item";
      item.innerHTML = `
        <span class="avatar">${prof.photo ? `<img src="${prof.photo}" alt="${escapeHtml(prof.name)}"/>` : "👤"}</span>
        <div class="chat-info">
          <p class="chat-name">${escapeHtml(prof.name)}</p>
          <p class="chat-preview">${escapeHtml(c.lastMessage || "")}</p>
        </div>
      `;
      item.addEventListener("click", () => {
        [...chatList.querySelectorAll(".chat-item")].forEach(el => el.classList.remove("active"));
        item.classList.add("active");
        partnerId = otherUid;
        chatPartner.textContent = `โพสต์: ${group.title} · ${prof.name}`;
        updateTopbarAvatar(prof.photo);
        openChatById(c.id);
      });
      chatList.appendChild(item);
    }
  }

  // auto เลือกบทสนทนาแรก
  const first = chatList.querySelector(".chat-item");
  if (first) first.click();
}

/* 🔎 เปิดห้องด้วย id แล้วฟัง realtime */
function openChatById(cid) {
  conversationId = cid;
  listenConversation(cid);
}

function listenConversation(cid) {
  if (unsubConversation) unsubConversation();
  const ref = doc(db, "conversations", cid);
  unsubConversation = onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      chatBody.innerHTML = `<div style="padding:12px;color:#c00;">ไม่พบห้องสนทนา</div>`;
      return;
    }
    const data = snap.data();
    const msgs = (data.messages || []).slice().sort((a,b) => (a.createdAt?.seconds||0) - (b.createdAt?.seconds||0));

    chatBody.innerHTML = "";
    for (const m of msgs) {
      const div = document.createElement("div");
      div.className = `message ${m.senderId === currentUserId ? "sent" : "received"}`;
      div.textContent = m.text;
      chatBody.appendChild(div);
    }
    scrollToBottom();
  }, (err) => {
    console.error("[listenConversation]", err);
    chatBody.innerHTML = `<div style="padding:12px;color:#c00;">โหลดบทสนทนาไม่สำเร็จ: ${escapeHtml(err?.message || err)}</div>`;
  });
}

/* 🗣️ เปิดห้องแบบ direct (จาก Postview) */
async function openDirectChat(partner) {
  // Firestore ยังไม่รองรับ multi array-contains พร้อมกัน
  // จึงดึงห้องที่เรามีส่วนร่วมทั้งหมด แล้วหา partner ใน client
  const qy = query(collection(db, "conversations"), where("participants", "array-contains", currentUserId));
  const snap = await getDocs(qy);
  const found = snap.docs.find(d => (d.data().participants || []).includes(partner));

  if (found) {
    conversationId = found.id;
    listenConversation(conversationId);
  } else {
    const ref = await addDoc(collection(db, "conversations"), {
      participants: [currentUserId, partner],
      postId: postId || null,
      postTitle: title || "(ไม่มีชื่อโพสต์)",
      lastMessage: "",
      messages: [],
      updatedAt: serverTimestamp()
    });
    conversationId = ref.id;
    listenConversation(conversationId);
  }
}

/* ✉️ ส่งข้อความ */
sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !conversationId) return;
  try {
    const ref = doc(db, "conversations", conversationId);
    await updateDoc(ref, {
      messages: arrayUnion({ senderId: currentUserId, text, createdAt: Timestamp.now() }),
      lastMessage: text,
      updatedAt: serverTimestamp()
    });
    messageInput.value = "";
  } catch (e) {
    console.error("[sendMessage]", e);
    alert("ส่งข้อความไม่สำเร็จ: " + (e?.message || e));
  }
}

/* 🧷 ส่งข้อความแรก (ถ้าห้องยังว่าง และมี msg จาก URL) */
async function sendFirstMessageIfEmpty(text) {
  const ref = doc(db, "conversations", conversationId);
  const snap = await getDoc(ref);
  const arr = snap.data()?.messages || [];
  if (arr.length === 0) {
    await updateDoc(ref, {
      messages: arrayUnion({ senderId: currentUserId, text, createdAt: Timestamp.now() }),
      lastMessage: text,
      updatedAt: serverTimestamp()
    });
  }
}
