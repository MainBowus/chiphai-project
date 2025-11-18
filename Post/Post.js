import { auth, db } from "./CreataPostFirebase.js";
import {
  collection, addDoc, serverTimestamp, doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

/* ---------- Cloudinary ---------- */
const CLOUD_NAME = "djlilcqzd";
const UPLOAD_PRESET = "chiphai_unsigned";
const TRANSFORM = "f_webp,q_auto,w_1200";

const $id = (id) => document.getElementById(id);
const read = (id) => ($id(id)?.value?.trim() || "");

const input = $id("imageUpload");
const preview = $id("preview");
const postBtn = $id("PostBtn");
const msgEl = $id("msg");
const usernameEl = $id("username");
const avatarEl = document.querySelector(".avatar");

/* ---------- Custom Alert Element ---------- */
const customAlert = document.getElementById("customAlert");
const customAlertMessage = document.getElementById("customAlertMessage");
const customAlertOkBtn = document.getElementById("customAlertOkBtn");
const customAlertCancelBtn = document.getElementById("customAlertCancelBtn");

let authReady = false;
if (postBtn) postBtn.disabled = true;

/* ------------------------------------------------------
   ⭐ 1) บันทึก users_create ให้เหมือน users_google ⭐
------------------------------------------------------ */
async function upsertUsersCreate(user) {
  if (!user) return;

  const ref = doc(db, "users_create", user.uid);
  const snap = await getDoc(ref);

  const data = {
    uid: user.uid,
    displayName: user.displayName || "",
    email: user.email || "",
    photoURL: user.photoURL || "",
    providerPrimary: (user.providerData?.[0]?.providerId || "").replace(".com", ""),
    providers: user.providerData.map(p => p.providerId),
    lastLoginAt: new Date(),
    createdAt: snap.exists()
      ? (snap.data().createdAt || new Date())
      : new Date()
  };

  await setDoc(ref, data, { merge: true });
}

/* ------------------------------------------------------
   ⭐ 2) Auth + Avatar
------------------------------------------------------ */
onAuthStateChanged(auth, async (user) => {
  authReady = !!user;
  if (postBtn) postBtn.disabled = !authReady;

  if (!user) {
    usernameEl.textContent = "Guest";
    avatarEl.textContent = "👤";
    return;
  }

  await upsertUsersCreate(user);

  const displayName =
    user.displayName ||
    (user.email ? user.email.split("@")[0] : "User");

  usernameEl.textContent = displayName;

  let photoURL = user.photoURL || "";

  // ถ้ามีรูปใน users_create → ใช้รูปนั้นก่อน
  const profileSnap = await getDoc(doc(db, "users_create", user.uid));
  if (profileSnap.exists() && profileSnap.data().photoURL) {
    photoURL = profileSnap.data().photoURL;
  }

  avatarEl.innerHTML = photoURL
    ? `<img src="${photoURL}" alt="${displayName}">`
    : "👤";

  user._resolvedPhotoURL = photoURL;
});

/* ------------------------------------------------------
   ⭐ 3) Preview
------------------------------------------------------ */
let objectUrl;
input?.addEventListener("change", () => {
  const file = input.files?.[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    showCustomAlert("ไฟล์ใหญ่เกินไป (สูงสุด 5MB)");
    input.value = "";
    return;
  }

  if (objectUrl) URL.revokeObjectURL(objectUrl);

  objectUrl = URL.createObjectURL(file);
  preview.src = objectUrl;
  preview.style.display = "block";
});

/* ------------------------------------------------------
   ⭐ 4) Cloudinary Upload
------------------------------------------------------ */
async function uploadFileToCloudinary(file, uid) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);
  fd.append("folder", `lost_items/${uid}`);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: fd
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Upload failed");

  return data.secure_url.replace("/upload/", `/upload/${TRANSFORM}/`);
}

/* ------------------------------------------------------
   ⭐ 5) Post Lost Item
------------------------------------------------------ */
postBtn?.addEventListener("click", async () => {
  if (!authReady) {
    showCustomAlert("โปรดเข้าสู่ระบบก่อนโพสต์");
    return;
  }

  const itemName = read("Item");
  const location = read("location");
  const dateStr = read("dateFounded");
  const timeStr = read("timeFounded");
  const description = read("description");

  if (!itemName || !location || !dateStr || !timeStr || !description) {
    showCustomAlert("กรอกข้อมูลให้ครบทุกช่องก่อนโพสต์");
    return;
  }

  const foundAt = new Date(`${dateStr}T${timeStr}:00`);

  postBtn.disabled = true;
  postBtn.textContent = "Posting…";

  try {
    const user = auth.currentUser;
    if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อน");

    let imageUrl = "";
    const file = input.files?.[0];
    if (file) imageUrl = await uploadFileToCloudinary(file, user.uid);

    await addDoc(collection(db, "lost_items"), {
      itemName,
      location,
      description,
      foundAt,
      imageUrl,
      createdAt: serverTimestamp(),
      createdBy: user.uid,
      createdByName: user.displayName || "User",
      createdByEmail: user.email || "",
      createdByPhotoURL: user._resolvedPhotoURL || "",
      status: "open"
    });

    showCustomAlert("โพสต์สำเร็จ!", () => {
      window.location.href = "../Post/Post.html";
    });

  } catch (err) {
    console.error(err);
    showCustomAlert("เกิดข้อผิดพลาด: " + err.message);
  } finally {
    postBtn.disabled = false;
    postBtn.textContent = "Post";
  }
});

/* ------------------------------------------------------
   ⭐ 6) Custom Alert
------------------------------------------------------ */
let alertOkCallback = null;

function showCustomAlert(message, onClose) {
  customAlertMessage.textContent = message;
  alertOkCallback = onClose || null;

  customAlert.classList.remove("hidden");
  setTimeout(() => customAlert.classList.add("show"), 20);
}

function hideCustomAlert(runCallback = false) {
  customAlert.classList.remove("show");
  setTimeout(() => {
    customAlert.classList.add("hidden");
    if (runCallback && typeof alertOkCallback === "function") {
      alertOkCallback();
    }
  }, 200);
}

customAlertOkBtn?.addEventListener("click", () => hideCustomAlert(true));
customAlertCancelBtn?.addEventListener("click", () => hideCustomAlert(false));

console.log("[CreatePost.js] loaded OK");
