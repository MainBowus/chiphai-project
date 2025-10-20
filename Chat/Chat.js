// Chat.js — แสดงชื่อผู้ใช้มุมขวา + inbox ตามโพสต์ + ชื่อ/รูปคู่คุย
import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc, query, where,
  getDocs, onSnapshot, serverTimestamp, updateDoc, getDoc, setDoc,
  arrayUnion, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

/* ===== Firebase ===== */
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

/* ===== UI refs ===== */
const chatList     = document.getElementById("chatList");
const chatBody     = document.getElementById("chatBody");
const messageInput = document.getElementById("messageInput");
const sendBtn      = document.getElementById("sendBtn");
const chatPartner  = document.getElementById("chatPartner");
const profileNameEl   = document.querySelector(".profile-name");
const profileAvatarEl = document.querySelector(".profile .avatar");

/* ===== URL ===== */
const params   = new URLSearchParams(location.search);
let partnerId  = params.get("partner");
const postId   = params.get("post") || null;
const title    = params.get("title") || "(ไม่มีชื่อโพสต์)";
const firstMsg = params.get("msg")   || null;
const DEBUG_UI = params.get("debug") === "1";

/* ===== State ===== */
let currentUserId   = null;
let conversationId  = null;
let unsubConversation = null;
let unsubMyProfile    = null;
const USE_ANON_FOR_DEV = true;
const MAX_MESSAGES = 200;

/* ===== Helpers ===== */
const userProfileCache = new Map(); // uid => { name, photo }

function log(...a){ console.log("[chat]", ...a); }
function warn(...a){ console.warn("[chat]", ...a); }
function err(...a){ console.error("[chat]", ...a); }

function pickBestName(u) {
  return (
    u?.displayName || u?.name || u?.fullName ||
    (u?.firstName && u?.lastName ? `${u.firstName} ${u.lastName}` : null) ||
    u?.username || u?.email || "ผู้ใช้"
  );
}
function toProfile(u) { return { name: pickBestName(u), photo: u?.photoURL || null }; }

function showDebugBanner(text){
  if(!DEBUG_UI) return;
  let el = document.getElementById("debug-banner");
  if(!el){
    el = document.createElement("div");
    el.id="debug-banner";
    el.style.cssText="position:fixed;left:12px;bottom:12px;background:#1b1f24;color:#e6f4ea;padding:8px 12px;border-radius:10px;font:12px/1.4 ui-monospace,monospace;z-index:9999;box-shadow:0 2px 10px rgba(0,0,0,.2)";
    document.body.appendChild(el);
  }
  el.textContent = text;
}

/* ===== Profile resolve for OTHER users ===== */
async function resolveUserProfile(uid) {
  if (!uid) return { name: "ผู้ใช้", photo: null };
  if (userProfileCache.has(uid)) return userProfileCache.get(uid);

  // 1) doc id = uid
  try {
    const snap = await getDoc(doc(db, "users_create", uid));
    if (snap.exists()) {
      const prof = toProfile(snap.data());
      userProfileCache.set(uid, prof);
      return prof;
    }
  } catch (e) { warn("profile doc read error", e); }

  // 2) where uid==uid
  try {
    const qSnap = await getDocs(query(collection(db, "users_create"), where("uid", "==", uid)));
    if (!qSnap.empty) {
      const prof = toProfile(qSnap.docs[0].data());
      userProfileCache.set(uid, prof);
      return prof;
    }
  } catch (e) { warn("profile query error", e); }

  const fallback = { name: "ผู้ใช้", photo: null };
  userProfileCache.set(uid, fallback);
  return fallback;
}

/* ===== Me (CURRENT user) header ===== */
function setHeaderProfile({name, photo}){
  if (profileNameEl) profileNameEl.textContent = name || "ผู้ใช้";
  if (profileAvatarEl){
    if (photo) profileAvatarEl.innerHTML = `<img src="${photo}" alt="${name||"user"}" />`;
    else profileAvatarEl.textContent = "👤";
  }
  showDebugBanner(`me: ${name || "ผู้ใช้"}`);
}

async function watchMyProfileRealtime(uid, authUser){
  // ยกเลิกตัวเก่า
  if (unsubMyProfile){ unsubMyProfile(); unsubMyProfile = null; }

  // 1) ลอง listen doc id = uid
  try{
    const ref = doc(db, "users_create", uid);
    unsubMyProfile = onSnapshot(ref, (snap)=>{
      if (snap.exists()){
        const d = snap.data();
        const prof = { name: pickBestName(d), photo: d?.photoURL || null };
        log("me profile (docId) →", prof);
        setHeaderProfile(prof);
      } else {
        // ถ้า doc นี้ไม่มี → fallback ไปขั้นต่อไป (query) / หรือใช้ auth
        log("me profile doc not found, try query(uid) / auth fallback");
      }
    }, (e)=>warn("me profile listen error (docId):", e));
  }catch(e){ warn("listen docId me error:", e); }

  // 2) ยิง query once เพื่อเติมชื่อถ้า docId ไม่มี
  try{
    const qSnap = await getDocs(query(collection(db, "users_create"), where("uid","==", uid)));
    if (!qSnap.empty){
      const d = qSnap.docs[0].data();
      const prof = { name: pickBestName(d), photo: d?.photoURL || null };
      log("me profile (query uid) →", prof);
      // set เฉพาะถ้ายังเป็นค่าเริ่มต้น
      if (profileNameEl && (profileNameEl.textContent === "Username" || profileNameEl.textContent === "ผู้ใช้" || profileNameEl.textContent === "")){
        setHeaderProfile(prof);
      }
      return; // ได้แล้วก็พอ
    }
  }catch(e){ warn("me profile query error:", e); }

  // 3) auth fallback
  const authFallbackName = authUser?.displayName || (authUser?.isAnonymous ? "ผู้ใช้ชั่วคราว" : "ไม่ทราบชื่อ");
  const authFallbackPhoto = authUser?.photoURL || null;
  log("me profile (auth fallback) →", authFallbackName);
  if (profileNameEl && (profileNameEl.textContent === "Username" || profileNameEl.textContent === "")){
    setHeaderProfile({name: authFallbackName, photo: authFallbackPhoto});
  }
}

