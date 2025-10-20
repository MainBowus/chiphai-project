// Chat.js — Inbox แยกตาม itemName และแสดง displayName ของคู่คุย
import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc, query, where,
  getDocs, onSnapshot, serverTimestamp, updateDoc, getDoc, setDoc,
  arrayUnion, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

/* ===== Firebase Config ===== */
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

/* ===== UI ===== */
const chatList     = document.getElementById("chatList");
const chatBody     = document.getElementById("chatBody");
const messageInput = document.getElementById("messageInput");
const sendBtn      = document.getElementById("sendBtn");
const chatPartner  = document.getElementById("chatPartner");

/* ===== URL Params ===== */
const params   = new URLSearchParams(location.search);
let partnerId  = params.get("partner"); // ถ้ามี = direct chat, ถ้าไม่มี = inbox
const postId   = params.get("post") || null;
const title    = params.get("title") || "(ไม่มีชื่อโพสต์)";
const firstMsg = params.get("msg")   || null;

/* ===== State ===== */
let currentUserId   = null;
let conversationId  = null;
let unsubConversation = null;
const USE_ANON_FOR_DEV = true;
const MAX_MESSAGES = 200;

/* ===== users_create helpers (เอา displayName) ===== */
const userNameCache = new Map();

function pickBestName(u) {
  return (
    u?.displayName ||
    u?.name ||
    u?.fullName ||
    (u?.firstName && u?.lastName ? `${u.firstName} ${u.lastName}` : null) ||
    u?.username ||
    u?.email ||
    "ผู้ใช้"
  );
}

async function resolveUserName(uid) {
  if (!uid) return "ผู้ใช้";
  if (userNameCache.has(uid)) return userNameCache.get(uid);

  try {
    // 1) doc id = uid
    const snap = await getDoc(doc(db, "users_create", uid));
    if (snap.exists()) {
      const name = pickBestName(snap.data());
      userNameCache.set(uid, name);
      return name;
    }
  } catch {}

  // 2) ฟิลด์ที่อาจเก็บ uid
  const candidates = ["uid", "userId", "id"];
  for (const f of candidates) {
    try {
      const qSnap = await getDocs(query(collection(db, "users_create"), where(f, "==", uid)));
      if (!qSnap.empty) {
        const name = pickBestName(qSnap.docs[0].data());
        userNameCache.set(uid, name);
        return name;
      }
    } catch {}
  }

  userNameCache.set(uid, "ผู้ใช้");
  return "ผู้ใช้";
}

/* ===== Boot / Auth ===== */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    if (USE_ANON_FOR_DEV) { await signInAnonymously(auth); return; }
    alert("กรุณาเข้าสู่ระบบก่อนใช้งานแชต"); location.href="../index.html"; return;
  }
  currentUserId = user.uid;

  if (partnerId) {
    // โหมด A: เปิดห้องกับ partner โดยตรง
    await openDirectChat(partnerId);
    const partnerName = await resolveUserName(partnerId);
    chatPartner.textContent = `โพสต์: ${title} · ${partnerName}`;
    if (firstMsg) { await sendFirstMessageIfEmpty(firstMsg); }
  } else {
    // โหมด B: Inbox
    chatPartner.textContent = "เลือกบทสนทนาทางซ้ายเพื่อเริ่มคุย";
    await loadInbox();
  }
});

/* ===== โหมด A: หา/สร้างห้อง + listen เอกสารเดียว ===== */
async function openDirectChat(partner) {
  try {
    const qy = query(collection(db, "conversations"), where("participants", "array-contains", currentUserId));
    const snap = await getDocs(qy);
    const found = snap.docs.find(d => (d.data().participants || []).includes(partner));

    if (found) {
      conversationId = found.id;

      const d = found.data();
      if (!d.postTitle && title) {
        await updateDoc(doc(db, "conversations", conversationId), { postTitle: title });
      }
    } else {
      const ref = await addDoc(collection(db, "conversations"), {
        participants: [currentUserId, partner],
        userA: currentUserId,
        userB: partner,
        postId: postId,
        postTitle: title || "(ไม่มีชื่อโพสต์)",
        lastMessage: "",
        updatedAt: serverTimestamp(),
        messages: []
      });
      conversationId = ref.id;
    }
    listenConversationDoc(conversationId);
  } catch (e) {
    console.error("openDirectChat error:", e);
    alert("ไม่สามารถเปิดห้องคุยได้: " + (e?.message || e));
  }
}

/* ส่งข้อความตั้งต้น ถ้า array ยังว่าง */
async function sendFirstMessageIfEmpty(text) {
  const ref = doc(db, "conversations", conversationId);
  const cur = await getDoc(ref);
  const arr = (cur.data()?.messages || []);
  if (arr.length === 0) {
    await appendMessage(ref, {
      senderId: currentUserId,
      text,
      createdAt: Timestamp.now()
    });
  }
}

