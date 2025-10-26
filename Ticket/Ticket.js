particlesJS('particles-js', {
  particles: {
    number: { value: 100, density: { enable: true, value_area: 800 } },
    color: { value: "#a3ec9c" },
    shape: { type: "circle" },
    opacity: { value: 0.8, random: true },
    size: { value: 6, random: true },
    line_linked: { enable: false },
    move: { enable: true, speed: 1, direction: "bottom", out_mode: "out" }
  },
  interactivity: { events: { onhover: { enable: false }, onclick: { enable: false } } }
});

// กลับหน้า Home เมื่อกดโลโก้
document.getElementById('logoBtn')?.addEventListener('click', () => {
  location.href = '../index.html';
});

// ส่งข้อมูลฟอร์ม (ตัวอย่าง)
document.getElementById('reportForm')?.addEventListener('submit', (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const category = document.getElementById('category').value;
  const details = document.getElementById('details').value;

  if (!email || !category || !details) {
    alert('กรุณากรอกข้อมูลให้ครบถ้วน');
    return;
  }

  // สามารถเชื่อม backend ได้ที่นี่ (Firebase, API ฯลฯ)
  alert('ส่งรายงานสำเร็จ! ทีมงานจะติดต่อกลับภายใน 2–3 วันทำการ');
  e.target.reset();
});
