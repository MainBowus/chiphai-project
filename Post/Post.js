// Post.js
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
    getFirestore, collection, getDocs, query, orderBy, limit, doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
    getAuth, onAuthStateChanged, signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

/* ---------- Firebase config (เหมือนเดิม) ---------- */
const firebaseConfig = {
    apiKey: "AIzaSyBQlq_ZgG1eUVrMGXo178wNW7GMr6imCDk",
    authDomain: "chiphailogin01.firebaseapp.com",
    projectId: "chiphailogin01",
    storageBucket: "chiphailogin01.appspot.com",
    messagingSenderId: "122413223952",
    appId: "1:122413223952:web:35a1f19668bf22be13fa95",
    measurementId: "G-2B1K7VV4ZT"
};

/* ---------- Init (เหมือนเดิม) ---------- */
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

/* ---------- Elements (ฉบับสมบูรณ์) ---------- */
const itemsEl           = document.getElementById("items");
const loginBtn          = document.getElementById("loginBtn");
const profileBtn        = document.getElementById("loginBtn");
const logoBtn           = document.getElementById("logoBtn");
const createBtn         = document.getElementById("createBtn");

const searchInput       = document.getElementById("mainSearchInput");

const paginationContainer = document.getElementById("paginationContainer");
const mobileNavToggle   = document.getElementById("mobileNavToggle");
const mobileNav         = document.getElementById("mobileNav");

/* ---------- Pagination State ---------- */
let allPosts = []; // เก็บโพสต์ทั้งหมดที่โหลดมา
let filteredPosts = []; // เก็บโพสต์ที่ผ่านการค้นหา
let currentPage = 1;
let itemsPerPage = 9; // <-- คุณสามารถเปลี่ยนตัวเลขนี้ได้ (เช่น 6, 9, 12)

/* ---------- Navigation ---------- */
logoBtn?.addEventListener("click", ()=>window.location.href="../index.html");
profileBtn?.addEventListener("click", () => {
    window.location.href = "../Profile/Profile.html";
});
createBtn?.addEventListener("click", ()=>{
    window.location.href="../PostCreate/CreatePost.html";
});

/* ---------- Mobile Nav Logic ---------- */
mobileNavToggle?.addEventListener("click", () => {
    document.body.classList.toggle("mobile-nav-open");
});

/* ---------- Auth & Profile (เหมือนเดิม) ---------- */
async function upsertProfile(user){
    if(!user) return;
    const ref = doc(db,"users_create",user.uid);
    const now = new Date();
    const snap = await getDoc(ref);
    await setDoc(ref, {
        uid: user.uid,
        displayName: user.displayName || (user.email ? user.email.split("@")[0] : "User"),
        email: user.email || "",
        photoURL: user.photoURL || "",
        providerPrimary: (user.providerData?.[0]?.providerId || "").replace(".com",""),
        providers: (user.providerData || []).map(p=>p.providerId),
        lastLoginAt: now,
        createdAt: snap.exists()? (snap.data().createdAt||now) : now
    }, {merge:true});
}
onAuthStateChanged(auth, async (user)=>{
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> parent of 33c7fa8 (Update Post.js)
    if(!user){
        await signInAnonymously(auth);
        return;
    }
<<<<<<< HEAD
=======
    if (!user) {
    alert("กรุณาเข้าสู่ระบบก่อนใช้งานหน้านี้");
    window.location.href = "/chiphai-project-main/index.html";
    return;
}
>>>>>>> parent of 2e66b81 (Update Post.js)
    await upsertProfile(user);
    const name = user.displayName || (user.email ? user.email.split("@")[0] : "Guest");
    const photo = user.photoURL || "";
    if(profileBtn){
        profileBtn.textContent = "";
        const span = document.createElement("span");
        span.className = "avatar";
        span.innerHTML = photo ? `<img src="${photo}" alt="${name}">` : "👤";
        profileBtn.appendChild(span);
        const nameSpan = document.createElement("span");
        nameSpan.textContent = name;
        nameSpan.style.marginLeft = "8px";
        profileBtn.appendChild(nameSpan);
    }
=======
    if (!user) {
    alert("กรุณาเข้าสู่ระบบก่อนใช้งานหน้านี้");
    window.location.href = "/chiphai-project-main/index.html";
    return;
}
=======
>>>>>>> parent of 33c7fa8 (Update Post.js)
    await upsertProfile(user);
    const name = user.displayName || (user.email ? user.email.split("@")[0] : "Guest");
    const photo = user.photoURL || "";
    if(profileBtn){
        profileBtn.textContent = "";
        const span = document.createElement("span");
        span.className = "avatar";
        span.innerHTML = photo ? `<img src="${photo}" alt="${name}">` : "👤";
        profileBtn.appendChild(span);
        const nameSpan = document.createElement("span");
        nameSpan.textContent = name;
        nameSpan.style.marginLeft = "8px";
        profileBtn.appendChild(nameSpan);
    }
>>>>>>> parent of 2e66b81 (Update Post.js)
});

/* ---------- Utils (เหมือนเดิม) ---------- */
function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
}
function parseFoundAt(foundAt){
    if(!foundAt) return null;
    if(typeof foundAt.toDate==="function") return foundAt.toDate();
    const d = new Date(foundAt);
    return isNaN(d)? null : d;
}
function formatThaiDateTime(dt){
    if(!dt) return "-";
    const d = dt.toLocaleDateString("th-TH",{day:"2-digit", month:"2-digit", year:"numeric"});
    const t = dt.toLocaleTimeString("th-TH",{hour:"2-digit", minute:"2-digit"});
    return `${d} เวลา ${t}`;
}

