// Postview.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/* ---------- Firebase config---------- */
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

/* ---------- Utils ---------- */
const $ = (sel) => document.querySelector(sel);

function parseFoundAt(foundAt) {
  if (!foundAt) return null;
  if (typeof foundAt.toDate === "function") return foundAt.toDate(); // Firestore Timestamp
  if (foundAt.seconds) return new Date(foundAt.seconds * 1000);      // เผื่อกรณีได้รูป raw
  const d = new Date(foundAt);
  return isNaN(d) ? null : d;
}
function formatDateTH(dt) {
  if (!dt) return "-";
  return dt.toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function formatTimeTH(dt) {
  if (!dt) return "-";
  return dt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}
function setInfoValue(labelText, value) {
  const groups = document.querySelectorAll(".info-group");
  for (const g of groups) {
    const labelEl = g.querySelector(".info-label");
    if (!labelEl) continue;
    if (labelEl.textContent.trim().toLowerCase().includes(labelText.toLowerCase())) {
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
          <div class="info-group">
            <div class="info-value" style="color:#c00">${msg}</div>
          </div>
          <button class="message-btn" id="backToList">← กลับรายการ</button>
        </div>
      </div>
    `;
    document.getElementById("backToList")?.addEventListener("click", () => {
      window.location.href = "../Post/Post.html";
    });
  } else {
    alert(msg);
    window.location.href = "../Post/Post.html";
  }
}


document.getElementById("logoBtn")?.addEventListener("click", () => {
  window.location.href = "../index.html";
});
document.getElementById("backBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  if (history.length > 1) history.back();
  else window.location.href = "../Post/Post.html";
});

/* ---------- ดึง id จาก URL แล้วโหลดเอกสาร ---------- */
const params = new URLSearchParams(location.search);
const id = params.get("id");

if (!id) {
  renderError("ไม่มีพารามิเตอร์ id ใน URL (เช่น .../Postview.html?id=xxxx)");
} else {
  loadPost(id);
}

async function loadPost(docId) {
  try {
    const snap = await getDoc(doc(db, "lost_items", docId));
    if (!snap.exists()) {
      renderError("ไม่พบโพสต์นี้ในฐานข้อมูล");
      return;
    }
    const data = snap.data();


    const usernameEl = document.querySelector(".postview-left .username");
    if (usernameEl) usernameEl.textContent = data.createdByName || "User";

    const imgEl = document.querySelector(".placeholder img");
    if (imgEl) {
      if (data.imageUrl) {
        imgEl.src = data.imageUrl;
        imgEl.alt = data.itemName || "item image";
        imgEl.style.display = "block";
      } else {
        imgEl.style.display = "none";
      }
    }

    const itemNameEl = document.querySelector(".postview-right .item-name");
    if (itemNameEl) itemNameEl.textContent = data.itemName || "ไม่มีชื่อไอเท็ม";

    setInfoValue("Location", data.location || "-");

    const dt = parseFoundAt(data.foundAt);
    setInfoValue("Date", formatDateTH(dt));
    setInfoValue("Time", formatTimeTH(dt));
    setInfoValue("Description", data.description || "-");

    // ปุ่ม Message
    document.querySelector(".message-btn")?.addEventListener("click", () => {
      window.location.href = "../Chat/Chat.html";
    });
  } catch (err) {
    console.error("[postview] load error:", err);
    renderError(err?.message || String(err));
  }
}
