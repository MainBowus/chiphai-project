/* ===============================================
   MOCK DATA (ข้อมูลจำลอง)
   Backend Dev: คุณต้องแทนที่ Array เหล่านี้
   ด้วยการเรียก API หรือ Database จริง
=============================================== */
let mockTickets = [
    { id: 't1', category: 'Spam', details: 'โพสต์นี้เป็นโฆษณาขายของครับ', email: 'user1@example.com', uid: 'uid-user-1', status: 'pending', createdAt: new Date(2025, 10, 5, 9, 30) },
    { id: 't2', category: 'Inappropriate', details: 'ใช้คำหยาบคายในรายละเอียดโพสต์', email: 'user2@example.com', uid: 'uid-user-2', status: 'pending', createdAt: new Date(2025, 10, 4, 14, 0) },
    { id: 't3', category: 'Other', details: 'ไม่แน่ใจว่าจริงหรือหลอกลวง', email: 'user3@example.com', uid: 'uid-user-3', status: 'resolved', createdAt: new Date(2025, 10, 3, 10, 0) },
    { id: 't4', category: 'Spam', details: 'ข้อความซ้ำซาก', email: 'user4@example.com', uid: 'uid-user-4', status: 'pending', createdAt: new Date(2025, 10, 2, 9, 0) },
    { id: 't5', category: 'Inappropriate', details: 'รูปภาพไม่เหมาะสม', email: 'user5@example.com', uid: 'uid-user-5', status: 'pending', createdAt: new Date(2025, 10, 1, 11, 0) },
];
let mockPosts = [
    { id: 'p1', itemName: 'iPhone 15 Pro (สีไทเทเนียม)', location: 'Siam Paragon ชั้น G', createdByName: 'สมชาย ใจดี', createdBy: 'uid-user-1', createdAt: new Date(2025, 10, 5, 8, 15) },
    { id: 'p2', itemName: 'กระเป๋าตังค์ LV สีน้ำตาล', location: 'BTS อโศก', createdByName: 'Jane Doe', createdBy: 'uid-user-2', createdAt: new Date(2025, 10, 4, 12, 0) },
    { id: 'p3', itemName: 'กุญแจรถยนต์ Toyota', location: 'ลานจอดรถ CentralWorld', createdByName: 'Peter Parker', createdBy: 'uid-user-3', createdAt: new Date(2025, 10, 3, 18, 45) },
];
let mockUsers = [
    { id: 'u1', uid: 'uid-user-1', displayName: 'สมชาย ใจดี', email: 'user1@example.com', photoURL: 'https://i.pravatar.cc/40?img=1', isBanned: false, createdAt: new Date(2025, 9, 1) },
    { id: 'u2', uid: 'uid-user-2', displayName: 'Jane Doe', email: 'user2@example.com', photoURL: 'https://i.pravatar.cc/40?img=2', isBanned: false, createdAt: new Date(2025, 9, 2) },
    { id: 'u3', uid: 'uid-user-3', displayName: 'Peter Parker', email: 'user3@example.com', photoURL: 'https://i.pravatar.cc/40?img=3', isBanned: true, createdAt: new Date(2025, 9, 3) },
    { id: 'u4', uid: 'uid-user-4', displayName: 'Alice Wonder', email: 'user4@example.com', photoURL: 'https://i.pravatar.cc/40?img=4', isBanned: false, createdAt: new Date(2025, 9, 4) },
    { id: 'u5', uid: 'uid-user-5', displayName: 'Bob Builder', email: 'user5@example.com', photoURL: 'https://i.pravatar.cc/40?img=5', isBanned: false, createdAt: new Date(2025, 9, 5) },
];

/* ===============================================
   APP LOGIC (ปรับให้กระชับขึ้น)
=============================================== */

// --- 1. DOM Elements ---
const contentTitle = document.getElementById('content-title');
const mainContentDisplay = document.getElementById('main-content-display');
const searchBar = document.getElementById('search-bar');
const navItems = document.querySelectorAll('.main-nav .nav-item');
const logoutBtn = document.getElementById('nav-logout');

// --- 2. Global State ---
let currentView = 'dashboard'; 
let allPosts = [], allUsers = [], allTickets = [];

