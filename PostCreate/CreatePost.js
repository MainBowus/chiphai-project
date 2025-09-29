// CreatePost.js
import { auth, db } from "./CreataPostfirebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

/* ===== Cloudinary===== */
const CLOUD_NAME    = "djlilcqzd";
const UPLOAD_PRESET = "chiphai_unsigned";
const TRANSFORM     = "f_webp,q_auto,w_1200";

/* ===== Helpers ===== */
const $id = (id) => document.getElementById(id);
const read = (id) => {
  const el = $id(id);
  return (el && typeof el.value === "string") ? el.value.trim() : "";
};
/* ---------- Elements ---------- */
const itemsEl   = document.getElementById("items");
const loginBtn  = document.getElementById("loginBtn");


document.getElementById("createBtn")?.addEventListener("click", () => {
  window.location.href = "../PostCreate/CreatePost.html";
});
document.getElementById("logoBtn")?.addEventListener("click", () => {
  window.location.href = "../index.html";
});
loginBtn?.addEventListener("click", () => {

  window.location.href = "../index.html";
});


function getUserDisplayName(user) {
  if (!user) return "Guest";

  if (user.displayName && user.displayName.trim()) return user.displayName.trim();

  const pd = (user.providerData && user.providerData[0]) ? user.providerData[0] : null;
  if (pd && pd.displayName && pd.displayName.trim()) return pd.displayName.trim();

  if (user.email && user.email.includes("@")) return user.email.split("@")[0];

  return "Guest";
}

function assertCloudinary() {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("กรุณาตั้งค่า CLOUD_NAME และ UPLOAD_PRESET ให้ครบ");
  }
}

/* ===== Elements ===== */
const input       = $id("imageUpload");
const preview     = $id("preview");
const postBtn     = $id("PostBtn");
const postBtnText = $id("postBtnText");

/* ===== Debug ===== */
window.addEventListener("error", (e) => console.error("[WindowError]", e.error || e.message));
window.addEventListener("unhandledrejection", (e) => console.error("[UnhandledRejection]", e.reason));
console.log("[CreatePost.js] loaded (Cloudinary + save poster name)");

/* ===== Auth gate ===== */
let authReady = false;
if (postBtn) postBtn.disabled = true;

onAuthStateChanged(auth, (user) => {
  authReady = !!user;
  if (postBtn) postBtn.disabled = !authReady;

  const name = getUserDisplayName(user);
  const uEl = $id("username");
  if (uEl) uEl.textContent = name;
});

/* ===== Preview image ===== */
let objectUrl;
input?.addEventListener("change", () => {
  const file = input.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { // 5MB
    alert("ไฟล์ใหญ่เกินไป (จำกัด 5 MB)");
    input.value = "";
    return;
  }
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
  if (preview) {
    preview.src = objectUrl;
    preview.style.display = "block";
  }
});

/* ===== Cloudinary upload ===== */
async function cloudinaryUpload(formData) {
  assertCloudinary();
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData
  });
  const text = await res.text();
  if (!res.ok) {
    if (text.includes("Upload preset not found")) {
      throw new Error("Cloudinary: ไม่พบ Upload preset — ตรวจสอบชื่อ, โหมด Unsigned, และ cloud_name ให้ตรง");
    }
    throw new Error("Cloudinary upload failed: " + text);
  }
  const data = JSON.parse(text);
  const originalUrl    = data.secure_url;
  const transformedUrl = originalUrl.replace("/upload/", `/upload/${TRANSFORM}/`);
  return { originalUrl, transformedUrl };
}

async function uploadFileToCloudinary(file, uid) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);
  fd.append("folder", `lost_items/${uid || "anonymous"}`);
  return cloudinaryUpload(fd);
}

/* ===== Post handler ===== */
postBtn?.addEventListener("click", async () => {
  if (!authReady) { alert("ระบบกำลังเตรียมล็อกอิน ลองใหม่อีกครั้ง"); return; }

  const itemName    = read("Item");
  const location    = read("location");
  const dateStr     = read("dateFounded");
  const timeStr     = read("timeFounded");
  const description = read("description");

  if (!itemName || !location || !dateStr || !timeStr || !description) {
    alert("กรอกข้อมูลให้ครบทุกช่องก่อนโพสต์");
    return;
  }

  const foundAt = new Date(`${dateStr}T${timeStr}:00`);
  if (isNaN(foundAt.getTime())) { alert("รูปแบบวัน/เวลาไม่ถูกต้อง"); return; }

  postBtn.disabled = true;
  postBtnText.textContent = "Posting…";

  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No auth user");

    const uid          = user.uid;
    const createdByName  = getUserDisplayName(user);
    const createdByEmail = user.email || "";

    // อัปโหลดรูปถ้ามี
    let imageUrl = "";
    const file = input?.files?.[0];
    if (file) {
      const up = await uploadFileToCloudinary(file, uid);
      imageUrl = up.transformedUrl;
    }

    // บันทึกเอกสาร
    await addDoc(collection(db, "lost_items"), {
      itemName,
      location,
      description,
      foundAt,
      imageUrl,
      createdAt: serverTimestamp(),
      createdBy: uid,
      createdByName,
      createdByEmail,
      status: "open"
    });

    alert("สร้างโพสต์สำเร็จ!");
    window.location.href = "../Post/Post.html";
  } catch (err) {
    console.error("[post] error:", err);
    alert("เกิดข้อผิดพลาด: " + (err?.message || err));
  } finally {
    postBtn.disabled = false;
    postBtnText.textContent = "Post";
  }
});
