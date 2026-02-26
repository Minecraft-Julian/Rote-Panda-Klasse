// Global variables
let currentUser = null;
let currentGroup = null;
let lastMessageTime = 0;
let messageCountToday = 0;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
  loadData();
  showPage('login');
});

// Data management
function loadData() {
  // Load user data
  const userData = localStorage.getItem('userData');
  if (userData) {
    currentUser = JSON.parse(userData);
    showPage('messenger');
  }

  // Load class members
  const members = JSON.parse(localStorage.getItem('classMembers') || '[]');
  renderClassMembers(members);

  // Load homework
  const homework = JSON.parse(localStorage.getItem('homework') || '[]');
  renderHomework(homework);

  // Load groups
  const groups = JSON.parse(localStorage.getItem('groups') || '[]');
  renderGroups(groups);
}

function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Navigation
function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => {
    p.classList.add("hidden");
  });
  document.getElementById(pageId).classList.remove("hidden");
}

// Login
function googleLogin() {
  // Simulate Google login
  currentUser = { name: 'User via Google', email: 'user@gmail.com' };
  saveData('userData', currentUser);
  document.getElementById('loginStatus').textContent = 'Angemeldet mit Google!';
  setTimeout(() => showPage('messenger'), 1000);
}

function emailLogin(event) {
  event.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  // Simulate login
  currentUser = { name: email.split('@')[0], email: email };
  saveData('userData', currentUser);
  document.getElementById('loginStatus').textContent = 'Angemeldet!';
  setTimeout(() => showPage('messenger'), 1000);
}

// Messenger
function createGroup() {
  const groupName = prompt('Gruppenname:');
  if (!groupName) return;

  const groups = JSON.parse(localStorage.getItem('groups') || '[]');
  const newGroup = { id: Date.now(), name: groupName, createdBy: currentUser.email, members: [currentUser.email], messages: [] };
  groups.push(newGroup);
  saveData('groups', groups);
  renderGroups(groups);
}

function renderGroups(groups) {
  const container = document.getElementById('groupsList');
  container.innerHTML = '<h3>Gruppen:</h3>';
  groups.forEach(group => {
    const btn = document.createElement('button');
    btn.textContent = group.name;
    btn.onclick = () => selectGroup(group.id);
    container.appendChild(btn);
  });
}

function selectGroup(groupId) {
  const groups = JSON.parse(localStorage.getItem('groups') || '[]');
  currentGroup = groups.find(g => g.id === groupId);
  document.getElementById('chatArea').classList.remove('hidden');
  renderMessages(currentGroup.messages);
}

function sendMessage() {
  if (!currentGroup) return;

  const now = Date.now();
  // Spam protection: 1 message per 10 seconds, 30 per day
  if (now - lastMessageTime < 10000) {
    alert('Zu schnell! Warte 10 Sekunden.');
    return;
  }
  if (messageCountToday >= 30) {
    alert('Maximale Nachrichten pro Tag erreicht.');
    return;
  }

  const input = document.getElementById('messageInput');
  const text = input.value.trim();
  if (!text) return;

  // Bad word filter (simple)
  const badWords = ['schimpfwort1', 'schimpfwort2'];
  if (badWords.some(word => text.toLowerCase().includes(word))) {
    alert('Nachricht enthält unangemessene Wörter.');
    return;
  }

  const message = { id: Date.now(), text: text, sender: currentUser.name, timestamp: now };
  currentGroup.messages.push(message);
  const groups = JSON.parse(localStorage.getItem('groups') || '[]');
  const index = groups.findIndex(g => g.id === currentGroup.id);
  groups[index] = currentGroup;
  saveData('groups', groups);

  renderMessages(currentGroup.messages);
  input.value = '';
  lastMessageTime = now;
  messageCountToday++;
}

// Render messages
function renderMessages(messages) {
  const container = document.getElementById('messages');
  container.innerHTML = '';
  messages.forEach(msg => {
    const div = document.createElement('div');
    div.classList.add('message');
    div.textContent = `${msg.sender}: ${msg.text}`;
    container.appendChild(div);
  });
}

// Class list
function addMember() {
  const name = document.getElementById('newMember').value.trim();
  const email = document.getElementById('memberEmail').value.trim();
  const phone = document.getElementById('memberPhone').value.trim();
  const isSick = document.getElementById('isSick').checked;

  if (!name) return;

  const members = JSON.parse(localStorage.getItem('classMembers') || '[]');
  const member = { id: Date.now(), name: name, email: email, phone: phone, isSick: isSick };
  members.push(member);
  saveData('classMembers', members);
  renderClassMembers(members);

  // Clear inputs
  document.getElementById('newMember').value = '';
  document.getElementById('memberEmail').value = '';
  document.getElementById('memberPhone').value = '';
  document.getElementById('isSick').checked = false;
}

function renderClassMembers(members) {
  const ul = document.getElementById('classMembers');
  ul.innerHTML = '';
  members.forEach(member => {
    const li = document.createElement('li');
    li.textContent = `${member.name}${member.email ? ' - ' + member.email : ''}${member.phone ? ' - ' + member.phone : ''}${member.isSick ? ' (Krank)' : ''}`;
    ul.appendChild(li);
  });
}

// Homework
function addHomework() {
  const subject = document.getElementById('homeworkSubject').value.trim();
  const desc = document.getElementById('homeworkDesc').value.trim();
  const due = document.getElementById('homeworkDue').value;

  if (!subject || !desc) return;

  const homework = JSON.parse(localStorage.getItem('homework') || '[]');
  const hw = { id: Date.now(), subject: subject, desc: desc, due: due, addedBy: currentUser.email };
  homework.push(hw);
  saveData('homework', homework);
  renderHomework(homework);

  // Clear inputs
  document.getElementById('homeworkSubject').value = '';
  document.getElementById('homeworkDesc').value = '';
  document.getElementById('homeworkDue').value = '';
}

function renderHomework(homework) {
  const ul = document.getElementById('homeworkList');
  ul.innerHTML = '';
  homework.forEach(hw => {
    const li = document.createElement('li');
    li.textContent = `${hw.subject}: ${hw.desc} - Fällig: ${hw.due}`;
    ul.appendChild(li);
  });
}