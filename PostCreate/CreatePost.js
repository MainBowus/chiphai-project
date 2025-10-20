import { auth, db } from "./CreatePostFirebase.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

/* ---------- Cloudinary config ---------- */
const CLOUD_NAME = "djlilcqzd";
const UPLOAD_PRESET = "chiphai_unsigned";
const TRANSFORM = "f_webp,q_auto,w_1200";

/* ---------- Helper ---------- */
const $id = (id) => document.getElementById(id);
const read = (id) => ($id(id)?.value?.trim() || "");

function getUserDisplayName(user) {
  if (!user) return "Guest";
  if (user.displayName) return user.displayName;
  if (user.email) return user.email.split("@")[0];
  return "Guest";
}

/* ---------- Elements ---------- */
const input = $id("imageUpload");
const preview = $id("preview");
const postBtn = $id("PostBtn");
const msgEl = $id("msg");
const usernameEl = $id("username");

let authReady = false;
if (postBtn) postBtn.disabled = true;

/* ---------- Auth ---------- */
onAuthStateChanged(auth, (user) => {
  authReady = !!user;
  if (postBtn) postBtn.disabled = !authReady;
  if (usernameEl) usernameEl.textContent = getUserDisplayName(user);
});

/* ---------- Preview ---------- */
let objectUrl;
input?.addEventListener("change", () => {
  const file = input.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    alert("ไฟล์ใหญ่เกินไป (จำกัด 5 MB)");
    input.value = "";
    return;
  }
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
  preview.src = objectUrl;
  preview.style.display = "block";
});

/* ---------- Upload Cloudinary ---------- */
async function uploadFileToCloudinary(file, uid) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);
  fd.append("folder", `lost_items/${uid || "anonymous"}`);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: fd
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Upload failed");

  const originalUrl = data.secure_url;
  return originalUrl.replace("/upload/", `/upload/${TRANSFORM}/`);
}

/* ---------- Post handler ---------- */
postBtn?.addEventListener("click", async () => {
  if (!authReady) {
    alert("ระบบกำลังเตรียมล็อกอิน ลองใหม่อีกครั้ง");
    return;
  }

  const itemName = read("Item");
  const location = read("location");
  const dateStr = read("dateFounded");
  const timeStr = read("timeFounded");
  const description = read("description");

  if (!itemName || !location || !dateStr || !timeStr || !description) {
    alert("กรอกข้อมูลให้ครบทุกช่องก่อนโพสต์");
    return;
  }

  const foundAt = new Date(`${dateStr}T${timeStr}:00`);
  if (isNaN(foundAt.getTime())) {
    alert("รูปแบบวัน/เวลาไม่ถูกต้อง");
    return;
  }

  postBtn.disabled = true;
  postBtn.textContent = "Posting…";
  msgEl.textContent = "กำลังอัปโหลดโพสต์...";

  try {
    const user = auth.currentUser;
    if (!user) throw new Error("ไม่พบข้อมูลผู้ใช้");

    let imageUrl = "";
    const file = input?.files?.[0];
    if (file) imageUrl = await uploadFileToCloudinary(file, user.uid);

    await addDoc(collection(db, "lost_items"), {
      itemName,
      location,
      description,
      foundAt,
      imageUrl,
      createdAt: serverTimestamp(),
      createdBy: user.uid,
      createdByName: getUserDisplayName(user),
      createdByEmail: user.email || "",
      status: "open"
    });

    msgEl.style.color = "green";
    msgEl.textContent = "สร้างโพสต์สำเร็จ!";
    alert("สร้างโพสต์สำเร็จ!");
    window.location.href = "../Post/Post.html";
  } catch (err) {
    console.error("[CreatePost error]", err);
    msgEl.style.color = "red";
    msgEl.textContent = "เกิดข้อผิดพลาด: " + (err?.message || err);
    alert("เกิดข้อผิดพลาด: " + (err?.message || err));
  } finally {
    postBtn.disabled = false;
    postBtn.textContent = "Post";
  }
});

console.log("[CreatePost.js] loaded ✅");