// Postview.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/* ---------- Utils ---------- */
const $ = (sel) => document.querySelector(sel);

const params = new URLSearchParams(location.search);
const id = params.get("id");

// (อัปเดต) Elements สำหรับ Custom Alert
const customAlert = document.getElementById("customAlert");
const customAlertMessage = document.getElementById("customAlertMessage");
const customAlertOkBtn = document.getElementById("customAlertOkBtn"); // ปุ่มตกลง
const customAlertCancelBtn = document.getElementById("customAlertCancelBtn"); // ปุ่มยกเลิก

function parseFoundAt(foundAt) {
  if (!foundAt) return null;
  if (typeof foundAt.toDate === "function") return foundAt.toDate();  // Firestore Timestamp
  if (foundAt.seconds) return new Date(foundAt.seconds * 1000);
  const d = new Date(foundAt);
  return isNaN(d) ? null : d;
}

const formatDateTH = (dt) =>
  dt
    ? dt.toLocaleDateString("th-TH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      })
    : "-";

const formatTimeTH = (dt) =>
  dt
    ? dt.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit"
      })
    : "-";

function setInfoValue(labelText, value) {
  for (const g of document.querySelectorAll(".info-group")) {
    const labelEl = g.querySelector(".info-label");
    if (
      labelEl &&
      labelEl.textContent.trim().toLowerCase().includes(labelText.toLowerCase())
    ) {
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
    </div>
  `;
  $("#backToList")?.addEventListener("click", () => {
    window.location.href = "../Post/Post.html";
  });
}

/* ---------- Global state ---------- */
let createdByUid = null;
let currentStatus = "open";
let currentUserUid = null;
let latestDocId = null;
let latestPostData = null;

/* ---------- Status UI ---------- */
function renderStatus(status) {
  const badge = $("#statusBadge");
  if (!badge) return;

  badge.classList.remove("status-open", "status-closed");

  if (status === "closed") {
    badge.textContent = "สถานะ: ของชิ้นนี้เจ้าของรับคืนแล้ว";
    badge.classList.add("status-closed");
  } else {
    badge.textContent = "สถานะ: กำลังตามหาเจ้าของ";
    badge.classList.add("status-open");
  }
}

/* ---------- ปุ่มด้านล่าง (Message / ปิดโพสต์) ---------- */
function updateActionButtonForCurrentUser() {
  const btn = $("#messageBtn");
  if (!btn || !latestDocId || !latestPostData) return;

  btn.classList.remove("btn-disabled");
  btn.disabled = false;

  // ถ้าโพสต์ปิดแล้ว → ใครมาก็เห็นว่าเจ้าของรับคืนแล้ว
  if (currentStatus === "closed") {
    btn.textContent = "ของชิ้นนี้เจ้าของรับคืนแล้ว";
    btn.disabled = true;
    btn.classList.add("btn-disabled");
    btn.onclick = null;
    return;
  }

  // ถ้าเป็นเจ้าของโพสต์
  if (currentUserUid && currentUserUid === createdByUid) {
    btn.textContent = "ยืนยันว่าเจ้าของรับคืนแล้ว";
    btn.onclick = () => {
    showCustomConfirm(
      "ยืนยันหรือไม่ว่าเจ้าของได้รับของกลับคืนแล้ว?\n(โพสต์นี้จะถูกปิดและไม่สามารถรับข้อความใหม่ได้)",
      async () => {
        try {
          await updateDoc(doc(db, "lost_items", latestDocId), {
            status: "closed",
            closedAt: serverTimestamp()
          });

          currentStatus = "closed";
          renderStatus(currentStatus);
          updateActionButtonForCurrentUser();

          showCustomAlert("บันทึกเรียบร้อยแล้ว ✅");
        } catch (err) {
          console.error("Update status failed:", err);
          showCustomAlert("ไม่สามารถอัปเดตสถานะได้ ลองใหม่อีกครั้ง");
        }
      },
      true // ให้ปุ่ม "ตกลง" เป็นสีส้ม
    );
  };
  } else {
    // คนอื่น (ไม่ใช่เจ้าของโพสต์) → ปุ่ม Message
    btn.textContent = "Message";
    btn.onclick = async () => {
      try {
        let user = auth.currentUser;

        // ถ้ายังไม่มี user ให้ล็อกอินแบบ anonymous
        if (!user) {
          await signInAnonymously(auth);
          user = auth.currentUser;
        }

        if (!user) {
          showCustomAlert("ไม่สามารถเข้าสู่ระบบชั่วคราวได้");
          return;
        }

        const me = user.uid;
        const itemName = latestPostData.itemName || "โพสต์";
        const chatBase = new URL("../Chat/Chat.html", window.location.href);

        if (me === createdByUid) {
          // เผื่อกรณีคนเป็นเจ้าของหลังจาก anon sign-in
          chatBase.searchParams.set("post", latestDocId);
          chatBase.searchParams.set("title", itemName);
        } else {
          chatBase.searchParams.set("partner", createdByUid);
          chatBase.searchParams.set("post", latestDocId);
          chatBase.searchParams.set("title", itemName);

          const autoMsg = `สวัสดี ฉันอยากสอบถามรายละเอียดของ “${itemName}” หน่อยได้ไหม`;
          chatBase.searchParams.set("msg", autoMsg);
        }

        window.location.href = chatBase.toString();
      } catch (err) {
        console.error("Anonymous sign-in failed:", err);
        showCustomAlert("ไม่สามารถเข้าสู่ระบบชั่วคราวได้");
      }
    };
  }
}

/* ---------- Main: โหลดโพสต์ ---------- */
async function loadPost(docId) {
  try {
    const snap = await getDoc(doc(db, "lost_items", docId));
    if (!snap.exists()) return renderError("ไม่พบโพสต์นี้ในฐานข้อมูล");

    const data = snap.data();
    latestDocId = docId;
    latestPostData = data;

    createdByUid = data.createdBy || null;
    currentStatus = data.status || "open"; // ถ้าโพสต์เก่ายังไม่มี status ให้ถือว่า open

    // UI: ชื่อผู้โพสต์
    const usernameEl = $("#username");
    if (usernameEl) usernameEl.textContent = data.createdByName || "User";

    // รูปโปรไฟล์
    const avatarEl = $("#userAvatar");
    if (avatarEl) {
      if (data.createdByPhotoURL) {
        avatarEl.innerHTML = `<img src="${data.createdByPhotoURL}" alt="${data.createdByName || "User"}">`;
      } else if (createdByUid) {
        try {
          const userSnap = await getDoc(doc(db, "users_create", createdByUid));
          if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.photoURL) {
              avatarEl.innerHTML = `<img src="${userData.photoURL}" alt="${userData.displayName || "User"}">`;
            } else {
              avatarEl.textContent = "👤";
            }
          } else {
            avatarEl.textContent = "👤";
          }
        } catch (e) {
          console.error("load user avatar error:", e);
          avatarEl.textContent = "👤";
        }
      } else {
        avatarEl.textContent = "👤";
      }
    }

    // รูปไอเท็ม
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

    // รายละเอียดอื่น ๆ
    $("#itemName").textContent = data.itemName || "ไม่มีชื่อไอเท็ม";
    setInfoValue("Location", data.location || "-");

    const dt = parseFoundAt(data.foundAt);
    setInfoValue("Date", formatDateTH(dt));
    setInfoValue("Time", formatTimeTH(dt));
    setInfoValue("Description", data.description || "-");

    // แสดงสถานะ
    renderStatus(currentStatus);

    // ตั้งค่าปุ่มตาม user ปัจจุบัน
    updateActionButtonForCurrentUser();
  } catch (err) {
    console.error("[postview] load error:", err);
    renderError(err?.message || String(err));
  }
}

/* ---------- Navigation ---------- */
$("#logoBtn")?.addEventListener("click", () => {
  window.location.href = "../index.html";
});

$("#backBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  if (history.length > 1) history.back();
  else window.location.href = "../Post/Post.html";
});

/* ---------- Auth listener สำหรับเปลี่ยนปุ่มตาม user ---------- */
onAuthStateChanged(auth, (user) => {
  currentUserUid = user ? user.uid : null;
  updateActionButtonForCurrentUser();
});

/* ---------- Start ---------- */
if (!id) {
  renderError("ไม่มีพารามิเตอร์ id ใน URL (เช่น .../Postview.html?id=xxxx)");
} else {
  loadPost(id);
}

/* ===============================================
  (อัปเดต) Custom Alert Modal Logic
=============================================== */
let alertOkCallback = null; // ตัวแปรเก็บ Callback

/**
 * (อัปเดต) ฟังก์ชันสำหรับแสดง Alert (1 ปุ่ม)
 */
function showCustomAlert(message, onClose) {
  customAlertMessage.textContent = message;
  alertOkCallback = onClose || null;

  // --- ตั้งค่าปุ่ม ---
  customAlertOkBtn.textContent = "ตกลง";
  customAlertOkBtn.classList.add('is-danger'); // ทำให้ปุ่มเป็นสีส้ม
  customAlertOkBtn.style.display = 'block';
  customAlertCancelBtn.style.display = 'none'; // (สำคัญ) ซ่อนปุ่มยกเลิก

  // --- แสดง Modal ---
  customAlert.classList.remove('hidden');
  setTimeout(() => {
    customAlert.classList.add('show');
  }, 10);
}

/**
 * (ใหม่!) ฟังก์ชันสำหรับแสดง Confirm (2 ปุ่ม)
 * @param {string} message ข้อความ
 * @param {function} onConfirm ฟังก์ชันที่จะรันเมื่อกด "ตกลง"
 * @param {boolean} [isDanger=false] ถ้าใช่, ปุ่ม "ตกลง" จะเป็นสีแดง
 */
function showCustomConfirm(message, onConfirm, isDanger = false) {
  customAlertMessage.textContent = message;
  alertOkCallback = onConfirm || null; // "ตกลง" จะรันฟังก์ชันนี้

  // --- ตั้งค่าปุ่ม ---
  customAlertOkBtn.textContent = "ตกลง";
  customAlertOkBtn.style.display = 'block';
  customAlertCancelBtn.style.display = 'block'; // (สำคัญ) แสดงปุ่มยกเลิก

  if (isDanger) {
    customAlertOkBtn.classList.add('is-danger'); // ทำให้เป็นสีแดง
  } else {
    customAlertOkBtn.classList.remove('is-danger'); // ทำให้เป็นสีเขียว
  }

  // --- แสดง Modal ---
  customAlert.classList.remove('hidden');
  setTimeout(() => {
    customAlert.classList.add('show');
  }, 10);
}


/**
 * (อัปเดต) ฟังก์ชันสำหรับซ่อน Alert
 * @param {boolean} [runCallback=false] - ถ้าเป็น true, จะรัน Callback (เช่น กด "ตกลง")
 */
function hideCustomAlert(runCallback = false) {
  customAlert.classList.remove('show');
  
  setTimeout(() => {
    customAlert.classList.add('hidden');
    
    // ถ้ารัน Callback และมี Callback ให้รัน
    if (runCallback && typeof alertOkCallback === 'function') {
      alertOkCallback();
    }
    alertOkCallback = null; // เคลียร์ Callback เสมอ
    
  }, 200);
}

// --- (อัปเดต) Event Listeners สำหรับ Modal ---

// เมื่อกด "ตกลง"
customAlertOkBtn?.addEventListener('click', () => {
  hideCustomAlert(true); // ซ่อน และ รัน Callback
});

// เมื่อกด "ยกเลิก"
customAlertCancelBtn?.addEventListener('click', () => {
  hideCustomAlert(false); // ซ่อน โดย *ไม่* รัน Callback
});

// เมื่อคลิกที่พื้นหลัง
customAlert?.addEventListener('click', (e) => {
  if (e.target === customAlert) {
    hideCustomAlert(false); // ซ่อน โดย *ไม่* รัน Callback
  }
});
