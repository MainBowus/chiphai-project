/* ===============================================
   ADMIN PANEL - Firebase Integration (View Only)
   - ใช้ร่วมกับ admin.html (ไม่มี top-header)
   - อ่านข้อมูลจาก Firestore อย่างเดียว
=============================================== */

// --- 1. Import Firebase SDK ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- 2. Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyBQlq_ZgG1eUVrMGXo178wNW7GMr6imCDk",
  authDomain: "chiphailogin01.firebaseapp.com",
  projectId: "chiphailogin01",
  storageBucket: "chiphailogin01.appspot.com",
  messagingSenderId: "122413223952",
  appId: "1:122413223952:web:35a1f19668bf22be13fa95",
  measurementId: "G-2B1K7VV4ZT",
};

// --- 3. Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 4. DOM Elements ---
const contentTitle = document.getElementById("content-title");
const mainContentDisplay = document.getElementById("main-content-display");
const navItems = document.querySelectorAll(".main-nav .nav-item");
const logoutBtn = document.getElementById("nav-logout");
const profileAvatars = document.querySelectorAll(".profile-avatar");
const profileName = document.querySelector(".profile-name");
const profileRole = document.querySelector(".profile-role");

// --- 5. Global State ---
let currentView = "dashboard";
let allTickets = [];
let allPosts = [];
let allUsers = [];
let currentUser = null;

// --- 6. Helper Functions ---

// ฟังก์ชันเช็กว่าเป็น Admin UID หรือไม่ (ต้องตรงกับ Firestore rules)
function isAdminUid(uid) {
  return (
    uid === "Ae2rNZQcTVUkii4716J5H1rqTOv1" ||
    uid === "6pFdq6V1O4Ye2OmZh17vY3jmnBm2" ||
    uid === "na1Q42lqsOWV99h8p8UBdXd7aLI3"
  );
}

// escape ตัวอักษรพิเศษกัน XSS
const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[m]));

