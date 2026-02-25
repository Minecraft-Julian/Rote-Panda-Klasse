function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => {
    p.classList.add("hidden");
  });
  document.getElementById(pageId).classList.remove("hidden");
}

// Messenger
function sendMessage() {
  const input = document.getElementById("messageInput");
  const text = input.value.trim();
  if (!text) return;

  const div = document.createElement("div");
  div.classList.add("message");
  div.textContent = text;

  document.getElementById("messages").appendChild(div);
  input.value = "";
}

// Klassenliste
function addMember() {
  const input = document.getElementById("newMember");
  if (!input.value.trim()) return;

  const li = document.createElement("li");
  li.textContent = input.value;
  document.getElementById("classMembers").appendChild(li);
  input.value = "";
}

// Hausaufgaben
function addHomework() {
  const input = document.getElementById("homeworkInput");
  if (!input.value.trim()) return;

  const li = document.createElement("li");
  li.textContent = input.value;
  document.getElementById("homeworkList").appendChild(li);
  input.value = "";
}