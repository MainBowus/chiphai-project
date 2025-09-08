import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore, collection, doc, setDoc, serverTimestamp,
  query, where, limit, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBQlq_ZgG1eUVrMGXo178wNW7GMr6imCDk",
  authDomain: "chiphailogin01.firebaseapp.com",
  projectId: "chiphailogin01",
  storageBucket: "chiphailogin01.firebasestorage.app",
  messagingSenderId: "122413223952",
  appId: "1:122413223952:web:35a1f19668bf22be13fa95",
  measurementId: "G-2B1K7VV4ZT"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const registerForm = document.getElementById("registerForm");
registerForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("regUsername").value.trim();
  const studentIdStr = document.getElementById("regStudentId").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const agree = document.getElementById("agreeTos").checked;

  const studentId = Number(studentIdStr);
  if (!agree) return alert("กรุณายอมรับเงื่อนไขก่อนสมัคร");
  if (!username || !studentIdStr || !email || !password) return alert("กรอกข้อมูลให้ครบ");
  if (isNaN(studentId)) return alert("Student ID ต้องเป็นตัวเลข");

  try {

    const uq = query(collection(db, "users_create"), where("username", "==", username), limit(1));
    const uSnap = await getDocs(uq);
    if (!uSnap.empty) return alert("Username นี้ถูกใช้แล้ว");


    await setDoc(doc(collection(db, "users_create"), String(studentId)), {
      username,
      studentId,
      email,
      password,
      createdAt: serverTimestamp()
    });

    alert("ลงทะเบียนสำเร็จ (Student ID = " + studentId + ")");
    registerForm.reset();
  } catch (err) {
    console.error(err);
    alert("บันทึกล้มเหลว: " + err.message);
  }
});

const loginForm = document.getElementById("loginForm");
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  if (!username || !password) return alert("กรอก username และ password");

  try {
    // หา user จาก users_create
    const q = query(
      collection(db, "users_create"),
      where("username", "==", username),
      limit(1)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      alert("username หรือ password ไม่ถูกต้อง");
      return;
    }

    const user = snap.docs[0].data();
    if (user.password === password) {
      alert("ล็อกอินผ่านแล้ว ✅");

      wrapper.classList.remove("active-popup");
      wrapper.classList.remove("active");

      // แสดง username + dropdown
      const navbarUser = document.getElementById("navbarUser");
      navbarUser.innerHTML = `
        <div class="user-menu">
          <span class="username-btn">${user.username}</span>
          <div class="dropdown hidden">
            <button id="logoutBtn">Logout</button>
          </div>
        </div>
      `;


      const usernameEl = navbarUser.querySelector(".username-btn");
      const dropdown = navbarUser.querySelector(".dropdown");
      const logoutBtn = navbarUser.querySelector("#logoutBtn");

      // toggle dropdown
      usernameEl.onclick = () => {
        dropdown.classList.toggle("hidden");
      };

      // logout
      logoutBtn.onclick = () => {
        navbarUser.innerHTML = `<button class="btnLogin-popup">Login</button>`;
        document.querySelector(".btnLogin-popup").onclick = () => {
          wrapper.classList.add("active-popup");
        };
      };

    } else {
      alert("username หรือ password ไม่ถูกต้อง");
    }
  } catch (err) {
    console.error(err);
    alert("เกิดข้อผิดพลาดระหว่างล็อกอิน: " + err.message);
  }
});
