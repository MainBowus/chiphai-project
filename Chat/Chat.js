// Chat.js — Realtime chat (แสดงชื่อ displayName, รูปโปร, แยกตามโพสต์)
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, getDocs,
  query, where, addDoc, updateDoc, onSnapshot,
  serverTimestamp, arrayUnion, setDoc, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

/* 🔧 Firebase Config */
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
let partnerId  = params.get("partner"); // ถ้ามี → โหมด direct chat
const postId   = params.get("post") || null;
const title    = params.get("title") || "(ไม่มีชื่อโพสต์)";
const firstMsg = params.get("msg")   || null;

/* ⚙️ State */
let currentUserId = null;
let conversationId = null;
let unsubConversation = null;
let unsubMyProfile = null;
const userProfileCache = new Map();

/* 🧩 Helper */
function updateTopbarAvatar(photoURL) {
  const avatar = document.querySelector(".chat-topbar .avatar");
  if (avatar) avatar.innerHTML = photoURL ? `<img src="${photoURL}" alt="avatar"/>` : "👥";
}
function scrollToBottom() {
  chatBody.scrollTop = chatBody.scrollHeight;
}
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[m]);
}

/* 🧠 ดึงข้อมูลผู้ใช้จาก Firestore */
async function getUserProfile(uid) {
  if (!uid) return { name: "ไม่ทราบผู้ใช้", photo: null };
  if (userProfileCache.has(uid)) return userProfileCache.get(uid);
  try {
    const ref = doc(db, "users_create", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      const prof = {
        name: data.displayName || data.name || data.email || "ผู้ใช้",
        photo: data.photoURL || ""
      };
      userProfileCache.set(uid, prof);
      return prof;
    } else {
      const prof = { name: "ไม่พบข้อมูลผู้ใช้", photo: "" };
      userProfileCache.set(uid, prof);
      return prof;
    }
  } catch (err) {
    console.error("getUserProfile error:", err);
    return { name: "โหลดไม่สำเร็จ", photo: "" };
  }
}

/* 🎯 แสดงชื่อโปรไฟล์ผู้ใช้ปัจจุบัน */
function setHeaderProfile(user) {
  const nameEl = document.querySelector(".profile-name");
  const avatarEl = document.querySelector(".profile .avatar");
  if (!user) return;
  if (nameEl) nameEl.textContent = user.name || "User";
  if (avatarEl) {
    avatarEl.innerHTML = user.photo
      ? `<img src="${user.photo}" alt="avatar"/>`
      : "👤";
  }
}

/* 👤 ดึงชื่อผู้ใช้ปัจจุบันจาก Firestore */
async function watchMyProfileRealtime(uid) {
  if (unsubMyProfile) unsubMyProfile();
  const ref = doc(db, "users_create", uid);
  unsubMyProfile = onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      const d = snap.data();
      setHeaderProfile({
        name: d.displayName || d.name || d.email || "ผู้ใช้",
        photo: d.photoURL || ""
      });
    } else {
      setHeaderProfile({ name: "ไม่พบข้อมูลผู้ใช้", photo: "" });
    }
  }, (err) => {
    console.error("watchMyProfileRealtime error:", err);
  });
}

/* 🚀 Auth + เริ่มต้น */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    await signInAnonymously(auth);
    return;
  }

  currentUserId = user.uid;
  await watchMyProfileRealtime(currentUserId);

  if (partnerId) {
    await openDirectChat(partnerId);
    const partnerProf = await getUserProfile(partnerId);
    chatPartner.textContent = `โพสต์: ${title} · ${partnerProf.name}`;
    updateTopbarAvatar(partnerProf.photo);
    if (firstMsg) await sendFirstMessageIfEmpty(firstMsg);
  } else {
    chatPartner.textContent = "เลือกบทสนทนาทางซ้ายเพื่อเริ่มคุย";
    updateTopbarAvatar(null);
    await loadInbox();
  }
});