/* ===== Auth ===== */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    if (USE_ANON_FOR_DEV) { await signInAnonymously(auth); return; }
    alert("กรุณาเข้าสู่ระบบก่อนใช้งานแชต");
    location.href="../index.html";
    return;
  }
  currentUserId = user.uid;
  log("signed-in:", currentUserId);
  showDebugBanner(`uid: ${currentUserId}`);

  // Header profile (ชื่อ + รูป) — realtime + fallback
  setHeaderProfile({name: "กำลังโหลด…", photo: null});
  await watchMyProfileRealtime(currentUserId, user);

  // โหมด
  if (partnerId) {
    await openDirectChat(partnerId);
    const partnerProf = await resolveUserProfile(partnerId);
    chatPartner.textContent = `โพสต์: ${title} · ${partnerProf.name}`;
    updateTopbarAvatar(partnerProf.photo);
    if (firstMsg) { await sendFirstMessageIfEmpty(firstMsg); }
  } else {
    chatPartner.textContent = "เลือกบทสนทนาทางซ้ายเพื่อเริ่มคุย";
    updateTopbarAvatar(null);
    await loadInbox();
  }
});

/* ===== Direct Chat ===== */
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
    err("openDirectChat error:", e);
    alert("ไม่สามารถเปิดห้องคุยได้: " + (e?.message || e));
  }
}

/* ===== Inbox ===== */
async function loadInbox() {
  try {
    const qy = query(collection(db, "conversations"), where("participants", "array-contains", currentUserId));
    const snap = await getDocs(qy);
    const convos = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const uidSet = new Set();
    for (const c of convos) {
      const otherUid = (c.participants || []).find(uid => uid !== currentUserId);
      if (otherUid) uidSet.add(otherUid);
    }
    await Promise.all([...uidSet].map(uid => resolveUserProfile(uid)));

    renderInboxGrouped(convos);
  } catch (e) {
    err("loadInbox error:", e);
    alert("โหลดรายการไม่สำเร็จ: " + (e?.message || e));
  }
}

function renderInboxGrouped(convos) {
  chatList.innerHTML = "";
  if (!convos.length) {
    chatList.innerHTML = `<div class="chat-item"><div class="meta"><div class="name">ยังไม่มีข้อความเข้า</div><div class="preview">เมื่อมีคนทักหาโพสต์ของคุณ จะแสดงที่นี่</div></div></div>`;
    return;
  }

  const groups = new Map();
  for (const c of convos) {
    const gKey = c.postId || `__title__:${c.postTitle || "(ไม่มีชื่อโพสต์)"}`;
    if (!groups.has(gKey)) groups.set(gKey, { title: c.postTitle || "(ไม่มีชื่อโพสต์)", items: [] });
    groups.get(gKey).items.push(c);
  }

  for (const g of groups.values()) {
    g.items.sort((a,b) => (b.updatedAt?.seconds||0) - (a.updatedAt?.seconds||0));
  }

  for (const [key, group] of groups) {
    const header = document.createElement("div");
    header.className = "chat-group-title";
    header.textContent = group.title;
    chatList.appendChild(header);

    for (const c of group.items) {
      const otherUid   = (c.participants || []).find(uid => uid !== currentUserId) || null;
      const prof       = otherUid ? (userProfileCache.get(otherUid) || { name: "ผู้ใช้", photo: null }) : { name: "ผู้ใช้", photo: null };

      const item = document.createElement("div");
      item.className = "chat-item";
      item.innerHTML = `
        <div class="avatar">
          ${prof.photo ? `<img src="${prof.photo}" alt="${prof.name}" />` : "👤"}
        </div>
        <div class="meta">
          <div class="name">${prof.name}</div>
          <div class="preview">${c.lastMessage || ""}</div>
        </div>
      `;
      item.addEventListener("click", async () => {
        [...chatList.querySelectorAll(".chat-item")].forEach(el => el.classList.remove("active"));
        item.classList.add("active");

        partnerId = otherUid || null;
        chatPartner.textContent = `โพสต์: ${group.title}${prof.name ? " · " + prof.name : ""}`;
        updateTopbarAvatar(prof.photo);

        conversationId = c.id;
        listenConversationDoc(conversationId);
      });

      chatList.appendChild(item);
    }
  }

  const first = chatList.querySelector(".chat-item");
  if (first) first.click();
}

/* ===== Topbar avatar ===== */
function updateTopbarAvatar(photoURL) {
  const avatarEl = document.querySelector(".chat-topbar .avatar");
  if (!avatarEl) return;
  if (photoURL) avatarEl.innerHTML = `<img src="${photoURL}" alt="avatar" />`;
  else avatarEl.textContent = "👥";
}

/* ===== Listen to conversation ===== */
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
  }, (e)=>{
    err("listenConversationDoc error:", e);
  });
}

/* ===== Send message ===== */
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
