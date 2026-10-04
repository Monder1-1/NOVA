/* NOVA App Core Engine - Fully Offline Functional Engine */

// Storage State & IndexedDB Setup
let db;
const DB_NAME = 'NOVA_DB';
const DB_VERSION = 1;

let appState = {
  user: { name: 'المستخدم', city: 'Zawiya' },
  streak: 1,
  tasks: [],
  prayers: [
    { name: 'الفجر', time: '05:20', done: false },
    { name: 'الظهر', time: '12:40', done: false },
    { name: 'العصر', time: '16:10', done: false },
    { name: 'المغرب', time: '18:45', done: false },
    { name: 'العشاء', time: '20:00', done: false }
  ],
  quranPage: 1,
  notes: []
};

// Initial setup
document.addEventListener('DOMContentLoaded', async () => {
  await initDB();
  loadLocalState();
  setupUI();
  registerSW();
});

// Register Service Worker
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js')
      .catch(err => console.log('SW registration skipped offline mode:', err));
  }
}

// IndexedDB Initialization
function initDB() {
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      db = e.target.result;
      if (!db.objectStoreNames.contains('dataStore')) {
        db.createObjectStore('dataStore', { keyPath: 'id' });
      }
    };
    request.onsuccess = (e) => {
      db = e.target.result;
      resolve();
    };
    request.onerror = () => resolve(); // fallback
  });
}

function saveState() {
  localStorage.setItem('NOVA_STATE', JSON.stringify(appState));
  if (db) {
    const tx = db.transaction('dataStore', 'readwrite');
    tx.objectStore('dataStore').put({ id: 'rootState', state: appState });
  }
}

function loadLocalState() {
  const saved = localStorage.getItem('NOVA_STATE');
  if (saved) {
    appState = Object.assign(appState, JSON.parse(saved));
  } else {
    // Default Tasks
    appState.tasks = [
      { id: 1, title: 'أداء صلاة الفجر في وقتها', category: 'عبادة', done: false },
      { id: 2, title: 'قراءة أذكار الصباح والمساء', category: 'عبادة', done: false },
      { id: 3, title: 'إنجاز التمارين الرياضية اليومية', category: 'رياضة', done: false }
    ];
  }
}

// UI Setup & Handlers
function setupUI() {
  updateDashboardInfo();
  renderTasks();
  renderPrayers();
  renderNotes();
}

function updateDashboardInfo() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('currentDateText').innerText = now.toLocaleDateString('ar-LY', options);
  document.getElementById('greetingText').innerText = `مرحباً بك، ${appState.user.name}`;
  document.getElementById('streakCount').innerText = appState.streak;

  const total = appState.tasks.length;
  const completed = appState.tasks.filter(t => t.done).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  document.getElementById('homeProgressPercent').innerText = `${percent}%`;
  document.getElementById('homeProgressBar').style.width = `${percent}%`;
  document.getElementById('completedTasksCount').innerText = `${completed} / ${total}`;

  const nextTask = appState.tasks.find(t => !t.done);
  document.getElementById('nextTaskTitle').innerText = nextTask ? nextTask.title : 'أتممت كافة المهام!';
}

// Navigation SPA Router
function navTo(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const targetView = document.getElementById(`view-${viewId}`);
  if (targetView) targetView.classList.add('active-view');

  const navItem = document.getElementById(`nav-${viewId}`);
  if (navItem) navItem.classList.add('active');
}

// Tasks Controller
function renderTasks() {
  const container = document.getElementById('tasksList');
  if (!container) return;
  container.innerHTML = '';

  appState.tasks.forEach(task => {
    const el = document.createElement('div');
    el.className = `task-item ${task.done ? 'completed' : ''}`;
    el.innerHTML = `
      <div class="task-info">
        <h5>${task.title}</h5>
        <span>${task.category}</span>
      </div>
      <button class="btn-primary-sm" onclick="promptTaskConfirmation(${task.id})">
        ${task.done ? 'مكتمل ✓' : 'إكمال'}
      </button>
    `;
    container.appendChild(el);
  });
}

let pendingTaskId = null;
function promptTaskConfirmation(id) {
  pendingTaskId = id;
  const task = appState.tasks.find(t => t.id === id);
  if (!task) return;

  document.getElementById('modalTitle').innerText = 'تأكيد المهمة';
  document.getElementById('modalBody').innerText = `هل تؤكد إكمال المهمة التالية؟\n"${task.title}"`;
  
  const confirmBtn = document.getElementById('modalConfirmBtn');
  confirmBtn.onclick = () => {
    task.done = !task.done;
    saveState();
    setupUI();
    closeModal();
  };

  document.getElementById('confirmModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('confirmModal').classList.add('hidden');
}

// Prayers Controller
function renderPrayers() {
  const grid = document.getElementById('prayerTimesGrid');
  if (!grid) return;
  grid.innerHTML = '';

  appState.prayers.forEach((prayer, idx) => {
    const box = document.createElement('div');
    box.className = `prayer-box ${prayer.done ? 'done' : ''}`;
    box.innerHTML = `
      <strong>${prayer.name}</strong>
      <div style="font-size:0.8rem; margin:4px 0">${prayer.time}</div>
      <button class="btn-primary-sm" style="font-size:0.7rem; padding:4px 8px;" onclick="togglePrayer(${idx})">
        ${prayer.done ? 'أُدّيت ✓' : 'تأكيد'}
      </button>
    `;
    grid.appendChild(box);
  });
}

function togglePrayer(index) {
  appState.prayers[index].done = !appState.prayers[index].done;
  saveState();
  renderPrayers();
}

// Notes Controller
function renderNotes() {
  const container = document.getElementById('notesContainer');
  if (!container) return;
  container.innerHTML = '';

  appState.notes.forEach((note, index) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <textarea onchange="updateNote(${index}, this.value)" rows="3" style="border:none; background:transparent;">${note}</textarea>
      <button class="btn-danger-block" style="padding:4px; font-size:0.75rem; margin-top:6px;" onclick="deleteNote(${index})">حذف</button>
    `;
    container.appendChild(card);
  });
}

function addNewNote() {
  appState.notes.push('ملاحظة جديدة...');
  saveState();
  renderNotes();
}

function updateNote(index, val) {
  appState.notes[index] = val;
  saveState();
}

function deleteNote(index) {
  appState.notes.splice(index, 1);
  saveState();
  renderNotes();
}

// Settings
function saveSettings() {
  const name = document.getElementById('settingUserName').value;
  const city = document.getElementById('settingCity').value;
  if (name) appState.user.name = name;
  if (city) appState.user.city = city;
  saveState();
  updateDashboardInfo();
  alert('تم حفظ الإعدادات بنجاح!');
}

function confirmResetAllData() {
  if (confirm('هل أنت متأكد تماماً من مسح كافة بيانات التطبيق وإعادتها للافتراضي؟')) {
    localStorage.removeItem('NOVA_STATE');
    location.reload();
  }
}
