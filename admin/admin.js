/* ==========================================================
   CHIPHAI ADMIN PANEL - Firestore & Authentication
   Version: Optimized for lost_items / tickets / users_create / users_google
========================================================== */

// --- Firebase SDK ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { 
    getAuth, onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { 
    getFirestore, collection, getDocs, doc, updateDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// --- Firebase Config ---
const firebaseConfig = {
    apiKey: "AIzaSyBQlq_ZgG1eUVrMGXo178wNW7GMr6imCDk",
    authDomain: "chiphailogin01.firebaseapp.com",
    projectId: "chiphailogin01",
    storageBucket: "chiphailogin01.appspot.com",
    messagingSenderId: "122413223952",
    appId: "1:122413223952:web:35a1f19668bf22be13fa95",
};

// --- Initialize ---
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore(app);

// --- Admin UIDs ---
const ADMIN_UIDS = [
    "Ae2rNZQcTVUkii4716J5H1rqTOv1",
    "6pFdq6V1O4Ye2OmZh17vY3jmnBm2",
    "na1Q42lqsOWV99h8p8UBdXd7aLI3"
];

// --- Page Elements ---
const contentTitle = document.getElementById("content-title");
const mainContentDisplay = document.getElementById("main-content-display");
const navItems = document.querySelectorAll(".nav-item");
const logoutBtn = document.getElementById("nav-logout");

// --- Global State ---
let currentView = "dashboard";
let lostItems = [];
let tickets = [];
let users = [];


/* ==========================================================
   AUTH CHECK
========================================================== */

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        alert("กรุณาเข้าสู่ระบบก่อน");
        window.location.href = "../login/login.html";
        return;
    }

    console.log("🔥 Admin Logged:", user.uid);

    if (!ADMIN_UIDS.includes(user.uid)) {
        alert("บัญชีนี้ไม่ได้รับอนุญาตให้เข้าหน้า Admin");
        window.location.href = "../index.html";
        return;
    }

    await loadAllData();
    renderCurrentView();
});


/* ==========================================================
   LOAD DATA (โหลดตามโครงสร้างจริง Firestore)
========================================================== */

async function loadAllData() {
    mainContentDisplay.innerHTML = `<p style="padding:20px;">⌛ กำลังโหลดข้อมูล...</p>`;

    try {
        const lostSnap = await getDocs(collection(db, "lost_items"));
        lostItems = lostSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const ticketSnap = await getDocs(collection(db, "tickets"));
        tickets = ticketSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const userSnap1 = await getDocs(collection(db, "users_create"));
        const userSnap2 = await getDocs(collection(db, "users_google"));
        users = [
            ...userSnap1.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            ...userSnap2.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        ];

        console.log(`⭐ โหลดแล้ว: ${tickets.length} tickets / ${lostItems.length} lost_items / ${users.length} users`);

    } catch (err) {
        console.error(err);
        alert("โหลดข้อมูลผิดพลาด: " + err.message);
    }
}


/* ==========================================================
   VIEW RENDERER
========================================================== */

