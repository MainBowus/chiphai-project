// Preview uploaded image
const imageUpload = document.getElementById("imageUpload");
const preview = document.getElementById("preview");

imageUpload.addEventListener("change", () => {
  const file = imageUpload.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = e => {
      preview.src = e.target.result;
      preview.style.display = "block";
    };
    reader.readAsDataURL(file);
  }
});

// Handle post button
document.getElementById("postBtn").addEventListener("click", () => {
  const location = document.getElementById("location").value;
  const dateFounded = document.getElementById("dateFounded").value;
  const timeFounded = document.getElementById("timeFounded").value;
  const description = document.getElementById("description").value;

  if (!location || !dateFounded || !timeFounded || !description) {
    alert("Please fill out all fields.");
    return;
  }

  alert("Post created successfully!\n\n" +
        `Location: ${location}\nDate: ${dateFounded}\nTime: ${timeFounded}\nDescription: ${description}`);
});