/* ---------- Render Card (ดีไซน์ Professional) ---------- */
function renderCard(docId, data) {
    const {
        itemName = "ไม่มีชื่อไอเท็ม",
        description = "ไม่มีคำอธิบาย",
        location = "ไม่ระบุสถานที่",
        imageUrl = "",
        createdByName = "User",
        createdByPhotoURL = "",
        foundAt: rawFoundAt
    } = data;
    const foundAt = parseFoundAt(rawFoundAt);
    const dateText = formatThaiDateTime(foundAt);
    const card = document.createElement("div");
    card.className = "card";
    card.addEventListener("click", () => {
        window.location.href = `../Postview/Postview.html?id=${encodeURIComponent(docId)}`;
    });
    card.innerHTML = `
        <div class="card-image">
            ${imageUrl 
                ? `<img src="${imageUrl}" alt="${escapeHtml(itemName)}" loading="lazy">` 
                : `<div class="img-placeholder"><i class="fas fa-image"></i></div>`
            }
        </div>
        <div class="card-content">
            <h3 class="card-title">${escapeHtml(itemName)}</h3>
            <p class="card-description">${escapeHtml(description)}</p>
            <div class="card-meta-grid">
                <div class="meta-item"><i class="fas fa-map-marker-alt"></i><span>${escapeHtml(location)}</span></div>
                <div class="meta-item"><i class="fas fa-calendar-alt"></i><span>${escapeHtml(dateText)}</span></div>
            </div>
            <div class="card-footer">
                <div class="author-profile">
                    <div class="author-avatar">${createdByPhotoURL ? `<img src="${createdByPhotoURL}" alt="${escapeHtml(createdByName)}">` : "👤"}</div>
                    <span class="author-name">${escapeHtml(createdByName)}</span>
                </div>
                <button class="view-btn" data-id="${escapeHtml(docId)}">View</button>
            </div>
        </div>
    `;
    card.querySelector(".view-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        window.location.href = `../Postview/Postview.html?id=${encodeURIComponent(docId)}`;
    });
    return card;
}

/* ---------- Pagination Logic ---------- */

/**
 * แสดงผลโพสต์ตามหน้าที่เลือก
 */
function displayPage(page, postsToShow) {
    itemsEl.innerHTML = "";
    paginationContainer.innerHTML = "";
    currentPage = page;

    if (postsToShow.length === 0) {
        itemsEl.innerHTML = `<div class="card" style="grid-column: 1 / -1; text-align: center; padding: 40px;"><div class="card-title">ไม่พบโพสต์</div></div>`;
        return;
    }

    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = postsToShow.slice(startIndex, endIndex);

    const frag = document.createDocumentFragment();
    for (const post of paginatedItems) {
        frag.appendChild(renderCard(post.id, post.data));
    }
    itemsEl.appendChild(frag);

    setupPagination(postsToShow.length);
    
    // เลื่อนขึ้นไปบนสุด (เพื่อ UX ที่ดี)
    // เราใช้ main-container แทน window เพราะ header fixed
    document.querySelector('.main-container').scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * สร้างปุ่มตัวเลข 1 2 3 ...
 */
function setupPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return; 

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.className = "page-btn";
        btn.innerText = i;
        
        if (i === currentPage) {
            btn.classList.add("active");
        }

        btn.addEventListener("click", () => {
            displayPage(i, filteredPosts); 
        });
        
        paginationContainer.appendChild(btn);
    }
}

/* ---------- Search Logic ---------- */
function handleSearch() {
    const term = searchInput.value.trim().toLowerCase();
    
    if (!term) {
        filteredPosts = [...allPosts];
    } else {
        filteredPosts = allPosts.filter(p => {
            const { itemName = "", description = "", location = "" } = p.data;
            return itemName.toLowerCase().includes(term)
                || description.toLowerCase().includes(term)
                || location.toLowerCase().includes(term);
        });
    }
    
    displayPage(1, filteredPosts);
}
searchInput?.addEventListener("input", handleSearch);


/* ---------- Load Posts ---------- */
async function loadPosts(){
    itemsEl.innerHTML = `<div class="card" style="grid-column: 1 / -1; text-align: center; padding: 40px;"><div class="card-title">กำลังโหลดรายการ...</div></div>`;
    try{
        const q = query(collection(db,"lost_items"), orderBy("createdAt","desc"), limit(50));
        const snap = await getDocs(q);
        
        if(snap.empty){
            itemsEl.innerHTML = `<div class="card" style="grid-column: 1 / -1; text-align: center; padding: 40px;"><div class="card-title">ยังไม่มีโพสต์</div><p class="card-description">กด "Create Post" เพื่อเพิ่มรายการแรก</p></div>`;
            return;
        }

        allPosts = [];
        snap.forEach(doc => {
            allPosts.push({id: doc.id, data: doc.data()});
        });
        filteredPosts = [...allPosts];

        displayPage(1, filteredPosts);

    } catch(err){
        console.error("[post] load error:",err);
        itemsEl.innerHTML = `<div class="card" style="grid-column: 1 / -1; text-align: center; padding: 40px;"><div class="card-title">โหลดรายการไม่สำเร็จ</div><p class="card-description">${escapeHtml(err?.message||String(err))}</p></div>`;
    }
}

// --- เริ่มโหลดโพสต์ ---
loadPosts();