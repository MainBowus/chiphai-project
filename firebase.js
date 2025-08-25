
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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

    await setDoc(doc(collection(db, "users"), String(studentId)), {
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
