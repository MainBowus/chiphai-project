// Chat.js — แชตแสดงชื่อผู้คุย (displayName) และชื่อโพสต์ (itemName)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc, getDoc, query,
  where, orderBy, onSnapshot, serverTimestamp, updateDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const chatList = document.getElementById("chatList");
const chatBody = document.getElementById("chatBody");
const chatPartner = document.getElementById("chatPartner");
const sendBtn = document.getElementById("sendBtn");
const messageInput = document.getElementById("messageInput");

/* ---------- Utils ---------- */
const params = new URLSearchParams(location.search);
const postId = params.get("post");
const partnerId = params.get("partner");
const postTitle = params.get("title") || "โพสต์";
const firstMsg = params.get("msg");

let me = null;
let activeConversationId = null;

/* ---------- Sign In ---------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    await signInAnonymously(auth);
    return;
  }
  me = user.uid;
  loadInbox();
});

/* ---------- Load Inbox ---------- */
async function loadInbox() {
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", me),
    orderBy("updatedAt", "desc")
  );

  onSnapshot(q, async (snap) => {
    chatList.innerHTML = "";
    for (const docSnap of snap.docs) {
      const convo = docSnap.data();
      const otherId = convo.participants.find((id) => id !== me);

      // ดึงชื่ออีกฝ่ายจาก users_create
      const userRef = doc(db, "users_create", otherId);
      const userSnap = await getDoc(userRef);
      const userName = userSnap.exists() ? userSnap.data().displayName : "ไม่ทราบชื่อ";

      const item = document.createElement("div");
      item.classList.add("chat-item");
      item.innerHTML = `
        <span class="avatar">👥</span>
        <div class="chat-info">
          <p class="chat-name">${userName}</p>
          <p class="chat-preview">${convo.postTitle || "-"} • ${convo.lastMessage || ""}</p>
        </div>
      `;
      item.onclick = () => openConversation(docSnap.id, convo.postTitle || "-", userName, otherId);
      chatList.appendChild(item);
    }

    // ถ้ามี partner จาก query string → เปิดคุยเลย
    if (partnerId) openOrCreateConversation(partnerId, postId, postTitle);
  });
}

/* ---------- เปิดห้องแชต ---------- */
async function openConversation(convoId, postTitle, userName, partnerUid) {
  activeConversationId = convoId;
  chatPartner.textContent = `โพสต์: ${postTitle} · ${userName}`;
  chatBody.innerHTML = "";

  const msgCol = collection(db, "conversations", convoId, "messages");
  const q = query(msgCol, orderBy("createdAt", "asc"));

  onSnapshot(q, (snap) => {
    chatBody.innerHTML = "";
    snap.forEach((msg) => {
      const data = msg.data();
      const div = document.createElement("div");
      div.classList.add("message", data.sender === me ? "sent" : "received");
      div.textContent = data.text;
      chatBody.appendChild(div);
    });
    chatBody.scrollTop = chatBody.scrollHeight;
  });

  sendBtn.onclick = async () => {
    const text = messageInput.value.trim();
    if (!text) return;
    await sendMessage(convoId, text);
  };
}

/* ---------- สร้างห้องใหม่ (คนอื่นกด Message จากโพสต์) ---------- */
async function openOrCreateConversation(partnerUid, postId, postTitle) {
  const convoRef = collection(db, "conversations");
  const q = query(convoRef, where("participants", "array-contains", me));
  const snap = await getDoc(doc(db, "users_create", partnerUid));
  const partnerName = snap.exists() ? snap.data().displayName : "ผู้ใช้";

  // สร้างห้องใหม่
  const newConvo = await addDoc(convoRef, {
    participants: [me, partnerUid],
    postId: postId,
    postTitle: postTitle,
    lastMessage: firstMsg || "",
    updatedAt: serverTimestamp()
  });

  activeConversationId = newConvo.id;
  if (firstMsg) await sendMessage(newConvo.id, firstMsg);
  openConversation(newConvo.id, postTitle, partnerName, partnerUid);
}

/* ---------- ส่งข้อความ ---------- */
async function sendMessage(convoId, text) {
  const msgCol = collection(db, "conversations", convoId, "messages");
  await addDoc(msgCol, {
    sender: me,
    text: text,
    createdAt: serverTimestamp()
  });

  await updateDoc(doc(db, "conversations", convoId), {
    lastMessage: text,
    updatedAt: serverTimestamp()
  });

  messageInput.value = "";
  chatBody.scrollTop = chatBody.scrollHeight;
}
