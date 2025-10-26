  particlesJS('particles-js', {
  "particles": {
    "number": { "value": 100, "density": { "enable": true, "value_area": 800 } },
    "color": { "value": "#a3ec9c" },
    "shape": { "type": "circle" },
    "opacity": { "value": 0.8, "random": true },
    "size": { "value": 6  , "random": true },
    "line_linked": { "enable": false },
    "move": { "enable": true, "speed": 1, "direction": "bottom", "straight": false, "out_mode": "out" }
  },
  "interactivity": {
    "events": { "onhover": { "enable": false }, "onclick": { "enable": false } }
  }
});

// เมื่อกดปุ่ม Submit a ticket → ไปหน้า Ticket.html
document.getElementById('submitTicket')?.addEventListener('click', () => {
  window.location.href = '../Ticket/Ticket.html';
});
