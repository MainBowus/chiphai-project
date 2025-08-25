
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
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
