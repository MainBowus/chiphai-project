const sendBtn = document.getElementById("sendBtn");
const messageInput = document.getElementById("messageInput");
const chatBody = document.getElementById("chatBody");

sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  const text = messageInput.value.trim();
  if (text === "") return;

  const msg = document.createElement("div");
  msg.classList.add("message", "sent");
  msg.textContent = text;
  chatBody.appendChild(msg);
  chatBody.scrollTop = chatBody.scrollHeight;
  messageInput.value = "";

  // simulate reply
  setTimeout(() => {
    const reply = document.createElement("div");
    reply.classList.add("message", "received");
    reply.textContent = "รับข้อความแล้ว 👍";
    chatBody.appendChild(reply);
    chatBody.scrollTop = chatBody.scrollHeight;
  }, 1000);
}