/* ===== โหมด B: Inbox (แยกเป็นกลุ่มตาม itemName / postTitle) ===== */
async function loadInbox() {
  try {
    const qy = query(collection(db, "conversations"), where("participants", "array-contains", currentUserId));
    const snap = await getDocs(qy);
    const convos = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Prefetch ชื่อของทุก otherUid
    const uidSet = new Set();
    for (const c of convos) {
      const otherUid = (c.participants || []).find(uid => uid !== currentUserId);
      if (otherUid) uidSet.add(otherUid);
    }
    await Promise.all([...uidSet].map(uid => resolveUserName(uid)));

    renderInboxGrouped(convos);
  } catch (e) {
    console.error("loadInbox error:", e);
    alert("โหลดรายการไม่สำเร็จ: " + (e?.message || e));
  }
}

/* กลุ่มตาม postId/postTitle และแสดงชื่อ displayName */
function renderInboxGrouped(convos) {
  chatList.innerHTML = "";
  if (!convos.length) {
    chatList.innerHTML = `<div class="chat-item"><div class="meta"><div class="name">ยังไม่มีข้อความเข้า</div><div class="preview">เมื่อมีคนทักหาโพสต์ของคุณ จะแสดงที่นี่</div></div></div>`;
    return;
  }

  // จัดกลุ่มตาม postId/postTitle
  const groups = new Map();
  for (const c of convos) {
    const key = c.postId || `__title__:${c.postTitle || "(ไม่มีชื่อโพสต์)"}`;
    if (!groups.has(key)) groups.set(key, { title: c.postTitle || "(ไม่มีชื่อโพสต์)", items: [] });
    groups.get(key).items.push(c);
  }

  // เรียงในกลุ่มตาม updatedAt ใหม่ก่อน
  for (const g of groups.values()) {
    g.items.sort((a,b) => (b.updatedAt?.seconds||0) - (a.updatedAt?.seconds||0));
  }

  // วาด UI: หัวกลุ่ม (itemName) แล้วตามด้วยบทสนทนาในโพสต์นั้น
  for (const [key, group] of groups) {
    const header = document.createElement("div");
    header.className = "chat-group-title";
    header.textContent = group.title;
    chatList.appendChild(header);

    for (const c of group.items) {
      const otherUid  = (c.participants || []).find(uid => uid !== currentUserId) || null;
      const otherName = otherUid ? (userNameCache.get(otherUid) || otherUid) : "ผู้ใช้";

      const item = document.createElement("div");
      item.className = "chat-item";
      item.innerHTML = `
        <div class="avatar">👤</div>
        <div class="meta">
          <div class="name">${otherName}</div>
          <div class="preview">${c.lastMessage || ""}</div>
        </div>
      `;
      item.addEventListener("click", async () => {
        // active state
        [...chatList.querySelectorAll(".chat-item")].forEach(el => el.classList.remove("active"));
        item.classList.add("active");

        partnerId = otherUid || null;
        chatPartner.textContent = `โพสต์: ${group.title}${otherName ? " · " + otherName : ""}`;

        conversationId = c.id;
        listenConversationDoc(conversationId);
      });

      chatList.appendChild(item);
    }
  }

  // auto เลือกบทสนทนาแรกของกลุ่มแรก
  const first = chatList.querySelector(".chat-item");
  if (first) first.click();
}

/* ===== Listen เอกสาร conversations/{cid} แล้วเรนเดอร์จาก messages array ===== */
function listenConversationDoc(cid) {
  if (unsubConversation) { unsubConversation(); unsubConversation = null; }

  const ref = doc(db, "conversations", cid);
  unsubConversation = onSnapshot(ref, (snap) => {
    const data = snap.data();
    const msgs = (data?.messages || []).sort((a, b) => {
      const ta = a.createdAt?.seconds || 0;
      const tb = b.createdAt?.seconds || 0;
      return ta - tb;
    });

    chatBody.innerHTML = "";
    for (const m of msgs) {
      const div = document.createElement("div");
      div.classList.add("message", m.senderId === currentUserId ? "sent" : "received");
      div.textContent = m.text;
      chatBody.appendChild(div);
    }
    chatBody.scrollTop = chatBody.scrollHeight;
  }, (err) => {
    console.error("listenConversationDoc error:", err);
    alert("ไม่สามารถโหลดบทสนทนาได้: " + (err?.message || err));
  });
}

/* ===== ส่งข้อความ ===== */
sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !conversationId) return;
  const ref = doc(db, "conversations", conversationId);

  await appendMessage(ref, {
    senderId: currentUserId,
    text,
    createdAt: Timestamp.now()
  });

  messageInput.value = "";
}

/* helper: append + อัปเดต lastMessage/updatedAt และจำกัดจำนวนข้อความต่อห้อง */
async function appendMessage(ref, msgObj) {
  await updateDoc(ref, {
    messages: arrayUnion(msgObj),
    lastMessage: msgObj.text,
    updatedAt: serverTimestamp()
  });

  try {
    const cur = await getDoc(ref);
    const arr = cur.data()?.messages || [];
    if (arr.length > MAX_MESSAGES) {
      const trimmed = arr.slice(-MAX_MESSAGES);
      await setDoc(ref, { messages: trimmed }, { merge: true });
    }
  } catch (e) {
    console.warn("trim messages error:", e);
  }
}