// --- 3. Helper Functions ---
const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
const formatDate = (ts) => ts ? new Date(ts).toLocaleDateString("th-TH", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "-";

// --- 4. Main Render Function (สลับหน้า) ---
function renderCurrentView() {
    const searchTerm = searchBar.value.toLowerCase();
    
    // อัปเดต Title
    const activeNavItem = document.querySelector(`#nav-${currentView}`);
    if (activeNavItem) {
        contentTitle.textContent = activeNavItem.textContent.trim();
    }
    
    switch (currentView) {
        case 'dashboard':
            searchBar.placeholder = "Search dashboard...";
            renderDashboardPage();
            break;
        case 'reports':
            searchBar.placeholder = "Search reports (Email, Category)...";
            renderTicketsPage(searchTerm);
            break;
        case 'posts':
            searchBar.placeholder = "Search posts (Item, Location)...";
            renderPostsPage(searchTerm);
            break;
        case 'users':
            searchBar.placeholder = "Search users (Name, Email)...";
            renderUsersPage(searchTerm);
            break;
    }
}

// --- 5. (REFACTOR) Generic Table Renderer ---
/**
 * ฟังก์ชันกลางสำหรับสร้างตาราง (ช่วยประหยัดบรรทัดได้มาก)
 * @param {object} config - { title, data, columns, emptyMessage, showAddBtn, addBtnText }
 */
function renderDataTable(config) {
    const { title, data, columns, emptyMessage, showAddBtn = false, addBtnText = 'Add New' } = config;

    // สร้าง Header (th)
    const headers = columns.map(c => `<th class="${c.className || ''}">${c.header}</th>`).join('');

    // สร้าง Body (tr > td)
    const rows = data.length === 0
        ? `<tr><td colspan="${columns.length}" class="empty-cell">${emptyMessage}</td></tr>`
        : data.map(row => `
            <tr>${columns.map(c => `<td class="${c.className || ''}">${c.cell(row)}</td>`).join('')}</tr>
        `).join('');

    const addBtnHtml = showAddBtn
        ? `<button class="btn btn-primary-sm" data-action="add-new"><i class="fas fa-plus"></i> ${addBtnText}</button>`
        : '';

    // ประกอบร่าง
    mainContentDisplay.innerHTML = `
        <div class="data-list-card card">
            <div class="data-list-header">
                <h3>${title} (${data.length})</h3>
                ${addBtnHtml}
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

// --- 6. Page Renderers (กระชับมาก) ---

// 📊 Dashboard
function renderDashboardPage() {
    const pendingTickets = allTickets.filter(t => t.status === 'pending');
    const recentTickets = [...allTickets].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
    const newUsers = [...allUsers].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
    
    mainContentDisplay.innerHTML = `
        <div class="dashboard-content-grid">
            <div class="stats-cards-grid">
                <div class="stat-card">
                    <div class="stat-card-header"><div class="stat-icon blue"><i class="fas fa-ticket-alt"></i></div><h3>Pending Reports</h3></div>
                    <div class="stat-card-value">${pendingTickets.length}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-header"><div class="stat-icon green"><i class="fas fa-clipboard-list"></i></div><h3>Total Posts</h3></div>
                    <div class="stat-card-value">${allPosts.length}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-header"><div class="stat-icon purple"><i class="fas fa-users"></i></div><h3>Total Users</h3></div>
                    <div class="stat-card-value">${allUsers.length}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-header"><div class="stat-icon red"><i class="fas fa-ban"></i></div><h3>Banned Users</h3></div>
                    <div class="stat-card-value">${allUsers.filter(u => u.isBanned).length}</div>
                </div>
            </div>
            <div class="balance-card">
                <h3>Report Summary</h3>
                <div class="balance-amount">${pendingTickets.length} <small>Pending</small></div>
                <ul class="details-list">
                    <li><span>Total Reports</span><span>${allTickets.length}</span></li>
                    <li><span>Resolved</span><span>${allTickets.filter(t => t.status === 'resolved').length}</span></li>
                </ul>
                <button class="btn add-card-btn" data-nav-target="nav-reports">
                    <i class="fas fa-arrow-right"></i> View All Reports
                </button>
            </div>
            <div class="chart-card card">
                <div class="chart-card-header"><h3>Post Activity Trend</h3><select class="chart-filter"><option>Monthly</option></select></div>
                <div class="chart-placeholder"></div>
            </div>
            <div class="recent-activity-card card">
                <h3>Recent Reports</h3>
                <table class="activity-table">
                    <thead><tr><th>Category</th><th>Reported By</th><th>Status</th><th>Date</th></tr></thead>
                    <tbody>
                        ${recentTickets.length === 0 ? `<tr><td colspan="4" class="empty-cell">ไม่มีรายงานล่าสุด</td></tr>` : ''}
                        ${recentTickets.map(ticket => `
                            <tr>
                                <td>${escapeHtml(ticket.category)}</td>
                                <td>${escapeHtml(ticket.email.split('@')[0])}</td>
                                <td><span class="status-badge status-${ticket.status}">${ticket.status}</span></td>
                                <td>${formatDate(ticket.createdAt)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="upcoming-payments-card card">
                <h3>Recent New Users</h3>
                <ul class="payment-list">
                    ${newUsers.length === 0 ? `<li class="empty-cell" style="padding:10px 0">ไม่มีผู้ใช้ใหม่</li>` : ''}
                    ${newUsers.map((user, i) => `
                        <li class="payment-item">
                            <div class="payment-color-bar" style="background-color: ${['#007bff', '#ff9800', '#4caf50', '#9c27b0', '#f44336'][i % 5]}"></div>
                            <div class="payment-details"><div class="name">${escapeHtml(user.displayName)}</div><div class="date">${formatDate(user.createdAt)}</div></div>
                            <div class="payment-amount">${user.email ? 'Active' : 'Guest'}</div>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
    `;
    
    // ทำให้ปุ่ม "View All Reports" คลิกได้
    mainContentDisplay.querySelector('.add-card-btn')?.addEventListener('click', (e) => {
        document.getElementById(e.currentTarget.dataset.navTarget)?.click();
    });
}

// 🎟️ Manage Reports
function renderTicketsPage(searchTerm) {
    const data = allTickets.filter(t => (t.email + t.category + t.details).toLowerCase().includes(searchTerm)).sort((a, b) => b.createdAt - a.createdAt);
    renderDataTable({
        title: "All Reports",
        data: data,
        emptyMessage: "ไม่พบรายงานที่ตรงกัน",
        columns: [
            { header: "Category", className: "col-category", cell: row => escapeHtml(row.category) },
            { header: "Details", className: "col-details", cell: row => `<span title="${escapeHtml(row.details)}">${escapeHtml(row.details)}</span>` },
            { header: "Reported By", className: "col-email", cell: row => escapeHtml(row.email) },
            { header: "Status", className: "col-status", cell: row => `<span class="status-badge status-${row.status}">${row.status}</span>` },
            { header: "Date", className: "col-date", cell: row => formatDate(row.createdAt) },
            { header: "Actions", className: "col-actions", cell: row => row.status === 'pending'
                ? `<button class="btn btn-action btn-success" data-action="resolve-ticket" data-id="${row.id}"><i class="fas fa-check"></i> Resolve</button>`
                : `<button class="btn btn-action btn-secondary" data-action="reopen-ticket" data-id="${row.id}"><i class="fas fa-undo"></i> Re-open</button>`
            }
        ]
    });
}

// 📝 Manage Posts
function renderPostsPage(searchTerm) {
    const data = allPosts.filter(p => (p.itemName + p.location + p.createdByName).toLowerCase().includes(searchTerm)).sort((a, b) => b.createdAt - a.createdAt);
    renderDataTable({
        title: "All Posts",
        data: data,
        emptyMessage: "ไม่พบโพสต์ที่ตรงกัน",
        showAddBtn: true,
        addBtnText: 'Add New Post',
        columns: [
            { header: "Item Name", cell: row => escapeHtml(row.itemName) },
            { header: "Location", cell: row => escapeHtml(row.location) },
            { header: "Posted By", cell: row => escapeHtml(row.createdByName) },
            { header: "Date", className: "col-date", cell: row => formatDate(row.createdAt) },
            { header: "Actions", className: "col-actions", cell: row => `<button class="btn btn-action btn-danger" data-action="delete-post" data-id="${row.id}"><i class="fas fa-trash-alt"></i> Delete</button>` }
        ]
    });
}

// 👥 Manage Users
function renderUsersPage(searchTerm) {
    const data = allUsers.filter(u => (u.displayName + u.email + u.uid).toLowerCase().includes(searchTerm)).sort((a, b) => b.createdAt - a.createdAt);
    renderDataTable({
        title: "All Users",
        data: data,
        emptyMessage: "ไม่พบผู้ใช้ที่ตรงกัน",
        columns: [
            { header: "", className: "col-avatar", cell: row => row.photoURL ? `<img src="${row.photoURL}" alt="Avatar">` : '<div class="avatar-placeholder"><i class="fas fa-user"></i></div>' },
            { header: "Display Name", cell: row => escapeHtml(row.displayName) },
            { header: "Email", className: "col-email", cell: row => `<span title="${escapeHtml(row.email)}">${escapeHtml(row.email || '(No Email)')}</span>` },
            { header: "Status", className: "col-status", cell: row => `<span class="status-badge status-${row.isBanned ? 'banned' : 'active'}">${row.isBanned ? 'Banned' : 'Active'}</span>` },
            { header: "UID", className: "col-uid", cell: row => `<span title="${escapeHtml(row.uid)}">${escapeHtml(row.uid)}</span>` },
            { header: "Actions", className: "col-actions", cell: row => row.isBanned
                ? `<button class="btn btn-action btn-success" data-action="unban-user" data-id="${row.id}"><i class="fas fa-user-check"></i> Unban</button>`
                : `<button class="btn btn-action btn-danger" data-action="ban-user" data-id="${row.id}"><i class="fas fa-user-slash"></i> Ban</button>`
            }
        ]
    });
}

// --- 7. Action Handlers (Logic) ---
mainContentDisplay.addEventListener('click', (e) => {
    const target = e.target.closest('.btn-action, .btn-primary-sm, .add-card-btn');
    if (!target) return;
    
    const action = target.dataset.action;
    const id = target.dataset.id;

    if (action === 'add-new') {
        alert("(Mock) เปิดหน้า Add New Post!");
        return;
    }
    
    // หยุดถ้าไม่ใช่ปุ่มที่มี action และ id (ยกเว้นปุ่ม nav)
    if (!target.dataset.navTarget && (!action || !id)) return;
    
    // (Mock) Logic
    console.log(`(Mock) Action: ${action}, ID: ${id}`);
    
    // Backend Dev: นี่คือจุดที่คุณต้องยิง API
    try {
        switch (action) {
            case 'resolve-ticket':
                target.disabled = true;
                target.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
                setTimeout(() => {
                    allTickets.find(t => t.id === id).status = "resolved";
                    renderCurrentView();
                }, 300);
                break;
            case 'reopen-ticket':
                target.disabled = true;
                target.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
                setTimeout(() => {
                    allTickets.find(t => t.id === id).status = "pending";
                    renderCurrentView();
                }, 300);
                break;
            case 'delete-post':
                if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบโพสต์นี้ถาวร?")) {
                    target.disabled = true;
                    target.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
                    setTimeout(() => {
                        allPosts = allPosts.filter(p => p.id !== id);
                        renderCurrentView();
                    }, 300);
                }
                break;
            case 'ban-user':
                if (confirm("คุณแน่ใจหรือไม่ว่าต้องการแบนผู้ใช้นี้?")) {
                    target.disabled = true;
                    target.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
                    setTimeout(() => {
                        allUsers.find(u => u.id === id).isBanned = true;
                        renderCurrentView();
                    }, 300);
                }
                break;
            case 'unban-user':
                target.disabled = true;
                target.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
                setTimeout(() => {
                    allUsers.find(u => u.id === id).isBanned = false;
                    renderCurrentView();
                }, 300);
                break;
        }
    } catch (err) { 
        console.error(`Action ${action} failed:`, err); 
        renderCurrentView(); // คืนปุ่มกลับสู่สภาพเดิมหากมี error
    }
});

// --- 8. Navigation Logic ---
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const target = e.currentTarget;
        if (!target.id) return;

        navItems.forEach(nav => nav.classList.remove('active'));
        target.classList.add('active');
        currentView = target.id.replace('nav-', ''); 
        renderCurrentView();
    });
});

logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
        console.log("(Mock) Logging out...");
        alert("ออกจากระบบ (จำลอง)");
    }
});

searchBar.addEventListener('input', renderCurrentView);

// --- 9. Initial Load ---
allPosts = [...mockPosts];
allUsers = [...mockUsers];
allTickets = [...mockTickets];
renderDashboardPage(); // โหลดหน้า Dashboard เป็นหน้าแรก