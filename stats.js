// Import 'db' (Firestore instance) from your firebase auth addon file
// (คุณต้องเพิ่ม 'export { db }' ในไฟล์ firebase.auth.addon.js ของคุณ)
import { db } from './firebase.auth.addon.js'; 
import { collection, getCountFromServer } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Function to update stat element
function updateStat(elementId, text) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = text;
  }
}

// Function to load stats from Firestore
async function loadStats() {
  try {
    // 1. Total Posts
    // (*** แก้ 'posts' ให้เป็นชื่อ Collection ของคุณ ***)
    const postsCol = collection(db, "posts"); // <-- แก้ไขชื่อ Collection ตรงนี้
    const postsSnap = await getCountFromServer(postsCol);
    updateStat('stats-total-posts', postsSnap.data().count);

    // 2. Total Users (นับจาก 2 collections)
    const usersGoogleSnap = await getCountFromServer(collection(db, "users_google"));
    const usersCreateSnap = await getCountFromServer(collection(db, "users_create"));
    const totalUsers = usersGoogleSnap.data().count + usersCreateSnap.data().count;
    updateStat('stats-total-users', totalUsers);

    // 3. Users Today (ส่วนนี้ซับซ้อน)
    // การนับ "Active Today" จริงๆ ต้องใช้ระบบที่ซับซ้อนกว่านี้
    // เช่น การบันทึก "lastLoginAt" ทุกครั้งที่ user ล็อกอิน
    // แล้ว query เฉพาะ user ที่มี lastLoginAt เป็นวันที่วันนี้
    // หรือใช้ระบบ Presence ของ Realtime Database
    //
    // *** สำหรับตอนนี้ จะใส่เป็น '...' ไว้ก่อน ***
    updateStat('stats-today-users', '...');

  } catch (err) {
    console.error("Error loading stats:", err);
    updateStat('stats-total-posts', 'N/A');
    updateStat('stats-total-users', 'N/A');
    updateStat('stats-today-users', 'N/A');
  }
}

// Load stats when the page (and modules) are ready
document.addEventListener('DOMContentLoaded', loadStats);