/* 📬 โหลด Inbox (กลุ่มตามโพสต์) */
async function loadInbox() {
  chatList.innerHTML = `<div class="chat-item"><div class="chat-info">กำลังโหลด...</div></div>`;
  try {
    const q = query(collection(db, "conversations"), where("participants", "array-contains", currentUserId));
    const snap = await getDocs(q);
    const convos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    chatList.innerHTML = "";

    if (!convos.length) {
      chatList.innerHTML = `<div class="chat-item"><div class="chat-info">ยังไม่มีข้อความ</div></div>`;
      return;
    }

    const groups = new Map();
    for (const c of convos) {
      const key = c.postId || `noPost-${c.id}`;
      if (!groups.has(key)) groups.set(key, { title: c.postTitle || "(ไม่มีชื่อโพสต์)", items: [] });
      groups.get(key).items.push(c);
    }

    for (const [k, g] of groups) {
      const header = document.createElement("div");
      header.className = "chat-group-title";
      header.textContent = g.title;
      chatList.appendChild(header);

      for (const c of g.items) {
        const otherUid = (c.participants || []).find(u => u !== currentUserId);
        const prof = await getUserProfile(otherUid);
        const item = document.createElement("div");
        item.className = "chat-item";
        item.innerHTML = `
          <span class="avatar">${prof.photo ? `<img src="${prof.photo}" alt="${prof.name}"/>` : "👤"}</span>
          <div class="chat-info">
            <p class="chat-name">${escapeHtml(prof.name)}</p>
            <p class="chat-preview">${escapeHtml(c.lastMessage || "")}</p>
          </div>`;
        item.addEventListener("click", () => openChatFromInbox(c.id, g.title, otherUid, prof));
        chatList.appendChild(item);
      }
    }
  } catch (err) {
    console.error("loadInbox error:", err);
    chatList.innerHTML = `<div class="chat-item"><div class="chat-info">โหลดไม่สำเร็จ</div></div>`;
  }
}

/* 📄 เปิดห้องจาก Inbox */
function openChatFromInbox(cid, title, partnerUid, prof) {
  conversationId = cid;
  partnerId = partnerUid;
  chatPartner.textContent = `โพสต์: ${title} · ${prof.name}`;
  updateTopbarAvatar(prof.photo);
  listenConversation(cid);
}

/* 📡 ฟังการเปลี่ยนแปลงข้อความ realtime */
function listenConversation(cid) {
  if (unsubConversation) unsubConversation();
  const ref = doc(db, "conversations", cid);
  unsubConversation = onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    const msgs = (data.messages || []).sort((a,b) => (a.createdAt?.seconds||0)-(b.createdAt?.seconds||0));
    chatBody.innerHTML = "";
    for (const m of msgs) {
      const el = document.createElement("div");
      el.className = `message ${m.senderId === currentUserId ? "sent" : "received"}`;
      el.textContent = m.text;
      chatBody.appendChild(el);
    }
    scrollToBottom();
  });
}

/* 🗣️ เปิดห้องตรง (จาก Postview) */
async function openDirectChat(partner) {
  const q = query(collection(db, "conversations"), where("participants", "array-contains", currentUserId));
  const snap = await getDocs(q);
  const found = snap.docs.find(d => (d.data().participants || []).includes(partner));
  if (found) {
    conversationId = found.id;
    listenConversation(conversationId);
  } else {
    const ref = await addDoc(collection(db, "conversations"), {
      participants: [currentUserId, partner],
      postId: postId,
      postTitle: title,
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
  const ref = doc(db, "conversations", conversationId);
  await updateDoc(ref, {
    messages: arrayUnion({ senderId: currentUserId, text, createdAt: Timestamp.now() }),
    lastMessage: text,
    updatedAt: serverTimestamp()
  });
  messageInput.value = "";
}

/* ส่งข้อความแรก (จากปุ่ม Message ในโพสต์) */
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
