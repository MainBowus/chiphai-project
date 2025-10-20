// Postview.js — กด Message: เจ้าของโพสต์ = Inbox, คนอื่น = แชตกับเจ้าของโพสต์
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
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

/* ---------- Utils ---------- */
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
const formatDateTH = (dt) =>
  dt ? dt.toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-";
const formatTimeTH = (dt) =>
  dt ? dt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "-";

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
  main.innerHTML = `
    <div class="postview-main">
      <div class="postview-right" style="width:100%">
        <h1 class="item-name">ไม่พบข้อมูลโพสต์</h1>
        <div class="info-group">
          <div class="info-value" style="color:#c00">${msg}</div>
        </div>
        <button class="message-btn" id="backToList">← กลับรายการ</button>
      </div>
    </div>`;
  $("#backToList")?.addEventListener("click", () => (window.location.href = "../Post/Post.html"));
}

/* ---------- Navigation ---------- */
$("#logoBtn")?.addEventListener("click", () => (window.location.href = "../index.html"));
$("#backBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  if (history.length > 1) history.back();
  else window.location.href = "../Post/Post.html";
});

/* ---------- Main ---------- */
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
    createdByUid = data.createdBy;

    // UI
    $("#username").textContent = data.createdByName || "User";
    const imgEl = $(".placeholder img");
    if (imgEl) {
      if (data.imageUrl) {
        imgEl.src = data.imageUrl;
        imgEl.alt = data.itemName || "item image";
        imgEl.style.display = "block";
      } else imgEl.style.display = "none";
    }

    $("#itemName").textContent = data.itemName || "ไม่มีชื่อไอเท็ม";
    setInfoValue("Location", data.location || "-");
    const dt = parseFoundAt(data.foundAt);
    setInfoValue("Date", formatDateTH(dt));
    setInfoValue("Time", formatTimeTH(dt));
    setInfoValue("Description", data.description || "-");

    /* ---------- ปุ่ม Message ---------- */
    $("#messageBtn")?.addEventListener("click", () => {
      onAuthStateChanged(auth, async (user) => {
        if (!user) {
          try {
            await signInAnonymously(auth);
            return;
          } catch (err) {
            console.error("Anonymous sign-in failed:", err);
            alert("ไม่สามารถเข้าสู่ระบบชั่วคราวได้");
            return;
          }
        }

        const me = user.uid;
        const itemName = data.itemName || "โพสต์";
        const chatBase = new URL("../Chat/Chat.html", window.location.href);

        if (me === createdByUid) {
          // เจ้าของโพสต์ → Inbox
          chatBase.searchParams.set("post", docId);
          chatBase.searchParams.set("title", itemName);
        } else {
          // คนอื่น → แชตกับเจ้าของ
          chatBase.searchParams.set("partner", createdByUid);
          chatBase.searchParams.set("post", docId);
          chatBase.searchParams.set("title", itemName);
          const autoMsg = `สวัสดี ฉันอยากสอบถามรายละเอียดของ “${itemName}” หน่อยได้ไหม`;
          chatBase.searchParams.set("msg", autoMsg);
        }

        window.location.href = chatBase.toString();
      });
    });
  } catch (err) {
    console.error("[postview] load error:", err);
    renderError(err?.message || String(err));
  }
}
