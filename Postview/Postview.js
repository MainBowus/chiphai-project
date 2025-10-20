// Postview.js — เจ้าของกด Message = เข้า Inbox, คนอื่นกด = คุยกับเจ้าของโพสต์
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

/* Firebase config */
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
const db  = getFirestore(app);
const auth= getAuth(app);

/* Utils */
const $ = (sel) => document.querySelector(sel);
const params = new URLSearchParams(location.search);
const id = params.get("id");

function parseFoundAt(foundAt) {
  if (!foundAt) return null;
  if (typeof foundAt.toDate === "function") return foundAt.toDate();
  if (foundAt.seconds) return new Date(foundAt.seconds * 1000);
  const d = new Date(foundAt);
  return isNaN(d) ? null : d;
}
const formatDateTH = (dt) => dt ? dt.toLocaleDateString("th-TH", { day:"2-digit", month:"2-digit", year:"numeric" }) : "-";
const formatTimeTH = (dt) => dt ? dt.toLocaleTimeString("th-TH", { hour:"2-digit", minute:"2-digit" }) : "-";
function setInfoValue(labelText, value) {
  for (const g of document.querySelectorAll(".info-group")) {
    const labelEl = g.querySelector(".info-label");
    if (labelEl && labelEl.textContent.trim().toLowerCase().includes(labelText.toLowerCase())) {
      const valEl = g.querySelector(".info-value");
      if (valEl) valEl.textContent = value ?? "-";
      break;
    }
  }
}
function renderError(msg) {
  const main = document.querySelector("main");
  if (main) {
    main.innerHTML = `
      <div class="postview-main">
        <div class="postview-right" style="width:100%">
          <h1 class="item-name">ไม่พบข้อมูลโพสต์</h1>
          <div class="info-group"><div class="info-value" style="color:#c00">${msg}</div></div>
          <button class="message-btn" id="backToList">← กลับรายการ</button>
        </div>
      </div>`;
    document.getElementById("backToList")?.addEventListener("click", () => {
      window.location.href = "../Post/Post.html";
    });
  } else {
    alert(msg);
    window.location.href = "../Post/Post.html";
  }
}

/* Nav */
document.getElementById("logoBtn")?.addEventListener("click", () => {
  window.location.href = "../index.html";
});
document.getElementById("backBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  if (history.length > 1) history.back();
  else window.location.href = "../Post/Post.html";
});

/* Load */
if (!id) {
  renderError("ไม่มีพารามิเตอร์ id ใน URL (เช่น .../Postview.html?id=xxxx)");
} else {
  loadPost(id);
}

let createdByUid = null;

async function loadPost(docId) {
  try {
    const snap = await getDoc(doc(db, "lost_items", docId));
    if (!snap.exists()) return renderError("ไม่พบโพสต์นี้ในฐานข้อมูล");
    const data = snap.data();

    // UI
    $(".postview-left .username").textContent = data.createdByName || "User";
    const imgEl = $(".placeholder img");
    if (imgEl) {
      if (data.imageUrl) { imgEl.src = data.imageUrl; imgEl.alt = data.itemName || "item image"; imgEl.style.display = "block"; }
      else imgEl.style.display = "none";
    }
    $(".postview-right .item-name").textContent = data.itemName || "ไม่มีชื่อไอเท็ม";
    setInfoValue("Location", data.location || "-");
    const dt = parseFoundAt(data.foundAt);
    setInfoValue("Date", formatDateTH(dt));
    setInfoValue("Time", formatTimeTH(dt));
    setInfoValue("Description", data.description || "-");

    createdByUid = data.createdBy; //  เจ้าของโพสต์

    // ปุ่ม Message
    document.querySelector(".message-btn")?.addEventListener("click", () => {
      onAuthStateChanged(auth, async (user) => {
        if (!user) { await signInAnonymously(auth); return; }
        const me = user.uid;

        if (me === createdByUid) {
          // เจ้าของโพสต์ → เปิด Inbox (ไม่ส่ง partner)
          const url = new URL("../Chat/Chat.html", window.location.href);
          url.searchParams.set("post", docId);
          url.searchParams.set("title", data.itemName || "โพสต์");
          window.location.href = url.toString();
        } else {
          // ผู้ใช้คนอื่น → เปิดแชต 1-1 กับเจ้าของ
          const url = new URL("../Chat/Chat.html", window.location.href);
          url.searchParams.set("partner", createdByUid);
          url.searchParams.set("post", docId);
          url.searchParams.set("title", data.itemName || "โพสต์");
          const autoMsg = `สวัสดี ฉันอยากสอบถามรายละเอียดของ “${data.itemName || "-"}” หน่อยได้ไหม`;
          url.searchParams.set("msg", autoMsg);
          window.location.href = url.toString();
        }
      });
    });
  } catch (err) {
    console.error("[postview] load error:", err);
    renderError(err?.message || String(err));
  }
}
