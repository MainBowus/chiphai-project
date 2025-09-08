
import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
  signInWithEmailAndPassword, fetchSignInMethodsForEmail, linkWithCredential, EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, setDoc, updateDoc, deleteField,
  query, where, limit, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/* ---- Init ---- */
let app;
if (getApps().length) {
  app = getApp();
  console.log("[auth.addon] reuse app");
} else {
  app = initializeApp({
    apiKey: "AIzaSyBQlq_ZgG1eUVrMGXo178wNW7GMr6imCDk",
    authDomain: "chiphailogin01.firebaseapp.com",
    projectId: "chiphailogin01",
    storageBucket: "chiphailogin01.firebasestorage.app",
    messagingSenderId: "122413223952",
    appId: "1:122413223952:web:35a1f19668bf22be13fa95",
    measurementId: "G-2B1K7VV4ZT"
  });
  console.log("[auth.addon] init app");
}
const auth  = getAuth(app);
const db    = getFirestore(app);
const gprov = new GoogleAuthProvider();

/* ---- DOM ---- */
const googleAnchor = document.querySelector(".media-options a");
const navbarUser   = document.getElementById("navbarUser");
const wrapper      = document.querySelector(".wrapper");

/* ---- UI helpers ---- */
function openPopup(){ wrapper?.classList?.add("active-popup"); }
function closePopup(){ wrapper?.classList?.remove("active"); wrapper?.classList?.remove("active-popup"); }

/* ---- Render navbar ---- */
function renderNavbar(user) {
  if (!navbarUser) return;
  if (user) {
    const photo = user.photoURL ? `<img src="${user.photoURL}" referrerpolicy="no-referrer">` : `<i class='bx bxs-user'></i>`;
    navbarUser.innerHTML = `
      <div class="user-menu">
        ${photo}
        <span>${user.displayName ?? user.email ?? "User"}</span>
        <div class="dropdown hidden"><button id="logoutBtn">Logout</button></div>
      </div>
    `;
    const userMenu  = navbarUser.querySelector(".user-menu");
    const dropdown  = navbarUser.querySelector(".dropdown");
    const logoutBtn = navbarUser.querySelector("#logoutBtn");
    userMenu?.addEventListener("click", () => dropdown?.classList.toggle("hidden"));
    logoutBtn?.addEventListener("click", async (e) => { e.stopPropagation(); await signOut(auth); });
  } else {
    navbarUser.innerHTML = `<button class="btnLogin-popup">Login</button>`;
  }
}

/* ---- Write profile to users_google/{uid} ---- */
async function upsertGoogleProfile(user, extra = {}) {
  const ref  = doc(db, "users_google", user.uid);
  const prev = await getDoc(ref);
  const base = {
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    providers: user.providerData.map(p => p.providerId),
    lastLoginAt: serverTimestamp(),
  };
  const created = prev.exists() ? {} : { createdAt: serverTimestamp() };
  const data = { ...created, ...base, ...extra };

  console.log("[auth.addon] upsert users_google/", user.uid, data);
  await setDoc(ref, data, { merge: true });
  console.log("[auth.addon] upsert OK users_google/", user.uid);
}

/* ---- Google Sign-In + migrate from users_create ---- */
googleAnchor?.addEventListener("click", async (e) => {
  e.preventDefault();
  console.log("[auth.addon] click Google");
  try {
    const result = await signInWithPopup(auth, gprov);
    const user   = result.user;
    console.log("[auth.addon] signed in as", user.uid, user.email);

    // migrate: remove password from users_create if same email
    if (user.email) {
      const qLegacy = query(collection(db, "users_create"), where("email", "==", user.email), limit(1));
      const sLegacy = await getDocs(qLegacy);
      if (!sLegacy.empty) {
        const d = sLegacy.docs[0].data();
        if (d?.password) {
          try {
            console.log("[auth.addon] remove password from", sLegacy.docs[0].ref.path);
            await updateDoc(sLegacy.docs[0].ref, { password: deleteField(), migratedAt: serverTimestamp() });
          } catch (e1) {
            console.error("[auth.addon] FAILED remove password", e1);
          }
        }
      }
    }

    try {
      await upsertGoogleProfile(user, { providerPrimary: "google" });
    } catch (eUp) {
      console.error("[auth.addon] UPSERT FAILED", eUp);
    }

    closePopup();
    alert("ล็อกอินผ่านแล้ว ✅");
  } catch (err) {
    console.error("[auth.addon] signIn error", err);
    if (err?.code === "auth/account-exists-with-different-credential") {
      const email = err.customData?.email;
      const pendingCred = EmailAuthProvider.credentialFromError?.(err) || err.customData?.credential;
      if (!email) { alert("อีเมลนี้มีอยู่แล้วกับผู้ให้บริการอื่น โปรดล็อกอินด้วยวิธีนั้นก่อน แล้วจะเชื่อมให้"); return; }
      try {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods.includes("password")) {
          const pass = prompt(`อีเมลนี้เคยสมัครด้วยรหัสผ่าน\nกรุณากรอกรหัสผ่านของ ${email} เพื่อเชื่อมกับ Google:`);
          if (!pass) return;
          const emailCred = EmailAuthProvider.credential(email, pass);
          const passUser  = await signInWithEmailAndPassword(auth, email, pass);
          await linkWithCredential(passUser.user, pendingCred);
          await upsertGoogleProfile(passUser.user);
          alert("เชื่อมบัญชี Google กับบัญชีเดิมสำเร็จ");
          closePopup();
        } else {
          alert(`อีเมลนี้ผูกกับวิธี: ${methods.join(", ")}\nกรุณาล็อกอินด้วยวิธีนั้นก่อน แล้วจะเชื่อมให้`);
        }
      } catch (e2) {
        console.error(e2);
        alert(e2?.message ?? "ไม่สามารถเชื่อมบัญชีได้");
      }
    } else {
      alert(err?.message ?? "Google sign-in failed");
    }
  }
});


onAuthStateChanged(auth, async (user) => {
  console.log("[auth.addon] auth state:", user?.uid || null);
  renderNavbar(user);
  if (user) {
    try {
      // ถ้า สร้างusers_google
      const ref = doc(db, "users_google", user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        console.log("[auth.addon] fallback create users_google/", user.uid);
        await upsertGoogleProfile(user, { providerPrimary: "google" });
      }
    } catch (e) {
      console.error("[auth.addon] fallback upsert failed", e);
    }
  }
});

/* ---- Ensure popup open when Login button recreated ---- */
navbarUser?.addEventListener("click", (e) => {
  const t = e.target;
  if (!(t instanceof Element)) return;
  if (t.classList.contains("btnLogin-popup") || t.closest(".btnLogin-popup")) openPopup();
});
