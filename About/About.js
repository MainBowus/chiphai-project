// ...existing code...
document.getElementById("logoBtn")?.addEventListener("click", () => {
  window.location.href = "../index.html";
});

document.getElementById("loginBtn")?.addEventListener("click", () => {
  window.location.href = "../index.html";
});


const team = [
  { name: "วรินทร แก้วสอาด", role: "Project Lead", avatar: "../image/background.png" },
  { name: "อมรเทพ จีระมานะพงศ์", role: "Frontend", avatar: "../image/f5b1b6a3-2d97-45b6-96d5-c07a62f49722.jpg" },
  { name: "ปรัตภกร ดีทองอ่อน", role: "Backend", avatar: "👩‍🎨" },
  { name: "จอมภัช ตรีธรปณธิ", role: "Designer", avatar: "../image/IMG_9048.jpg" },
  { name: "ธนกร เลขะวัฒนะ", role: "Designer", avatar: "👩‍🎨" } // emoji fallback
];

const grid = document.getElementById("teamGrid");
if (grid) {
  grid.innerHTML = "";

  team.forEach(m => {
    const a = document.createElement("article");
    a.className = "member";

    const avatarWrap = document.createElement("div");
    avatarWrap.className = "avatar";

    const isUrl = (s) => typeof s === "string" && /^https?:\/\//i.test(s);
    const isLocalPath = (s) => typeof s === "string" && (/^[.\/]/.test(s) || s.includes("/"));
    const isEmojiOrText = (s) => typeof s === "string" && !isUrl(s) && !isLocalPath(s);

    if (m.avatar && (isUrl(m.avatar) || isLocalPath(m.avatar))) {
      const img = document.createElement("img");
      img.loading = "lazy";
      img.src = m.avatar;
      img.alt = m.name;
      img.addEventListener("error", () => {
        avatarWrap.innerHTML = `<div class="avatar-emoji">👤</div>`;
      });
      avatarWrap.appendChild(img);
    } else {
      const emoji = (m.avatar && isEmojiOrText(m.avatar)) ? m.avatar : "👤";
      avatarWrap.innerHTML = `<div class="avatar-emoji">${emoji}</div>`;
    }

    const nameEl = document.createElement("div");
    nameEl.className = "member-name";
    nameEl.textContent = m.name;

    const roleEl = document.createElement("div");
    roleEl.className = "member-role";
    roleEl.textContent = m.role;

    a.appendChild(avatarWrap);
    a.appendChild(nameEl);
    a.appendChild(roleEl);

    grid.appendChild(a);
  });
}
