// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore, collection, doc, setDoc, serverTimestamp,
  query, where, limit, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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

// ต้องประกาศ wrapper ในไฟล์นี้ด้วย (ไฟล์นี้เป็น module แยก scope)
const wrapper = document.querySelector(".wrapper");

/* ---------- Register (users_create) ---------- */
const registerForm = document.getElementById("registerForm");
registerForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username    = document.getElementById("regUsername").value.trim();
  const studentIdStr= document.getElementById("regStudentId").value.trim();
  const email       = document.getElementById("regEmail").value.trim();
  const password    = document.getElementById("regPassword").value;
  const agree       = document.getElementById("agreeTos").checked;

  const studentId = Number(studentIdStr);
  if (!agree) return customAlert("กรุณายอมรับเงื่อนไขก่อนสมัคร");
  if (!username || !studentIdStr || !email || !password) return customAlert("กรอกข้อมูลให้ครบ");
  if (isNaN(studentId)) return customAlert("Student ID ต้องเป็นตัวเลข");

  try {
    // ตรวจชื่อซ้ำ
    const uq = query(collection(db, "users_create"), where("username", "==", username), limit(1));
    const uSnap = await getDocs(uq);
    if (!uSnap.empty) return customAlert("Username นี้ถูกใช้แล้ว");

    await setDoc(doc(collection(db, "users_create"), String(studentId)), {
      username,
      studentId,
      email,
      password,
      createdAt: serverTimestamp()
    });

    customAlert("ลงทะเบียนสำเร็จ (Student ID = " + studentId + ")");
    registerForm.reset();
  } catch (err) {
    console.error(err);
    customAlert("บันทึกล้มเหลว: " + (err?.message || String(err)));
  }
});

/* ---------- Login (users_create) ---------- */
const loginForm = document.getElementById("loginForm");
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  if (!username || !password) return customAlert("กรอก username และ password");

  try {
    const q = query(collection(db, "users_create"), where("username", "==", username), limit(1));
    const snap = await getDocs(q);

    if (snap.empty) return customAlert("username หรือ password ไม่ถูกต้อง");

    const user = snap.docs[0].data();
    if (user.password === password) {
      customAlert("ล็อกอินผ่านแล้ว ✅");

      // ปิด popup
      wrapper?.classList?.remove("active-popup");
      wrapper?.classList?.remove("active");

      // อัปเดต navbar ชั่วคราว
      const navbarUser = document.getElementById("navbarUser");
      navbarUser.innerHTML = `
        <div class="user-menu">
          <span class="username">${user.username}</span>
          <div class="dropdown hidden">
            <button id="logoutBtn">Logout</button>
          </div>
        </div>
      `;

      const usernameEl = navbarUser.querySelector(".username");
      const dropdown   = navbarUser.querySelector(".dropdown");
      const logoutBtn  = navbarUser.querySelector("#logoutBtn");

      usernameEl?.addEventListener("click", () => dropdown?.classList.toggle("hidden"));
      logoutBtn?.addEventListener("click", () => {
      navbarUser.innerHTML = `<button class="login btnLogin-popup" id="loginBtn">Log in</button>`; // ✅ บรรทัดนี้
      navbarUser.querySelector(".btnLogin-popup")?.addEventListener("click", () => {
        wrapper?.classList?.add("active-popup");
    });
});

    } else {
      customAlert("username หรือ password ไม่ถูกต้อง");
    }
  } catch (err) {
    console.error(err);
    customAlert("เกิดข้อผิดพลาดระหว่างล็อกอิน: " + (err?.message || String(err)));
  }
});