function renderCurrentView() {

    switch (currentView) {

        /* -----------------------------------
           DASHBOARD
        ----------------------------------- */
        case "dashboard":
            contentTitle.textContent = "Dashboard";

            const pending = tickets.filter(t => t.status === "pending");

            mainContentDisplay.innerHTML = `
                <div class="dashboard-content-grid">

                    <div class="stat-card">
                        <div class="stat-card-header">
                            <div class="stat-icon blue"><i class="fas fa-ticket"></i></div>
                            <h3>Pending Reports</h3>
                        </div>
                        <div class="stat-card-value">${pending.length}</div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-card-header">
                            <div class="stat-icon green"><i class="fas fa-box"></i></div>
                            <h3>Total Lost Items</h3>
                        </div>
                        <div class="stat-card-value">${lostItems.length}</div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-card-header">
                            <div class="stat-icon purple"><i class="fas fa-users"></i></div>
                            <h3>Total Users</h3>
                        </div>
                        <div class="stat-card-value">${users.length}</div>
                    </div>
                </div>
            `;
            break;

        /* -----------------------------------
           MANAGE REPORTS
        ----------------------------------- */
        case "reports":
            contentTitle.textContent = "Manage Reports";

            mainContentDisplay.innerHTML = `
                <div class="data-list-card card">
                    <div class="data-list-header">
                        <h3>Tickets (${tickets.length})</h3>
                    </div>

                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>เรื่อง</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tickets.map(t => `
                                <tr>
                                    <td>${t.email ?? "-"}</td>
                                    <td>${t.details ?? "-"}</td>
                                    <td>
                                        <span class="status-badge status-${t.status}">
                                            ${t.status}
                                        </span>
                                    </td>
                                    <td>
                                        <button class="btn-action btn-success" data-action="resolve" data-id="${t.id}">
                                            ✔ Resolve
                                        </button>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            `;
            break;

        /* -----------------------------------
           MANAGE LOST ITEMS
        ----------------------------------- */
        case "posts":
            contentTitle.textContent = "Manage Posts";

            mainContentDisplay.innerHTML = `
                <div class="data-list-card card">
                    <div class="data-list-header">
                        <h3>Lost Items (${lostItems.length})</h3>
                    </div>

                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ชื่อของ</th>
                                <th>สถานที่</th>
                                <th>คนโพสต์</th>
                                <th>ลบ</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${lostItems.map(p => `
                                <tr>
                                    <td>${p.itemName ?? "-"}</td>
                                    <td>${p.location ?? "-"}</td>
                                    <td>${p.createdByName ?? "-"}</td>
                                    <td>
                                        <button class="btn-action btn-danger" data-action="delete-post" data-id="${p.id}">
                                            🗑 ลบ
                                        </button>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            `;
            break;

        /* -----------------------------------
           MANAGE USERS
        ----------------------------------- */
        case "users":
            contentTitle.textContent = "Manage Users";

            mainContentDisplay.innerHTML = `
                <div class="data-list-card card">
                    <div class="data-list-header">
                        <h3>Users (${users.length})</h3>
                    </div>

                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ชื่อ</th>
                                <th>Email</th>
                                <th>สถานะ</th>
                                <th>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(u => `
                                <tr>
                                    <td>${u.displayName ?? "-"}</td>
                                    <td>${u.email ?? "-"}</td>
                                    <td>
                                        <span class="status-badge status-${u.isBanned ? "banned" : "active"}">
                                            ${u.isBanned ? "Banned" : "Active"}
                                        </span>
                                    </td>
                                    <td>
                                        <button class="btn-action ${u.isBanned ? "btn-success" : "btn-danger"}" 
                                                data-action="${u.isBanned ? "unban" : "ban"}"
                                                data-id="${u.id}"
                                                data-collection="${u.email ? "users_create" : "users_google"}">
                                            ${u.isBanned ? "✔ Unban" : "✖ Ban"}
                                        </button>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            `;
            break;
    }
}


/* ==========================================================
   ACTION HANDLER
========================================================== */

mainContentDisplay.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;

    btn.disabled = true;
    btn.textContent = "⌛";

    try {
        if (action === "resolve") {
            await updateDoc(doc(db, "tickets", id), { status: "resolved" });
        }

        if (action === "delete-post") {
            await deleteDoc(doc(db, "lost_items", id));
        }

        if (action === "ban") {
            const col = btn.dataset.collection;
            await updateDoc(doc(db, col, id), { isBanned: true });
        }

        if (action === "unban") {
            const col = btn.dataset.collection;
            await updateDoc(doc(db, col, id), { isBanned: false });
        }

        await loadAllData();
        renderCurrentView();

    } catch (err) {
        console.error(err);
        alert("เกิดข้อผิดพลาด: " + err.message);
    }

    btn.disabled = false;
});


/* ==========================================================
   NAV MENU
========================================================== */

navItems.forEach(n => {
    n.addEventListener("click", (e) => {
        e.preventDefault();
        navItems.forEach(x => x.classList.remove("active"));
        n.classList.add("active");

        currentView = n.id.replace("nav-", "");
        renderCurrentView();
    });
});


/* ==========================================================
   LOGOUT
========================================================== */

logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "../login/login.html";
});