// รองรับทั้ง Firestore Timestamp และ Date ปกติ
const formatDate = (ts) => {
  if (!ts) return "-";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// อัปเดต UI มุมซ้ายล่างให้เป็นรูป/ชื่อของแอดมินจริง
function updateAdminProfileUI() {
  if (!currentUser) return;

  const photo = currentUser.photoURL || "https://i.pravatar.cc/40?img=1";
  const name = currentUser.displayName || "Admin User";

  profileAvatars.forEach((img) => {
    img.src = photo;
  });

  if (profileName) profileName.textContent = name;
  if (profileRole) profileRole.textContent = "Administrator";
}

// แสดง Loading ตอนกำลังโหลดข้อมูล
function showLoading(show) {
  if (!show) return;
  mainContentDisplay.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:400px;gap:15px;">
      <i class="fas fa-spinner fa-spin" style="font-size:48px;color:#454697;"></i>
      <p style="color:#8696a7;font-size:16px;">กำลังโหลดข้อมูลจากฐานข้อมูล...</p>
    </div>
  `;
}

// --- 7. Authentication + Admin Guard ---
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    console.log("❌ ยังไม่ได้ล็อกอิน -> กลับไปหน้า login");
    window.location.href = "../login/login.html";
    return;
  }

  console.log("🔥 Admin Logged:", user.uid);
  if (!isAdminUid(user.uid)) {
    alert("คุณไม่มีสิทธิ์เข้าหน้า Admin Dashboard");
    window.location.href = "../index.html";
    return;
  }

  currentUser = user;
  updateAdminProfileUI();

  await loadAllData();
  renderCurrentView();
});

// --- 8. Load Data From Firestore (Read Only) ---
async function loadAllData() {
  showLoading(true);
  try {
    // tickets (ลูกค้าส่งแจ้งปัญหา)
    const ticketsSnap = await getDocs(
      query(collection(db, "tickets"), orderBy("createdAt", "desc"))
    );
    allTickets = ticketsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // lost_items (โพสต์ของหาย)
    const postsSnap = await getDocs(
      query(collection(db, "lost_items"), orderBy("createdAt", "desc"))
    );
    allPosts = postsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // users_create + users_google รวมกันเป็น allUsers (ไว้ดูอย่างเดียว)
    const usersCreateSnap = await getDocs(collection(db, "users_create"));
    const usersGoogleSnap = await getDocs(collection(db, "users_google"));

    const normalizeUser = (doc, source) => {
      const data = doc.data();
      return {
        id: doc.id,
        uid: data.uid || doc.id,
        displayName: data.displayName || data.name || "(ไม่มีชื่อ)",
        email: data.email || "",
        photoURL: data.photoURL || "",
        isBanned: data.isBanned === true,
        createdAt: data.createdAt || null,
        _source: source, // แค่ไว้ debug
      };
    };

    allUsers = [
      ...usersCreateSnap.docs.map((d) => normalizeUser(d, "users_create")),
      ...usersGoogleSnap.docs.map((d) => normalizeUser(d, "users_google")),
    ];

    console.log(
      `⭐ โหลดแล้ว: ${allTickets.length} tickets / ${allPosts.length} posts / ${allUsers.length} users`
    );
  } catch (err) {
    console.error("❌ โหลดข้อมูลล้มเหลว:", err);
    alert("เกิดข้อผิดพลาดในการโหลดข้อมูลจากฐานข้อมูล");
  }
}

// --- 9. Render Main View ---
function renderCurrentView() {
  // อัปเดต Title ด้านบน
  const activeNavItem = document.querySelector(`#nav-${currentView}`);
  if (activeNavItem) {
    contentTitle.textContent = activeNavItem.textContent.trim();
  }

  switch (currentView) {
    case "dashboard":
      renderDashboardPage();
      break;
    case "reports":
      renderTicketsPage();
      break;
    case "posts":
      renderPostsPage();
      break;
    case "users":
      renderUsersPage();
      break;
    default:
      renderDashboardPage();
  }
}

// --- 10. Generic Table Renderer ---
function renderDataTable(config) {
  const {
    title,
    data,
    columns,
    emptyMessage,
  } = config;

  const headers = columns
    .map((c) => `<th class="${c.className || ""}">${c.header}</th>`)
    .join("");

  const rows =
    data.length === 0
      ? `<tr><td colspan="${columns.length}" class="empty-cell">${emptyMessage}</td></tr>`
      : data
          .map(
            (row) => `
        <tr>
          ${columns
            .map(
              (c) =>
                `<td class="${c.className || ""}">${c.cell(row)}</td>`
            )
            .join("")}
        </tr>`
          )
          .join("");

  mainContentDisplay.innerHTML = `
    <div class="data-list-card card">
      <div class="data-list-header">
        <h3>${title} (${data.length})</h3>
      </div>
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead><tr>${headers}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

// --- 11. Dashboard Page ---
function renderDashboardPage() {
  const pendingTickets = allTickets.filter((t) => t.status === "pending");
  const recentTickets = [...allTickets].slice(0, 5);
  const newUsers = [...allUsers].slice(0, 5);

  mainContentDisplay.innerHTML = `
    <div class="dashboard-content-grid">
      <div class="stats-cards-grid">
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-icon blue"><i class="fas fa-ticket-alt"></i></div>
            <h3>Pending Reports</h3>
          </div>
          <div class="stat-card-value">${pendingTickets.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-icon green"><i class="fas fa-clipboard-list"></i></div>
            <h3>Total Posts</h3>
          </div>
          <div class="stat-card-value">${allPosts.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-icon purple"><i class="fas fa-users"></i></div>
            <h3>Total Users</h3>
          </div>
          <div class="stat-card-value">${allUsers.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-icon red"><i class="fas fa-ban"></i></div>
            <h3>Banned Users</h3>
          </div>
          <div class="stat-card-value">${
            allUsers.filter((u) => u.isBanned).length
          }</div>
        </div>
      </div>

      <div class="balance-card">
        <h3>Report Summary</h3>
        <div class="balance-amount">${pendingTickets.length} <small>Pending</small></div>
        <ul class="details-list">
          <li><span>Total Reports</span><span>${allTickets.length}</span></li>
          <li><span>Resolved</span><span>${
            allTickets.filter((t) => t.status === "resolved").length
          }</span></li>
        </ul>
        <button class="btn add-card-btn" data-nav-target="nav-reports">
          <i class="fas fa-arrow-right"></i> View All Reports
        </button>
      </div>

      <div class="chart-card card">
        <div class="chart-card-header">
          <h3>Post Activity Trend</h3>
          <select class="chart-filter">
            <option>Monthly</option>
          </select>
        </div>
        <div class="chart-placeholder"></div>
      </div>

      <div class="recent-activity-card card">
        <h3>Recent Reports</h3>
        <table class="activity-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Reported By</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${
              recentTickets.length === 0
                ? `<tr><td colspan="4" class="empty-cell">ไม่มีรายงานล่าสุด</td></tr>`
                : recentTickets
                    .map(
                      (ticket) => `
                <tr>
                  <td>${escapeHtml(ticket.category || "N/A")}</td>
                  <td>${escapeHtml(
                    (ticket.email || "Unknown").split("@")[0]
                  )}</td>
                  <td>
                    <span class="status-badge status-${ticket.status}">
                      ${ticket.status}
                    </span>
                  </td>
                  <td>${formatDate(ticket.createdAt)}</td>
                </tr>
              `
                    )
                    .join("")
            }
          </tbody>
        </table>
      </div>

      <div class="upcoming-payments-card card">
        <h3>Recent New Users</h3>
        <ul class="payment-list">
          ${
            newUsers.length === 0
              ? `<li class="empty-cell" style="padding:10px 0">ไม่มีผู้ใช้ใหม่</li>`
              : newUsers
                  .map(
                    (user, i) => `
              <li class="payment-item">
                <div class="payment-color-bar" style="background-color:${
                  ["#007bff", "#ff9800", "#4caf50", "#9c27b0", "#f44336"][i % 5]
                }"></div>
                <div class="payment-details">
                  <div class="name">${escapeHtml(
                    user.displayName || "Anonymous"
                  )}</div>
                  <div class="date">${formatDate(user.createdAt)}</div>
                </div>
                <div class="payment-amount">${
                  user.email ? "Active" : "Guest"
                }</div>
              </li>
            `
                  )
                  .join("")
          }
        </ul>
      </div>
    </div>
  `;

  // ทำให้ปุ่ม View All Reports กดแล้วไปแท็บ Manage Reports
  const btn = mainContentDisplay.querySelector(".add-card-btn");
  if (btn) {
    btn.addEventListener("click", (e) => {
      const targetId = e.currentTarget.dataset.navTarget;
      document.getElementById(targetId)?.click();
    });
  }
}

// --- 12. Reports Page (tickets) ---
function renderTicketsPage() {
  const data = [...allTickets];

  renderDataTable({
    title: "All Reports",
    data,
    emptyMessage: "ไม่พบรายงาน",
    columns: [
      {
        header: "Category",
        className: "col-category",
        cell: (row) => escapeHtml(row.category || "N/A"),
      },
      {
        header: "Details",
        className: "col-details",
        cell: (row) =>
          `<span title="${escapeHtml(row.details || "")}">${escapeHtml(
            row.details || "No details"
          )}</span>`,
      },
      {
        header: "Reported By",
        className: "col-email",
        cell: (row) => escapeHtml(row.email || "Unknown"),
      },
      {
        header: "Status",
        className: "col-status",
        cell: (row) =>
          `<span class="status-badge status-${row.status}">${row.status}</span>`,
      },
      {
        header: "Date",
        className: "col-date",
        cell: (row) => formatDate(row.createdAt),
      },
    ],
  });
}

// --- 13. Posts Page (lost_items) ---
function renderPostsPage() {
  const data = [...allPosts];

  renderDataTable({
    title: "All Posts",
    data,
    emptyMessage: "ไม่พบโพสต์ของหาย",
    columns: [
      {
        header: "Item Name",
        cell: (row) => escapeHtml(row.itemName || "Untitled"),
      },
      {
        header: "Location",
        cell: (row) => escapeHtml(row.location || "Unknown"),
      },
      {
        header: "Posted By",
        cell: (row) => escapeHtml(row.createdByName || "Anonymous"),
      },
      {
        header: "Date",
        className: "col-date",
        cell: (row) => formatDate(row.createdAt),
      },
    ],
  });
}

// --- 14. Users Page (users_create + users_google) ---
function renderUsersPage() {
  const data = [...allUsers];

  renderDataTable({
    title: "All Users",
    data,
    emptyMessage: "ไม่พบผู้ใช้",
    columns: [
      {
        header: "",
        className: "col-avatar",
        cell: (row) =>
          row.photoURL
            ? `<img src="${row.photoURL}" alt="Avatar">`
            : `<div class="avatar-placeholder"><i class="fas fa-user"></i></div>`,
      },
      {
        header: "Display Name",
        cell: (row) => escapeHtml(row.displayName || "Anonymous"),
      },
      {
        header: "Email",
        className: "col-email",
        cell: (row) =>
          `<span title="${escapeHtml(row.email || "")}">${escapeHtml(
            row.email || "(No Email)"
          )}</span>`,
      },
      {
        header: "Status",
        className: "col-status",
        cell: (row) =>
          `<span class="status-badge status-${
            row.isBanned ? "banned" : "active"
          }">${row.isBanned ? "Banned" : "Active"}</span>`,
      },
      {
        header: "UID",
        className: "col-uid",
        cell: (row) =>
          `<span title="${escapeHtml(row.uid || "")}">${escapeHtml(
            row.uid || "N/A"
          )}</span>`,
      },
    ],
  });
}

// --- 15. Navigation ---
navItems.forEach((item) => {
  item.addEventListener("click", (e) => {
    e.preventDefault();
    const target = e.currentTarget;
    if (!target.id) return;

    navItems.forEach((nav) => nav.classList.remove("active"));
    target.classList.add("active");

    currentView = target.id.replace("nav-", "");
    renderCurrentView();
  });
});

// --- 16. Logout (กลับไป index.html แน่นอน) ---
logoutBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  if (!confirm("ต้องการออกจากระบบหรือไม่?")) return;

  try {
    await signOut(auth);
  } catch (err) {
    console.error("Logout error:", err);
  }

  // ไม่ว่าจะ signOut สำเร็จไหม กลับหน้า index.html แน่นอน
  window.location.href = "../index.html";
});
