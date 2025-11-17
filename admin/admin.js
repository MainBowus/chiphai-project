/* ===========================================================
   CHIPHAI ADMIN PANEL - Full Working Version (by GPT)
   ใช้งานกับ Firestore rules ที่มีฟังก์ชัน isAdminUid()
   =========================================================== */

// =======================
// 1) Firebase Setup
// =======================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    orderBy,
    query
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// =======================
// 2) Firebase Config
// =======================
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
const auth = getAuth(app);
const db = getFirestore(app);

// =======================
// 3) Admin UID List
// =======================
const ADMIN_UID = [
    "Ae2rNZQcTVUkii4716J5H1rqTOv1",
    "6pFdq6V1O4Ye2OmZh17vY3jmnBm2",
    "na1Q42lqsOWV99h8p8UBdXd7aLI3"
];

// =======================
// 4) DOM Elements
// =======================
const mainContent = document.getElementById("main-content-display");
const contentTitle = document.getElementById("content-title");

const navDashboard = document.getElementById("nav-dashboard");
const navReports = document.getElementById("nav-reports");
const navPosts = document.getElementById("nav-posts");
const navUsers = document.getElementById("nav-users");
const logoutBtn = document.getElementById("nav-logout");

const profileImg = document.querySelector(".profile-avatar");
const profileName = document.querySelector(".profile-name");

// ใช้ state
let allTickets = [];
let allPosts = [];
let allUsers = [];
let currentView = "dashboard";

// =======================
// 5) Admin Check + Load Data
// =======================
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        alert("กรุณาเข้าสู่ระบบก่อนเข้าสู่หน้านี้");
        window.location.href = "../index.html";
        return;
    }

    console.log("🔥 Admin Logged:", user.uid);

    if (!ADMIN_UID.includes(user.uid)) {
        alert("สิทธิ์ไม่เพียงพอ: คุณไม่ใช่แอดมิน");
        window.location.href = "../index.html";
        return;
    }

    // update UI
    if (profileImg) profileImg.src = user.photoURL || "../image/default_user.png";
    if (profileName) profileName.textContent = user.displayName || "Admin";

    await loadAllData();
    renderDashboard();
});

// =======================
// 6) Load Firestore Data
// =======================
async function loadAllData() {
    try {
        // tickets
        const ticketsSnap = await getDocs(query(collection(db, "tickets"), orderBy("createdAt", "desc")));
        allTickets = ticketsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // posts (lost_items)
        const postsSnap = await getDocs(query(collection(db, "lost_items"), orderBy("createdAt", "desc")));
        allPosts = postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // users (users_google)
        const usersSnap = await getDocs(query(collection(db, "users_google")));
        allUsers = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        console.log(`⭐ โหลดแล้ว: ${allTickets.length} tickets / ${allPosts.length} posts / ${allUsers.length} users`);
    } catch (err) {
        console.error(err);
        alert("โหลดข้อมูลผิดพลาด: " + err.message);
    }
}

// =======================
// 7) Render Dashboard
// =======================
function renderDashboard() {
    currentView = "dashboard";

    contentTitle.textContent = "Dashboard";

    const pendingCount = allTickets.filter(t => t.status === "pending").length;

    mainContent.innerHTML = `
        <div class="dashboard-content-grid">

            <div class="stat-card">
                <div class="stat-card-header">
                    <div class="stat-icon blue"><i class="fas fa-ticket-alt"></i></div>
                    <h3>Pending Reports</h3>
                </div>
                <div class="stat-card-value">${pendingCount}</div>
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

        </div>
    `;
}

// =======================
// 8) Render Tickets
// =======================
function renderTickets() {
    currentView = "reports";
    contentTitle.textContent = "Manage Reports";

    let rows = allTickets.map(t => `
        <tr>
            <td>${t.email || "-"}</td>
            <td>${t.category || "-"}</td>
            <td>${t.status}</td>
            <td>${new Date(t.createdAt?.toDate()).toLocaleString()}</td>
            <td>
                ${t.status === "pending"
                    ? `<button class="btn-action btn-success" data-id="${t.id}" data-act="resolve">เสร็จสิ้น</button>`
                    : `<button class="btn-action btn-secondary" data-id="${t.id}" data-act="reopen">ย้อนกลับ</button>`
                }
            </td>
        </tr>
    `).join("");

    mainContent.innerHTML = `
        <div class="data-list-card">
            <div class="data-list-header">
                <h3>All Reports</h3>
            </div>

            <div class="data-table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Category</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;
}

// =======================
// 9) Render Posts (lost_items)
// =======================
function renderPosts() {
    currentView = "posts";
    contentTitle.textContent = "Manage Posts";

    let rows = allPosts.map(p => `
        <tr>
            <td>${p.itemName || "-"}</td>
            <td>${p.location || "-"}</td>
            <td>${new Date(p.createdAt?.toDate()).toLocaleString()}</td>
            <td><button class="btn-action btn-danger" data-id="${p.id}" data-act="del-post">ลบ</button></td>
        </tr>
    `).join("");

    mainContent.innerHTML = `
        <div class="data-list-card">
            <div class="data-list-header">
                <h3>All Posts</h3>
            </div>

            <div class="data-table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Location</th>
                            <th>Date</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;
}

// =======================
// 10) Render Users
// =======================
function renderUsers() {
    currentView = "users";
    contentTitle.textContent = "Manage Users";

    let rows = allUsers.map(u => `
        <tr>
            <td><img src="${u.photoURL || "../image/default_user.png"}" class="avatar-sm"></td>
            <td>${u.displayName || "-"}</td>
            <td>${u.email || "-"}</td>
            <td>${u.isBanned ? "Banned" : "Active"}</td>
            <td>
                ${u.isBanned
                    ? `<button class="btn-action btn-success" data-id="${u.id}" data-act="unban">ปลดแบน</button>`
                    : `<button class="btn-action btn-danger" data-id="${u.id}" data-act="ban">แบน</button>`
                }
            </td>
        </tr>
    `).join("");

    mainContent.innerHTML = `
        <div class="data-list-card">
            <div class="data-list-header">
                <h3>All Users</h3>
            </div>

            <div class="data-table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Avatar</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;
}

// =======================
// 11) Action Buttons
// =======================
mainContent.addEventListener("click", async (e) => {
    let btn = e.target.closest("button");
    if (!btn) return;

    let id = btn.dataset.id;
    let act = btn.dataset.act;

    try {
        if (act === "resolve") {
            await updateDoc(doc(db, "tickets", id), { status: "resolved" });
        }
        if (act === "reopen") {
            await updateDoc(doc(db, "tickets", id), { status: "pending" });
        }
        if (act === "del-post") {
            await deleteDoc(doc(db, "lost_items", id));
        }
        if (act === "ban") {
            await updateDoc(doc(db, "users_google", id), { isBanned: true });
        }
        if (act === "unban") {
            await updateDoc(doc(db, "users_google", id), { isBanned: false });
        }

        await loadAllData();
        if (currentView === "reports") renderTickets();
        if (currentView === "posts") renderPosts();
        if (currentView === "users") renderUsers();

    } catch (err) {
        alert("เกิดข้อผิดพลาด: " + err.message);
    }
});

// =======================
// 12) Navigation
// =======================
navDashboard.onclick = () => renderDashboard();
navReports.onclick = () => renderTickets();
navPosts.onclick = () => renderPosts();
navUsers.onclick = () => renderUsers();

// =======================
// 13) Logout
// =======================
logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "../index.html";
};
