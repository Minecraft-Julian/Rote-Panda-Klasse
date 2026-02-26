// Global variables
let currentUser = null;
let currentGroup = null;
let lastMessageTime = 0;
let messageCountToday = 0;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
  loadData();
  if (currentUser) {
    showSidebar();
    showPage('messenger');
  } else {
    hideSidebar();
    showPage('login');
  }
});

// Data management
function loadData() {
  // Load user data
  const userData = localStorage.getItem('userData');
  if (userData) {
    currentUser = JSON.parse(userData);
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

function showSidebar() {
  document.querySelector('.sidebar').style.display = 'flex';
}

function hideSidebar() {
  document.querySelector('.sidebar').style.display = 'none';
}

function logout() {
  AUTH.clearSession && AUTH.clearSession();
  currentUser = null;
  hideSidebar();
  showPage('login');
}

// Login
function googleLogin() {
  // Simulate Google login
  currentUser = { name: 'User via Google', email: 'user@gmail.com' };
  saveData('userData', currentUser);
  setAlert('login', 'Angemeldet mit Google! Weiterleitung…', 'success');
  setTimeout(() => {
    showSidebar();
    showPage('messenger');
  }, 1000);
}

function emailLogin(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!isValidEmail(email)) {
    setAlert('login', 'Bitte gib eine gültige E-Mail-Adresse ein.', 'error');
    return;
  }
  if (!password) {
    setAlert('login', 'Bitte gib dein Passwort ein.', 'error');
    return;
  }

  // Simulate login
  currentUser = { name: email.split('@')[0], email: email };
  saveData('userData', currentUser);
  setAlert('login', 'Login erfolgreich! Weiterleitung…', 'success');
  setTimeout(() => {
    showSidebar();
    showPage('messenger');
  }, 600);
}

// Helper functions
function setAlert(screenId, msg, type) {
  const el = document.getElementById(screenId + '-alert');
  if (!el) return;
  el.textContent = msg;
  el.className = `alert alert-${type} show`;
}

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// Auth helpers (AUTH + OTP) and UI wiring
const AUTH = {
  users() { return JSON.parse(localStorage.getItem('rp_users') || '[]'); },
  saveUsers(u) { localStorage.setItem('rp_users', JSON.stringify(u)); },
  session() { return JSON.parse(localStorage.getItem('userData') || 'null'); },
  setSession(s) { localStorage.setItem('userData', JSON.stringify(s)); currentUser = s; },
  clearSession() { localStorage.removeItem('userData'); currentUser = null; },
  makeSalt() { const arr = new Uint8Array(8); crypto.getRandomValues(arr); return Array.from(arr, b=>b.toString(16).padStart(2,'0')).join(''); },
  hashPw(pw, salt) { let h=5381; const input = salt + pw + salt; for(let i=0;i<input.length;i++) h = ((h<<5)+h) ^ input.charCodeAt(i); return salt + '$' + (h>>>0).toString(36); },
  register(name, email, pw) {
    const users = AUTH.users(); const norm = email.toLowerCase().trim();
    if (!name) return { error: 'Bitte Namen angeben.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm)) return { error: 'Ungültige E-Mail.' };
    if (pw.length < 8) return { error: 'Passwort mindestens 8 Zeichen.' };
    if (users.find(u=>u.email===norm)) return { error: 'E-Mail bereits registriert.' };
    const salt = AUTH.makeSalt(); const pwHash = AUTH.hashPw(pw, salt);
    users.push({ id: crypto.randomUUID(), name: name.trim(), email: norm, pwHash, emailVerified: false });
    AUTH.saveUsers(users); return { success: true };
  },
  login(email, pw) {
    const norm = email.toLowerCase().trim(); const users = AUTH.users(); const u = users.find(x=>x.email===norm);
    if (!u) return { error: 'E-Mail oder Passwort falsch.' };
    const salt = u.pwHash.split('$')[0]; if (AUTH.hashPw(pw, salt) !== u.pwHash) return { error: 'E-Mail oder Passwort falsch.' };
    AUTH.setSession({ name: u.name, email: u.email }); return { success: true };
  },
  markVerified(email) { const users = AUTH.users(); const u = users.find(x=>x.email===email.toLowerCase().trim()); if (u) { u.emailVerified = true; AUTH.saveUsers(users); } }
};

const OTP = {
  generate() { return String(Math.floor(10000 + Math.random()*90000)); },
  store(email, code, type) {
    const all = JSON.parse(localStorage.getItem('rp_otps') || '{}'); all[email.toLowerCase().trim()] = { code, type, exp: Date.now() + 10*60*1000 }; localStorage.setItem('rp_otps', JSON.stringify(all));
  },
  verify(email, code) {
    const all = JSON.parse(localStorage.getItem('rp_otps') || '{}'); const entry = all[email.toLowerCase().trim()];
    if (!entry) return { error: 'Kein Code gefunden.' };
    if (Date.now() > entry.exp) return { error: 'Code abgelaufen.' };
    if (entry.code !== code) return { error: 'Falscher Code.' };
    delete all[email.toLowerCase().trim()]; localStorage.setItem('rp_otps', JSON.stringify(all)); return { success: true, type: entry.type };
  }
};

// Auth screen management inside the login page
let currentAuthScreen = 'login';
let pendingEmail = '';

function showScreen(name, dir) {
  const prev = document.getElementById('screen-' + currentAuthScreen);
  const next = document.getElementById('screen-' + name);
  if (!next || name === currentAuthScreen) return;
  if (prev) prev.classList.remove('active');
  next.classList.add('active');
  currentAuthScreen = name;
  const al = next.querySelector('.alert'); if (al) { al.textContent=''; al.className='alert'; }
}

// Wire UI events once DOM ready
document.addEventListener('DOMContentLoaded', function() {
  // Password eye toggles
  document.querySelectorAll('.pw-eye').forEach(eye => {
    eye.addEventListener('click', () => {
      const inp = document.getElementById(eye.dataset.target);
      if (!inp) return; const show = inp.type === 'password'; inp.type = show ? 'text' : 'password'; eye.textContent = show ? '🙈' : '👁';
    });
  });

  // Delegate auth-link clicks
  document.addEventListener('click', e => {
    const link = e.target.closest('.auth-link[data-goto]'); if (!link) return;
    e.preventDefault(); showScreen(link.dataset.goto, link.dataset.dir || 'forward');
  });

  // Login form
  const lf = document.getElementById('login-form'); if (lf) lf.addEventListener('submit', e => {
    e.preventDefault(); const email = document.getElementById('login-email').value.trim(); const pw = document.getElementById('login-password').value;
    if (!isValidEmail(email)) return setAlert('login','Bitte gib eine gültige E-Mail-Adresse ein.','error'); if (!pw) return setAlert('login','Bitte gib dein Passwort ein.','error');
    const res = AUTH.login(email,pw); if (!res.success) return setAlert('login', res.error, 'error'); setAlert('login','Login erfolgreich!','success'); AUTH.setSession({ name: email.split('@')[0], email }); setTimeout(()=>{ showSidebar(); showPage('messenger'); }, 400);
  });

  // Signup
  const sf = document.getElementById('signup-form'); if (sf) sf.addEventListener('submit', e => {
    e.preventDefault(); const name = document.getElementById('signup-name').value.trim(); const email = document.getElementById('signup-email').value.trim(); const pw = document.getElementById('signup-password').value; const confirm = document.getElementById('signup-confirm').value;
    if (!name) return setAlert('signup','Bitte Namen eingeben.','error'); if (!isValidEmail(email)) return setAlert('signup','Ungültige E-Mail.','error'); if (pw.length<8) return setAlert('signup','Passwort min. 8 Zeichen.','error'); if (pw!==confirm) return setAlert('signup','Passwörter stimmen nicht überein.','error');
    const res = AUTH.register(name,email,pw); if (!res.success) return setAlert('signup', res.error, 'error'); pendingEmail = email; OTP.store(email, OTP.generate(), 'verify'); console.log('[OTP] Code for', email, JSON.parse(localStorage.getItem('rp_otps'))[email]); setAlert('signup','Registrierung erfolgreich! Prüfe den Code.','success'); setTimeout(()=>showScreen('otp'),800);
  });

  // OTP verify
  const otpBtn = document.getElementById('otp-verify-btn'); if (otpBtn) otpBtn.addEventListener('click', () => {
    const code = document.getElementById('otp-code').value.trim(); if (!code) return setAlert('otp','Bitte Code eingeben.','error'); const res = OTP.verify(pendingEmail, code); if (!res.success) return setAlert('otp', res.error, 'error'); if (res.type==='verify') { AUTH.markVerified(pendingEmail); setAlert('otp','E-Mail verifiziert! Du kannst dich einloggen.','success'); setTimeout(()=>showScreen('login'),800); } else { setAlert('otp','Code akzeptiert.','success'); }
  });

  // Resend OTP
  const resend = document.getElementById('otp-resend'); if (resend) resend.addEventListener('click', (e)=>{ e.preventDefault(); if(!pendingEmail) return; const code=OTP.generate(); OTP.store(pendingEmail, code, 'verify'); console.log('[OTP] resent code for', pendingEmail, code); setAlert('otp','Neuer Code gesendet (Konsole).','success'); });

  // Forgot form
  const ff = document.getElementById('forgot-form'); if (ff) ff.addEventListener('submit', e=>{ e.preventDefault(); const email = document.getElementById('forgot-email').value.trim(); if (!isValidEmail(email)) return setAlert('forgot','Bitte gib eine gültige E-Mail-Adresse ein.','error'); pendingEmail = email; const code = OTP.generate(); OTP.store(email, code, 'reset'); console.log('[OTP] reset code for', email, code); setAlert('forgot','Reset-Code gesendet (Konsole).','success'); setTimeout(()=>showScreen('otp'),600); });

  // Reset form
  const rf = document.getElementById('reset-form'); if (rf) rf.addEventListener('submit', e=>{ e.preventDefault(); const pw = document.getElementById('reset-password').value; const confirm = document.getElementById('reset-confirm').value; if (pw.length<8) return setAlert('reset','Passwort min. 8 Zeichen.','error'); if (pw!==confirm) return setAlert('reset','Passwörter stimmen nicht überein.','error'); const users = AUTH.users(); const u = users.find(x=>x.email===pendingEmail.toLowerCase().trim()); if (!u) return setAlert('reset','E-Mail nicht gefunden.','error'); const salt = AUTH.makeSalt(); u.pwHash = AUTH.hashPw(pw,salt); AUTH.saveUsers(users); setAlert('reset','Passwort geändert!','success'); setTimeout(()=>showScreen('login'),800); });

  // Attach existing simple login form listener (backwards compatibility)
  const lf2 = document.getElementById('login-form'); if (lf2) lf2.addEventListener('submit', emailLogin);
});

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