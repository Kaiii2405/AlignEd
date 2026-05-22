/* ═══════════════════════════════════════════════════════════
   script.js — LSPU Schedule Manager
   Covers: auth, section picker, schedule data, rendering
═══════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────
   API BASE PATH
───────────────────────────────────────── */
const API = 'api';

/* ─────────────────────────────────────────
   SESSION / AUTH HELPERS
───────────────────────────────────────── */
function getSession()   { try { return JSON.parse(localStorage.getItem('lspu_session') || 'null'); } catch(e) { return null; } }
function saveSession(u) { if (u === null) localStorage.removeItem('lspu_session'); else localStorage.setItem('lspu_session', JSON.stringify(u)); }

function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent   = msg;
  el.style.display = msg ? 'block' : 'none';
}

async function doRegister() {
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const pass  = document.getElementById('reg-password').value;
  if (!name || !email || !pass) { showError('reg-error', 'Please fill in all fields.'); return; }
  if (pass.length < 6)          { showError('reg-error', 'Password must be at least 6 characters.'); return; }
  try {
    const res  = await fetch(`${API}/auth.php?action=register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, pass }),
    });
    const data = await res.json();
    if (!data.ok) { showError('reg-error', data.error); return; }
    showError('reg-error', '');
    saveSession(data.user);
    showSectionPicker(data.user.name);
  } catch(e) { showError('reg-error', 'Server error. Is the API running?'); }
}

async function doLogin() {
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const pass  = document.getElementById('login-password').value;
  if (!email || !pass) { showError('login-error', 'Please enter your email and password.'); return; }
  try {
    const res  = await fetch(`${API}/auth.php?action=login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pass }),
    });
    const data = await res.json();
    if (!data.ok) { showError('login-error', data.error); return; }
    showError('login-error', '');
    saveSession(data.user);
    if (data.user.section) { window.location.href = 'schedule.html'; }
    else                   { showSectionPicker(data.user.name); }
  } catch(e) { showError('login-error', 'Server error. Is the API running?'); }
}

function doLogout() {
  saveSession(null);
  window.location.href = 'index.html';
}

/* ─────────────────────────────────────────
   SECTION PICKER
───────────────────────────────────────── */

// All available sections per year
const SECTIONS_BY_YEAR = {
  2: ['2A', '2B', '2C', '2D'],
};

let _pickerSelectedSection = null;

function showSectionPicker(name) {
  // Hide the login card, show the picker overlay
  const lc  = document.getElementById('loginContainer');
  const ov  = document.getElementById('sectionPickerOverlay');
  if (lc) lc.style.opacity = '0';
  if (ov) {
    document.getElementById('sp-greeting').textContent =
      `Welcome, ${name}! Select the section you are currently enrolled in.`;
    ov.classList.add('open');
    renderSectionGrid(2);
  }
}

function setYear(yr) {
  document.querySelectorAll('.sp-year-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('yr-' + yr);
  if (btn) btn.classList.add('active');
  renderSectionGrid(yr);
}

function renderSectionGrid(yr) {
  const grid = document.getElementById('spSectionGrid');
  if (!grid) return;
  const secs = SECTIONS_BY_YEAR[yr] || [];
  _pickerSelectedSection = null;
  const confirmBtn = document.getElementById('sp-confirm-btn');

  grid.innerHTML = secs.map(sec => `
    <div class="sp-sec-card" id="sp-sec-${sec}" onclick="pickSection('${sec}')">
      <div class="sp-sec-label">BS INFO<br>${sec}</div>
      <div class="sp-sec-sublabel">2nd Year · 2nd Sem</div>
    </div>`).join('');

  // Insert confirm button after grid if not present
  if (!document.getElementById('sp-confirm-btn')) {
    const btn = document.createElement('button');
    btn.id = 'sp-confirm-btn';
    btn.className = 'sp-confirm-btn';
    btn.textContent = 'Confirm Section & Continue →';
    btn.onclick = confirmSection;
    grid.parentNode.insertBefore(btn, grid.nextSibling);
  }
}

function pickSection(sec) {
  _pickerSelectedSection = sec;
  document.querySelectorAll('.sp-sec-card').forEach(c => c.classList.remove('selected'));
  const card = document.getElementById('sp-sec-' + sec);
  if (card) card.classList.add('selected');
  const btn = document.getElementById('sp-confirm-btn');
  if (btn) btn.classList.add('visible');
}

async function confirmSection() {
  if (!_pickerSelectedSection) return;
  const s = getSession();
  if (!s) { window.location.href = 'index.html'; return; }
  try {
    const res  = await fetch(`${API}/auth.php?action=set_section`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: s.id, section: _pickerSelectedSection }),
    });
    const data = await res.json();
    if (!data.ok) { alert('Could not save section: ' + data.error); return; }
  } catch(e) { alert('Server error saving section.'); return; }
  saveSession({ ...s, section: _pickerSelectedSection });
  window.location.href = 'schedule.html';
}

/* ─────────────────────────────────────────
   SCHEDULE DATA
   Each section (2A / 2B / 2C / 2D) has
   its own EXISTING (fixed) schedule.
───────────────────────────────────────── */

const SCHEDULE_BY_SECTION = {
  '2A': [
    { code:'ITEP 205', instructor:'MR. UAL',      room:'LAB 2',  days:['Mon'], start:'8:00 AM',  end:'11:00 AM', type:'LAB' },
    { code:'ITEP 204', instructor:'MS. ESCOTE',   room:'LEC 9',  days:['Mon'], start:'12:00 PM', end:'1:00 PM',  type:'LEC' },
    { code:'GEC 108',  instructor:'MR. GARCIA',   room:'LEC 6',  days:['Mon'], start:'1:00 PM',  end:'2:30 PM',  type:'LEC' },
    { code:'ITEL 203', instructor:'MR. MANALOTO', room:'LEC 6',  days:['Mon'], start:'3:00 PM',  end:'4:00 PM',  type:'LEC' },
    { code:'ITEP 206', instructor:'MS. OMPANGCO', room:'LEC 10', days:['Mon'], start:'4:00 PM',  end:'5:00 PM',  type:'LEC' },

    { code:'ITEL 203', instructor:'MR. MANALOTO', room:'LAB 4',  days:['Tue'], start:'9:00 AM',  end:'12:00 PM', type:'LAB' },
    { code:'GEC 108',  instructor:'MR. GARCIA',   room:'LEC 6',  days:['Tue'], start:'1:00 PM',  end:'2:30 PM',  type:'LEC' },
    { code:'ITEP 205', instructor:'MR. UAL',      room:'LEC 1',  days:['Tue'], start:'4:00 PM',  end:'5:00 PM',  type:'LEC' },
    { code:'ITEP 204', instructor:'MS. ESCOTE',   room:'LEC 8',  days:['Tue'], start:'5:00 PM',  end:'6:00 PM',  type:'LEC' },

    { code:'ITEL 203', instructor:'MR. MANALOTO', room:'LEC 6',  days:['Wed'], start:'8:00 AM',  end:'9:00 AM',  type:'LEC' },
    { code:'ITEP 205', instructor:'MR. UAL',      room:'LEC 1',  days:['Wed'], start:'11:00 AM', end:'12:00 PM', type:'LEC' },
    { code:'ITEP 206', instructor:'MS. OMPANGCO', room:'LEC 6',  days:['Wed'], start:'12:00 PM', end:'1:00 PM',  type:'LEC' },
    { code:'GEC 108',  instructor:'MR. GARCIA',   room:'LEC 6',  days:['Wed'], start:'1:00 PM',  end:'2:30 PM',  type:'LEC' },
    { code:'ITEP 207', instructor:'MS. VIOJAN',   room:'LEC 5',  days:['Wed'], start:'3:00 PM',  end:'4:00 PM',  type:'LEC' },

    { code:'ITEP 204', instructor:'MS. ESCOTE',   room:'LAB 4',  days:['Thu'], start:'8:00 AM',  end:'11:00 AM', type:'LAB' },
    { code:'PE 4',     instructor:'MR. MORENO',   room:'GYM',    days:['Thu'], start:'12:00 PM', end:'2:00 PM',  type:'LEC' },
    { code:'ITEP 206', instructor:'MS. OMPANGCO', room:'LAB 2',  days:['Thu'], start:'4:00 PM',  end:'6:00 PM',  type:'LAB' },

    { code:'ITEP 207', instructor:'MS. VIOJAN',   room:'LAB 1',  days:['Fri'], start:'7:00 AM',  end:'10:00 AM', type:'LAB' }
  ],
  '2B': [
    { code:'GEC 108',  instructor:'MR. GARCIA',   room:'LEC 12', days:['Mon'], start:'9:00 AM',  end:'10:00 AM', type:'LEC' },
    { code:'ITEP 204', instructor:'MS. ESCOTE',   room:'LEC 9',  days:['Mon'], start:'11:00 AM', end:'12:00 PM', type:'LEC' },
    { code:'ITEP 205', instructor:'MR. UAL',      room:'LAB 2',  days:['Mon'], start:'12:00 PM', end:'3:00 PM',  type:'LAB' },
    { code:'ITEL 203', instructor:'MR. MANALOTO', room:'LEC 6',  days:['Mon'], start:'4:00 PM',  end:'5:00 PM',  type:'LEC' },
    { code:'ITEP 204', instructor:'MS. ESCOTE',   room:'LEC 8',  days:['Tue'], start:'9:00 AM',  end:'10:00 AM', type:'LEC' },
    { code:'GEC 108',  instructor:'MR. GARCIA',   room:'LEC 10', days:['Tue'], start:'10:00 AM', end:'11:00 AM', type:'LEC' },
    { code:'ITEP 207', instructor:'MS. VIOJAN',   room:'LEC 6',  days:['Tue'], start:'12:00 PM', end:'1:00 PM',  type:'LEC' },
    { code:'ITEL 203', instructor:'MR. MANALOTO', room:'LAB 4',  days:['Tue'], start:'1:00 PM',  end:'4:00 PM',  type:'LAB' },
    { code:'ITEP 205', instructor:'MR. UAL',      room:'LEC 1',  days:['Tue'], start:'5:00 PM',  end:'6:00 PM',  type:'LEC' },
    { code:'PE 4',     instructor:'MR. MORENO',   room:'GYM',    days:['Wed'], start:'7:00 AM',  end:'9:00 AM',  type:'LEC' },
    { code:'ITEL 203', instructor:'MR. MANALOTO', room:'LEC 6',  days:['Wed'], start:'9:00 AM',  end:'10:00 AM', type:'LEC' },
    { code:'ITEP 206', instructor:'MS. OMPANGCO', room:'LEC 6',  days:['Wed'], start:'11:00 AM', end:'12:00 PM', type:'LEC' },
    { code:'ITEP 205', instructor:'MR. UAL',      room:'LEC 1',  days:['Wed'], start:'12:00 PM', end:'1:00 PM',  type:'LEC' },
    { code:'GEC 108',  instructor:'MR. GARCIA',   room:'LEC 10', days:['Wed'], start:'2:00 PM',  end:'3:00 PM',  type:'LEC' },
    { code:'ITEP 207', instructor:'MS. VIOJAN',   room:'LEC 5',  days:['Wed'], start:'4:00 PM',  end:'5:00 PM',  type:'LEC' },
    { code:'ITEP 204', instructor:'MS. ESCOTE',   room:'LAB 4',  days:['Thu'], start:'12:00 PM', end:'3:00 PM',  type:'LAB' },
    { code:'ITEP 206', instructor:'MS. OMPANGCO', room:'LEC 6',  days:['Fri'], start:'9:00 AM',  end:'10:00 AM', type:'LEC' },
    { code:'ITEP 207', instructor:'MS. VIOJAN',   room:'LAB 1',  days:['Fri'], start:'11:00 AM', end:'2:00 PM',  type:'LAB' },
    { code:'ITEP 206', instructor:'MS. OMPANGCO', room:'LAB 3',  days:['Fri'], start:'3:00 PM',  end:'6:00 PM',  type:'LAB' },
  ],
  '2C': [
    { code:'PE 4',     instructor:'MR. MORENO',   room:'GYM',    days:['Mon'], start:'9:00 AM',  end:'11:00 AM', type:'LEC' },
    { code:'GEC 108',  instructor:'MR. GARCIA',   room:'LEC 12', days:['Mon'], start:'11:00 AM', end:'12:00 PM', type:'LEC' },
    { code:'ITEP 206', instructor:'MS. OMPANGCO', room:'LEC 12', days:['Mon'], start:'1:00 PM',  end:'2:00 PM',  type:'LEC' },
    { code:'ITEP 204', instructor:'MS. ESCOTE',   room:'LAB 4',  days:['Mon'], start:'3:00 PM',  end:'6:00 PM',  type:'LAB' },

    { code:'ITEL 203', instructor:'MR. DUNGO',    room:'LEC 5',  days:['Tue'], start:'8:00 AM',  end:'9:00 AM',  type:'LEC' },
    { code:'GEC 108',  instructor:'MR. GARCIA',   room:'LEC 3',  days:['Tue'], start:'9:00 AM',  end:'10:00 AM', type:'LEC' },
    { code:'ITEP 204', instructor:'MS. ESCOTE',   room:'LEC 8',  days:['Tue'], start:'10:00 AM', end:'11:00 AM', type:'LEC' },
    { code:'ITEP 204', instructor:'MS. ESCOTE',   room:'LEC 8',  days:['Tue'], start:'1:00 PM',  end:'2:00 PM',  type:'LEC' },
    { code:'ITEP 205', instructor:'MR. LARA',     room:'LEC 5',  days:['Tue'], start:'2:00 PM',  end:'3:00 PM',  type:'LEC' },
    { code:'ITEP 207', instructor:'MS. VIOJAN',   room:'LEC 6',  days:['Tue'], start:'3:00 PM',  end:'5:00 PM',  type:'LEC' },

    { code:'ITEL 203', instructor:'MR. DUNGO',    room:'LAB 3',  days:['Wed'], start:'7:00 AM',  end:'10:00 AM', type:'LAB' },
    { code:'ITEP 205', instructor:'MR. LARA',     room:'LEC 9',  days:['Wed'], start:'11:00 AM', end:'12:00 PM', type:'LEC' },
    { code:'GEC 108',  instructor:'MR. GARCIA',   room:'LEC 4',  days:['Wed'], start:'12:00 PM', end:'1:00 PM',  type:'LEC' },
    { code:'ITEP 206', instructor:'MS. OMPANGCO', room:'LAB 1',  days:['Wed'], start:'3:00 PM',  end:'6:00 PM',  type:'LAB' },

    { code:'ITEP 205', instructor:'MR. LARA',     room:'LAB 2',  days:['Fri'], start:'7:00 AM',  end:'10:00 AM', type:'LAB' },
    { code:'ITEL 203', instructor:'MR. DUNGO',    room:'LEC 1',  days:['Fri'], start:'11:00 AM', end:'12:00 PM', type:'LEC' },
    { code:'ITEP 206', instructor:'MS. OMPANGCO', room:'LEC 6',  days:['Fri'], start:'12:00 PM', end:'1:00 PM',  type:'LEC' },
    { code:'ITEP 207', instructor:'MS. VIOJAN',   room:'LAB 1',  days:['Fri'], start:'3:00 PM',  end:'6:00 PM',  type:'LAB' }
  ],

  '2D': [
    { code:'ITEP 206', instructor:'MS. OMPANGCO', room:'LAB 3',  days:['Mon'], start:'7:00 AM',  end:'10:00 AM', type:'LAB' },
    { code:'GEC 108',  instructor:'MR. GARCIA',   room:'LEC 3',  days:['Mon'], start:'10:00 AM', end:'11:00 AM', type:'LEC' },
    { code:'ITEP 206', instructor:'MS. OMPANGCO', room:'LEC 12', days:['Mon'], start:'12:00 PM', end:'1:00 PM',  type:'LEC' },
    { code:'ITEP 204', instructor:'MS. ESCOTE',   room:'LEC 9',  days:['Mon'], start:'1:00 PM',  end:'2:00 PM',  type:'LEC' },
    { code:'GEC 108',  instructor:'MR. GARCIA',   room:'LEC 1',  days:['Mon'], start:'3:00 PM',  end:'4:00 PM',  type:'LEC' },
    { code:'ITEP 207', instructor:'MS. VIOJAN',   room:'LEC 6',  days:['Mon'], start:'5:00 PM',  end:'6:00 PM',  type:'LEC' },

    { code:'PE 4',     instructor:'MR. MORENO',   room:'GYM',    days:['Tue'], start:'9:00 AM',  end:'11:00 AM', type:'LEC' },
    { code:'ITEP 204', instructor:'MS. ESCOTE',   room:'LEC 8',  days:['Tue'], start:'12:00 PM', end:'1:00 PM',  type:'LEC' },
    { code:'ITEP 205', instructor:'MR. LARA',     room:'LEC 5',  days:['Tue'], start:'1:00 PM',  end:'2:00 PM',  type:'LEC' },
    { code:'ITEL 203', instructor:'MR. DUNGO',    room:'LEC 1',  days:['Tue'], start:'2:00 PM',  end:'4:00 PM',  type:'LEC' },
    { code:'ITEP 207', instructor:'MS. VIOJAN',   room:'LEC 6',  days:['Tue'], start:'5:00 PM',  end:'6:00 PM',  type:'LEC' },

    { code:'GEC 108',  instructor:'MR. GARCIA',   room:'LEC 1',  days:['Wed'], start:'7:00 AM',  end:'8:00 AM',  type:'LEC' },
    { code:'ITEP 205', instructor:'MR. LARA',     room:'LEC 9',  days:['Wed'], start:'9:00 AM',  end:'10:00 AM', type:'LEC' },
    { code:'ITEP 207', instructor:'MS. VIOJAN',   room:'LAB 1',  days:['Wed'], start:'11:00 AM', end:'2:00 PM',  type:'LAB' },
    { code:'ITEL 203', instructor:'MR. DUNGO',    room:'LAB 3',  days:['Wed'], start:'3:00 PM',  end:'6:00 PM',  type:'LAB' },

    { code:'ITEP 204', instructor:'MS. ESCOTE',   room:'LAB 4',  days:['Fri'], start:'7:00 AM',  end:'10:00 AM', type:'LAB' },
    { code:'ITEP 205', instructor:'MR. LARA',     room:'LAB 2',  days:['Fri'], start:'11:00 AM', end:'2:00 PM',  type:'LAB' },
    { code:'ITEP 206', instructor:'MS. OMPANGCO', room:'LEC 12', days:['Fri'], start:'2:00 PM',  end:'3:00 PM',  type:'LEC' }
  ]
};

const BROWSE_SUBJECTS = [
  { code:'GEC 106',   title:'Art Appreciation',                   units:3, type:'LEC' },
  { code:'GEC 105',   title:'Purposive Communication',            units:3, type:'LEC' },
  { code:'FILDIS',    title:'Filipino sa Ibat Ibang Disiplina',   units:3, type:'LEC' },
  { code:'NSTP 2',    title:'CWTS / ROTC 2',                      units:3, type:'LEC' },
  { code:'ITEC 103',  title:'Intermediate Programming',           units:3, type:'LAB' },
  { code:'ITEP 101',  title:'Human Computer Interaction',         units:3, type:'LAB' },
  { code:'ITEP 102',  title:'Discrete Mathematics',               units:3, type:'LAB' },
  { code:'PI 100',    title:'Life, Works and Writings of Rizal',  units:3, type:'LEC' },
  { code:'PATHFit 2', title:'Exercise-based Fitness Activities',  units:2, type:'GYM' },
];

const SECTION_SCHEDULES = {

  'GEC 106': {
    '1A':[{code:'GEC 106',title:'Art Appreciation',instructor:'MR. BUÑA',room:'LEC 10',days:['Thu'],start:'12:00 PM',end:'1:30 PM',type:'LEC',units:3}],
    '1B':[
      {code:'GEC 106',title:'Art Appreciation',instructor:'MR. BUÑA',room:'LEC 12',days:['Tue'],start:'4:00 PM',end:'5:00 PM',type:'LEC',units:3},
      {code:'GEC 106',title:'Art Appreciation',instructor:'MR. BUÑA',room:'LEC 7', days:['Thu'],start:'3:00 PM',end:'5:00 PM',type:'LEC',units:3},
    ],
    '1C':[
      {code:'GEC 106',title:'Art Appreciation',instructor:'MR. BUÑA',room:'LEC 2', days:['Wed'],start:'10:00 AM',end:'12:00 PM',type:'LEC',units:3},
      {code:'GEC 106',title:'Art Appreciation',instructor:'MR. BUÑA',room:'LEC 12',days:['Thu'],start:'7:00 AM', end:'8:00 AM', type:'LEC',units:3},
    ],
    '1D':[
      {code:'GEC 106',title:'Art Appreciation',instructor:'MR. BUÑA',room:'LEC 8', days:['Tue'],start:'7:00 AM', end:'8:00 AM', type:'LEC',units:3},
      {code:'GEC 106',title:'Art Appreciation',instructor:'MR. BUÑA',room:'LEC 8', days:['Wed'],start:'7:00 AM', end:'8:00 AM', type:'LEC',units:3},
      {code:'GEC 106',title:'Art Appreciation',instructor:'MR. BUÑA',room:'LEC 10',days:['Thu'],start:'11:00 AM',end:'12:00 PM',type:'LEC',units:3},
    ],
  },

  'GEC 105': {
    '1A':[{code:'GEC 105',title:'Purposive Communication',instructor:'MS. SUAREZ',room:'LEC 12',days:['Mon'],start:'10:00 AM',end:'11:00 AM',type:'LEC',units:3}],
    '1B':[
      {code:'GEC 105',title:'Purposive Communication',instructor:'MS. SUAREZ',room:'LEC 6',days:['Mon'],start:'9:00 AM', end:'10:00 AM',type:'LEC',units:3},
      {code:'GEC 105',title:'Purposive Communication',instructor:'MS. SUAREZ',room:'LEC 7',days:['Thu'],start:'10:00 AM',end:'12:00 PM',type:'LEC',units:3},
    ],
    '1C':[
      {code:'GEC 105',title:'Purposive Communication',instructor:'MS. SUAREZ',room:'LEC 12',days:['Mon'],start:'4:00 PM',end:'5:00 PM',type:'LEC',units:3},
      {code:'GEC 105',title:'Purposive Communication',instructor:'MS. SUAREZ',room:'LEC 7', days:['Thu'],start:'1:00 PM',end:'3:00 PM',type:'LEC',units:3},
    ],
    '1D':[
      {code:'GEC 105',title:'Purposive Communication',instructor:'MS. SUAREZ',room:'LEC 12',days:['Mon'],start:'3:00 PM',end:'4:00 PM', type:'LEC',units:3},
      {code:'GEC 105',title:'Purposive Communication',instructor:'MS. SUAREZ',room:'TBA',   days:['Wed'],start:'8:00 AM',end:'10:00 AM',type:'LEC',units:3},
    ],
  },

  'FILDIS': {
    '1A':[{code:'FILDIS',title:'Filipino sa Ibat Ibang Disiplina',instructor:'TBA',room:'LEC 9',days:['Wed'],start:'1:00 PM',end:'2:30 PM',type:'LEC',units:3}],
    '1B':[
      {code:'FILDIS',title:'Filipino sa Ibat Ibang Disiplina',instructor:'TBA',room:'LEC 11',days:['Mon'],start:'3:00 PM',end:'5:00 PM',type:'LEC',units:3},
      {code:'FILDIS',title:'Filipino sa Ibat Ibang Disiplina',instructor:'TBA',room:'LEC 11',days:['Wed'],start:'4:00 PM',end:'5:00 PM',type:'LEC',units:3},
    ],
    '1C':[
      {code:'FILDIS',title:'Filipino sa Ibat Ibang Disiplina',instructor:'TBA',room:'LEC 10',days:['Wed'],start:'12:00 PM',end:'1:00 PM', type:'LEC',units:3},
      {code:'FILDIS',title:'Filipino sa Ibat Ibang Disiplina',instructor:'TBA',room:'LEC 11',days:['Thu'],start:'9:00 AM', end:'11:00 AM',type:'LEC',units:3},
    ],
    '1D':[
      {code:'FILDIS',title:'Filipino sa Ibat Ibang Disiplina',instructor:'TBA',room:'LEC 11',days:['Thu'],start:'7:00 AM', end:'9:00 AM', type:'LEC',units:3},
      {code:'FILDIS',title:'Filipino sa Ibat Ibang Disiplina',instructor:'TBA',room:'LEC 10',days:['Wed'],start:'10:00 AM',end:'11:00 AM',type:'LEC',units:3},
    ],
  },

  'NSTP 2': {
    '1A':[{code:'NSTP 2',title:'CWTS / ROTC 2',instructor:'TBA',room:'TBA',days:['Sat'],start:'7:00 AM',end:'10:00 AM',type:'LEC',units:3}],
    '1B':[{code:'NSTP 2',title:'CWTS / ROTC 2',instructor:'TBA',room:'TBA',days:['Sat'],start:'10:00 AM',end:'1:00 PM',type:'LEC',units:3}],
    '1C':[{code:'NSTP 2',title:'CWTS / ROTC 2',instructor:'TBA',room:'TBA',days:['Sun'],start:'7:00 AM',end:'10:00 AM',type:'LEC',units:3}],
    '1D':[{code:'NSTP 2',title:'CWTS / ROTC 2',instructor:'TBA',room:'TBA',days:['Sun'],start:'10:00 AM',end:'1:00 PM',type:'LEC',units:3}],
  },

  'ITEC 103': {
    '1A':[
      {code:'ITEC 103',title:'Intermediate Programming',instructor:'MR. DESAMERO',room:'LAB 2',days:['Wed'],start:'7:00 AM',end:'9:30 AM',type:'LAB',units:3},
      {code:'ITEC 103',title:'Intermediate Programming',instructor:'MR. DESAMERO',room:'LEC 9',days:['Mon'],start:'4:00 PM',end:'4:30 PM',type:'LEC',units:3},
    ],
    '1B':[
      {code:'ITEC 103',title:'Intermediate Programming',instructor:'MR. DESAMERO',room:'LEC 1',days:['Tue'],start:'8:00 AM', end:'9:00 AM', type:'LEC',units:3},
      {code:'ITEC 103',title:'Intermediate Programming',instructor:'MR. DESAMERO',room:'LAB 2',days:['Wed'],start:'11:00 AM',end:'2:00 PM', type:'LAB',units:3},
      {code:'ITEC 103',title:'Intermediate Programming',instructor:'MR. DESAMERO',room:'LEC 5',days:['Mon'],start:'2:00 PM', end:'3:00 PM', type:'LEC',units:3},
    ],
    '1C':[
      {code:'ITEC 103',title:'Intermediate Programming',instructor:'MR. DESAMERO',room:'LEC 1',days:['Tue'],start:'9:00 AM',end:'10:00 AM',type:'LEC',units:3},
      {code:'ITEC 103',title:'Intermediate Programming',instructor:'MR. DESAMERO',room:'LEC 5',days:['Mon'],start:'1:00 PM',end:'2:00 PM', type:'LEC',units:3},
      {code:'ITEC 103',title:'Intermediate Programming',instructor:'MR. DESAMERO',room:'LAB 2',days:['Wed'],start:'3:00 PM',end:'6:00 PM', type:'LAB',units:3},
    ],
    '1D':[
      {code:'ITEC 103',title:'Intermediate Programming',instructor:'MR. DESAMERO',room:'LEC 2',days:['Mon'],start:'7:00 AM', end:'8:00 AM', type:'LEC',units:3},
      {code:'ITEC 103',title:'Intermediate Programming',instructor:'MR. DESAMERO',room:'LEC 5',days:['Tue'],start:'11:00 AM',end:'12:00 PM',type:'LEC',units:3},
      {code:'ITEC 103',title:'Intermediate Programming',instructor:'MR. DESAMERO',room:'LAB 2',days:['Tue'],start:'3:00 PM', end:'6:00 PM', type:'LAB',units:3},
    ],
  },

  'ITEP 101': {
    '1A':[
      {code:'ITEP 101',title:'Human Computer Interaction',instructor:'MS. ALIMAGNO',room:'LEC 7',days:['Mon'],start:'1:00 PM', end:'3:00 PM', type:'LEC',units:3},
      {code:'ITEP 101',title:'Human Computer Interaction',instructor:'MS. ALIMAGNO',room:'LEC 7',days:['Tue'],start:'1:00 PM', end:'2:00 PM', type:'LEC',units:3},
      {code:'ITEP 101',title:'Human Computer Interaction',instructor:'MS. ALIMAGNO',room:'LEC 8',days:['Wed'],start:'12:00 PM',end:'12:30 PM',type:'LEC',units:3},
    ],
    '1B':[
      {code:'ITEP 101',title:'Human Computer Interaction',instructor:'MS. ALIMAGNO',room:'LEC 7',days:['Tue'],start:'9:00 AM',end:'12:00 PM',type:'LEC',units:3},
      {code:'ITEP 101',title:'Human Computer Interaction',instructor:'MS. ALIMAGNO',room:'LEC 8',days:['Wed'],start:'9:00 AM',end:'10:00 AM',type:'LEC',units:3},
      {code:'ITEP 101',title:'Human Computer Interaction',instructor:'MS. ALIMAGNO',room:'LEC 8',days:['Thu'],start:'9:00 AM',end:'10:00 AM',type:'LEC',units:3},
    ],
    '1C':[
      {code:'ITEP 101',title:'Human Computer Interaction',instructor:'MS. ALIMAGNO',room:'LEC 8',days:['Mon'],start:'8:00 AM',end:'10:30 AM',type:'LEC',units:3},
      {code:'ITEP 101',title:'Human Computer Interaction',instructor:'MS. ALIMAGNO',room:'LEC 8',days:['Wed'],start:'8:00 AM',end:'9:00 AM', type:'LEC',units:3},
      {code:'ITEP 101',title:'Human Computer Interaction',instructor:'MS. ALIMAGNO',room:'LEC 8',days:['Thu'],start:'8:00 AM',end:'9:00 AM', type:'LEC',units:3},
    ],
    '1D':[
      {code:'ITEP 101',title:'Human Computer Interaction',instructor:'MS. ALIMAGNO',room:'LEC 8',days:['Thu'],start:'10:00 AM',end:'11:00 AM',type:'LEC',units:3},
      {code:'ITEP 101',title:'Human Computer Interaction',instructor:'MS. ALIMAGNO',room:'LEC 8',days:['Tue'],start:'2:00 PM', end:'3:00 PM', type:'LEC',units:3},
      {code:'ITEP 101',title:'Human Computer Interaction',instructor:'MS. ALIMAGNO',room:'LEC 8',days:['Wed'],start:'1:00 PM', end:'3:30 PM', type:'LEC',units:3},
    ],
  },

  'ITEP 102': {
    '1A':[
      {code:'ITEP 102',title:'Discrete Mathematics',instructor:'MR. MANZANERO',room:'LEC 3',days:['Mon'],start:'11:00 AM',end:'12:00 PM',type:'LEC',units:3},
      {code:'ITEP 102',title:'Discrete Mathematics',instructor:'MR. MANZANERO',room:'LEC 3',days:['Tue'],start:'11:00 AM',end:'12:00 PM',type:'LEC',units:3},
      {code:'ITEP 102',title:'Discrete Mathematics',instructor:'MR. MANZANERO',room:'LEC 3',days:['Wed'],start:'11:00 AM',end:'12:00 PM',type:'LEC',units:3},
    ],
    '1B':[
      {code:'ITEP 102',title:'Discrete Mathematics',instructor:'MS. ARIDA',room:'LEC 11',days:['Tue'],start:'1:00 PM',end:'2:00 PM',type:'LEC',units:3},
      {code:'ITEP 102',title:'Discrete Mathematics',instructor:'MS. ARIDA',room:'LEC 11',days:['Wed'],start:'2:00 PM',end:'3:00 PM',type:'LEC',units:3},
      {code:'ITEP 102',title:'Discrete Mathematics',instructor:'MS. ARIDA',room:'LEC 11',days:['Thu'],start:'2:00 PM',end:'3:00 PM',type:'LEC',units:3},
    ],
    '1C':[
      {code:'ITEP 102',title:'Discrete Mathematics',instructor:'MS. ARIDA',room:'LEC 11',days:['Tue'],start:'12:00 PM',end:'1:00 PM', type:'LEC',units:3},
      {code:'ITEP 102',title:'Discrete Mathematics',instructor:'MS. ARIDA',room:'LEC 9', days:['Thu'],start:'12:00 PM',end:'1:00 PM', type:'LEC',units:3},
      {code:'ITEP 102',title:'Discrete Mathematics',instructor:'MS. ARIDA',room:'LEC 9', days:['Thu'],start:'3:30 PM', end:'4:30 PM', type:'LEC',units:3},
    ],
    '1D':[
      {code:'ITEP 102',title:'Discrete Mathematics',instructor:'MR. MANZANERO',room:'LEC 3',days:['Mon'],start:'12:00 PM',end:'1:00 PM',type:'LEC',units:3},
      {code:'ITEP 102',title:'Discrete Mathematics',instructor:'MR. MANZANERO',room:'LEC 3',days:['Tue'],start:'12:00 PM',end:'1:00 PM',type:'LEC',units:3},
      {code:'ITEP 102',title:'Discrete Mathematics',instructor:'MR. MANZANERO',room:'LEC 3',days:['Wed'],start:'12:00 PM',end:'1:00 PM',type:'LEC',units:3},
    ],
  },

  'PI 100': {
    '1A':[{code:'PI 100',title:'Life, Works and Writings of Rizal',instructor:'MS. BELLO',room:'LEC 11',days:['Mon'],start:'9:00 AM',end:'9:30 AM',type:'LEC',units:3}],
    '1B':[
      {code:'PI 100',title:'Life, Works and Writings of Rizal',instructor:'TBA',room:'LEC 11',days:['Mon'],start:'10:00 AM',end:'11:00 AM',type:'LEC',units:3},
      {code:'PI 100',title:'Life, Works and Writings of Rizal',instructor:'TBA',room:'LEC 10',days:['Tue'],start:'2:00 PM', end:'3:00 PM', type:'LEC',units:3},
    ],
    '1C':[
      {code:'PI 100',title:'Life, Works and Writings of Rizal',instructor:'TBA',room:'LEC 1', days:['Tue'],start:'10:00 AM',end:'12:00 PM',type:'LEC',units:3},
      {code:'PI 100',title:'Life, Works and Writings of Rizal',instructor:'TBA',room:'LEC 11',days:['Mon'],start:'11:00 AM',end:'12:00 PM',type:'LEC',units:3},
    ],
    '1D':[
      {code:'PI 100',title:'Life, Works and Writings of Rizal',instructor:'TBA',room:'LEC 12',days:['Tue'],start:'8:00 AM',end:'9:00 AM', type:'LEC',units:3},
      {code:'PI 100',title:'Life, Works and Writings of Rizal',instructor:'TBA',room:'LEC 11',days:['Mon'],start:'1:00 PM',end:'3:00 PM', type:'LEC',units:3},
    ],
  },

  'PATHFit 2': {
    '1A':[{code:'PATHFit 2',title:'Exercise-based Fitness Activities',instructor:'TBA',room:'GYM',days:['Tue'],start:'8:00 AM',end:'10:00 AM',type:'GYM',units:2}],
    '1B':[{code:'PATHFit 2',title:'Exercise-based Fitness Activities',instructor:'TBA',room:'GYM',days:['Mon'],start:'11:00 AM',end:'1:00 PM', type:'GYM',units:2}],
    '1C':[{code:'PATHFit 2',title:'Exercise-based Fitness Activities',instructor:'TBA',room:'GYM',days:['Mon'],start:'2:00 PM', end:'4:00 PM', type:'GYM',units:2}],
    '1D':[{code:'PATHFit 2',title:'Exercise-based Fitness Activities',instructor:'TBA',room:'GYM',days:['Mon'],start:'9:00 AM', end:'11:00 AM',type:'GYM',units:2}],
  },
};

const TIMES_ARR = [
  '7:00 AM','7:30 AM','8:00 AM','8:30 AM',
  '9:00 AM','9:30 AM','10:00 AM','10:30 AM',
  '11:00 AM','11:30 AM','12:00 PM','12:30 PM',
  '1:00 PM','1:30 PM','2:00 PM','2:30 PM',
  '3:00 PM','3:30 PM','4:00 PM','4:30 PM',
  '5:00 PM','5:30 PM','6:00 PM',
];
const DAYS_ARR = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const SLOT_H   = 36;

/* ─────────────────────────────────────────
   APP STATE
───────────────────────────────────────── */
async function loadSubjectsFromServer(userId) {
  try {
    const res  = await fetch(`${API}/subjects.php?action=load&user_id=${userId}`);
    const data = await res.json();
    if (!data.ok) return { added: [], enrolled: [] };
    return { added: data.added, enrolled: data.enrolled };
  } catch(e) { return { added: [], enrolled: [] }; }
}
async function saveAdded(arr) {
  const s = getSession(); if (!s || !s.id) return;
  try { await fetch(`${API}/subjects.php?action=save_added`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id: s.id, entries: arr }) }); }
  catch(e) { console.warn('save_added failed', e); }
  autoBackup('auto');
}
async function saveEnrolled(arr) {
  const s = getSession(); if (!s || !s.id) return;
  try { await fetch(`${API}/subjects.php?action=save_enrolled`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id: s.id, entries: arr }) }); }
  catch(e) { console.warn('save_enrolled failed', e); }
  autoBackup('auto');
}

/* ─────────────────────────────────────────
   AUTO BACKUP SYSTEM
   – Up to 5 rolling snapshots in localStorage
   – Key: lspu_backups_<userId>
   – Each backup: { ts, label, added, enrolled }
───────────────────────────────────────── */
const BACKUP_MAX = 5;
const BACKUP_KEY = () => { const s = getSession(); return s ? `lspu_backups_${s.id}` : null; };

function getBackups() {
  const key = BACKUP_KEY(); if (!key) return [];
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) { return []; }
}

function saveBackups(arr) {
  const key = BACKUP_KEY(); if (!key) return;
  localStorage.setItem(key, JSON.stringify(arr));
}

function autoBackup(label) {
  // Don't auto-backup if there's nothing user-added
  if (!addedCourses.length && !enrolledCourses.length) return;
  const backups = getBackups();
  const now = Date.now();
  // Throttle auto-backups: skip if last auto was < 10 seconds ago
  const lastAuto = backups.find(b => b.label === 'auto');
  if (lastAuto && label === 'auto' && (now - lastAuto.ts) < 10000) return;

  const snapshot = {
    ts: now,
    label,
    added:    JSON.parse(JSON.stringify(addedCourses)),
    enrolled: JSON.parse(JSON.stringify(enrolledCourses)),
  };
  // Remove old auto entries if auto, keep manual ones; then prepend
  const filtered = label === 'auto'
    ? backups.filter(b => b.label !== 'auto').slice(0, BACKUP_MAX - 1)
    : backups.slice(0, BACKUP_MAX - 1);
  saveBackups([snapshot, ...filtered]);
  refreshBackupPanel();
}

function manualBackup() {
  if (!addedCourses.length && !enrolledCourses.length) {
    alert('Nothing to back up yet — add some subjects first.'); return;
  }
  autoBackup('manual');
  showBackupToast('✅ Backup saved!');
}

function restoreBackup(ts) {
  const backups = getBackups();
  const b = backups.find(x => x.ts === ts);
  if (!b) return;
  const total = b.added.length + b.enrolled.length;
  if (!confirm(`Restore backup from ${formatBackupTime(b.ts)}?\nThis will replace your ${total} subject(s). Your current schedule will be overwritten.`)) return;
  addedCourses    = b.added;
  enrolledCourses = b.enrolled;
  saveAdded(addedCourses);
  saveEnrolled(enrolledCourses);
  renderMyAll();
  renderBrowseEnrolledPanel();
  closeBackupPanel();
  showBackupToast('↩ Schedule restored!');
}

function deleteBackup(ts) {
  const backups = getBackups().filter(b => b.ts !== ts);
  saveBackups(backups);
  refreshBackupPanel();
}

function formatBackupTime(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-PH', { month:'short', day:'numeric' })
       + ' · ' + d.toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit' });
}

function openBackupPanel() {
  document.getElementById('backupPanel').classList.add('open');
  document.getElementById('backupOverlay').classList.add('open-overlay');
  refreshBackupPanel();
}

function closeBackupPanel() {
  document.getElementById('backupPanel').classList.remove('open');
  document.getElementById('backupOverlay').classList.remove('open-overlay');
}

function refreshBackupPanel() {
  const list = document.getElementById('backup-list');
  if (!list) return;
  const backups = getBackups();
  if (!backups.length) {
    list.innerHTML = `<div class="backup-empty">No backups yet. Changes are saved automatically when you add subjects.</div>`;
    return;
  }
  list.innerHTML = backups.map(b => {
    const total = b.added.length + b.enrolled.length;
    const badge = b.label === 'manual'
      ? `<span class="backup-badge backup-badge-manual">Manual</span>`
      : `<span class="backup-badge backup-badge-auto">Auto</span>`;
    return `<div class="backup-item">
      <div class="backup-item-left">
        ${badge}
        <div>
          <div class="backup-ts">${formatBackupTime(b.ts)}</div>
          <div class="backup-summary">${total} subject${total !== 1 ? 's' : ''} (${b.added.length} added, ${b.enrolled.length} enrolled)</div>
        </div>
      </div>
      <div class="backup-item-actions">
        <button class="backup-restore-btn" onclick="restoreBackup(${b.ts})">↩ Restore</button>
        <button class="backup-delete-btn" onclick="deleteBackup(${b.ts})" title="Delete this backup">✕</button>
      </div>
    </div>`;
  }).join('');
}

function showBackupToast(msg) {
  let t = document.getElementById('backupToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'backupToast';
    t.className = 'backup-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2500);
}

let EXISTING         = [];
let addedCourses     = [];
let enrolledCourses  = [];
let selectedSubjCode = null;
let selectedSection  = null;
let pendingFreeSlot  = null;
let pendingSecEntry  = null;

/* ─────────────────────────────────────────
   APP INIT
───────────────────────────────────────── */
async function initApp(session) {
  const sec = session.section;
  EXISTING = SCHEDULE_BY_SECTION[sec] || [];

  document.getElementById('topbar-user').textContent    = '👤 ' + session.name;
  document.getElementById('topbar-section').textContent = 'BS INFO ' + sec;
  document.getElementById('prog-name-text').textContent = 'BS in Information Technology — 2nd Year';
  document.getElementById('prog-meta-text').textContent =
    `Section: BS INFO ${sec} \u00a0|\u00a0 Second Semester, AY 2025\u20132026`;

  const loaded    = await loadSubjectsFromServer(session.id);
  addedCourses    = loaded.added;
  enrolledCourses = loaded.enrolled;

  renderMyAll();
  renderSubjectPicker();
  renderBrowseEnrolledPanel();
}

/* ─────────────────────────────────────────
   TOPBAR HAMBURGER MENU
───────────────────────────────────────── */
function toggleTopbarMenu(event) {
  event.preventDefault();
  event.stopPropagation();
  const wrap = document.getElementById('topbarMenuWrap');
  const btn  = document.getElementById('topbarMenuBtn');
  const isOpen = wrap.classList.contains('menu-open');
  if (isOpen) {
    wrap.classList.remove('menu-open');
    btn.classList.remove('menu-open');
  } else {
    wrap.classList.add('menu-open');
    btn.classList.add('menu-open');
  }
}
function closeTopbarMenu() {
  document.getElementById('topbarMenuWrap')?.classList.remove('menu-open');
  document.getElementById('topbarMenuBtn')?.classList.remove('menu-open');
}
// Close menu when clicking anywhere outside
document.addEventListener('click', function(e) {
  const wrap = document.getElementById('topbarMenuWrap');
  const btn = document.getElementById('topbarMenuBtn');
  // Only close if clicking outside the wrap AND not clicking the button itself
  if (wrap && btn && !wrap.contains(e.target) && !btn.contains(e.target)) {
    closeTopbarMenu();
  }
});

/* ─────────────────────────────────────────
   EDIT PROFILE MODAL
───────────────────────────────────────── */
let _editSelectedSection = null;

function openEditProfile() {
  const s = getSession();
  _editSelectedSection = s?.section ?? null;

  // Pre-fill name
  document.getElementById('edit-name-input').value = s?.name ?? '';

  // Build section grid
  const allSections = ['2A','2B','2C','2D'];
  document.getElementById('edit-section-grid').innerHTML = allSections.map(sec => `
    <div id="ep-sec-${sec}" class="ep-sec-tile${sec === _editSelectedSection ? ' ep-sec-active' : ''}"
         onclick="pickEditSection('${sec}')">
      <div class="ep-sec-label">BS INFO</div>
      <div class="ep-sec-main">${sec}</div>
    </div>`).join('');

  document.getElementById('editProfileModal').classList.add('open');
  document.getElementById('edit-name-input').focus();
}

function pickEditSection(sec) {
  _editSelectedSection = sec;
  document.querySelectorAll('.ep-sec-tile').forEach(t => t.classList.remove('ep-sec-active'));
  document.getElementById('ep-sec-' + sec)?.classList.add('ep-sec-active');
}

function closeEditProfile() {
  document.getElementById('editProfileModal').classList.remove('open');
  _editSelectedSection = null;
}

async function saveEditProfile() {
  const s       = getSession();
  const newName = document.getElementById('edit-name-input').value.trim();
  const newSec  = _editSelectedSection;

  if (!newName) { alert('Please enter a display name.'); return; }

  const nameChanged = newName !== s.name;
  const secChanged  = newSec && newSec !== s.section;

  if (!nameChanged && !secChanged) { closeEditProfile(); return; }
  if (secChanged && !confirm(`Switch to section ${newSec}? Your fixed schedule will update.`)) return;

  // Save name
  if (nameChanged) {
    try {
      const res  = await fetch(`${API}/auth.php?action=update_name`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: s.id, name: newName }),
      });
      const data = await res.json();
      if (!data.ok) { alert('Could not save name: ' + data.error); return; }
    } catch(e) { alert('Server error saving name.'); return; }
  }

  // Save section
  if (secChanged) {
    try {
      const res  = await fetch(`${API}/auth.php?action=set_section`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: s.id, section: newSec }),
      });
      const data = await res.json();
      if (!data.ok) { alert('Could not save section: ' + data.error); return; }
    } catch(e) { alert('Server error saving section.'); return; }
  }

  // Update session & UI
  const updated = { ...s, name: newName, section: newSec ?? s.section };
  saveSession(updated);

  document.getElementById('topbar-user').textContent    = ' ' + updated.name;
  document.getElementById('topbar-section').textContent = 'BS INFO ' + updated.section;
  document.getElementById('prog-meta-text').textContent =
    `Section: BS INFO ${updated.section} \u00a0|\u00a0 Second Semester, AY 2025\u20132026`;

  if (secChanged) {
    EXISTING = SCHEDULE_BY_SECTION[updated.section] || [];
    renderMyAll();
  }

  closeEditProfile();
  showBackupToast('✅ Profile updated!');
}

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function tIdx(t) { return TIMES_ARR.indexOf(t); }

function getAllOccupied() {
  const occ = {};
  [...EXISTING, ...addedCourses, ...enrolledCourses].forEach(blk => {
    const si = tIdx(blk.start), ei = tIdx(blk.end);
    blk.days.forEach(d => {
      const di = DAYS_ARR.indexOf(d);
      for (let k = si; k < ei; k++) occ[`${di}-${k}`] = true;
    });
  });
  return occ;
}

function entryConflicts(entry, baseList) {
  const occ = {};
  baseList.forEach(blk => {
    const si = tIdx(blk.start), ei = tIdx(blk.end);
    blk.days.forEach(d => {
      const di = DAYS_ARR.indexOf(d);
      for (let k = si; k < ei; k++) occ[`${di}-${k}`] = true;
    });
  });
  const si = tIdx(entry.start), ei = tIdx(entry.end);
  let conflict = false;
  entry.days.forEach(d => {
    const di = DAYS_ARR.indexOf(d);
    for (let k = si; k < ei; k++) { if (occ[`${di}-${k}`]) conflict = true; }
  });
  return conflict;
}

/* ─────────────────────────────────────────
   TAB SWITCHING
───────────────────────────────────────── */
function switchTab(tab) {
  document.getElementById('view-my').style.display     = tab === 'my'     ? 'grid'  : 'none';
  document.getElementById('view-browse').style.display = tab === 'browse' ? 'block' : 'none';
  document.getElementById('tab-my').classList.toggle('active',     tab === 'my');
  document.getElementById('tab-browse').classList.toggle('active', tab === 'browse');
  if (tab === 'browse') renderBrowseEnrolledPanel();
}

/* ─────────────────────────────────────────
   SIDEBAR SUBJECT SEARCH
───────────────────────────────────────── */
let _srExpandedCode = null; // tracks which browse card is expanded

function searchSubjects(query) {
  const resultsEl = document.getElementById('sb-search-results');
  const clearBtn  = document.getElementById('sb-search-clear');
  const q = query.trim().toLowerCase();

  if (clearBtn) clearBtn.style.display = q ? 'flex' : 'none';

  if (!q) {
    resultsEl.style.display = 'none';
    resultsEl.innerHTML = '';
    _srExpandedCode = null;
    return;
  }

  // Build a searchable list from all sources
  const allEntries = {};
  EXISTING.forEach(e => {
    if (!allEntries[e.code]) allEntries[e.code] = { ...e, _type: 'fixed' };
  });
  enrolledCourses.forEach(e => {
    if (!allEntries[e.code]) allEntries[e.code] = { ...e, _type: 'enrolled' };
  });
  addedCourses.forEach(e => {
    if (!allEntries[e.code]) allEntries[e.code] = { ...e, _type: 'added' };
  });
  BROWSE_SUBJECTS.forEach(b => {
    if (!allEntries[b.code]) allEntries[b.code] = { ...b, _type: 'browse' };
  });

  const matches = Object.values(allEntries).filter(e =>
    e.code.toLowerCase().includes(q) ||
    (e.title || '').toLowerCase().includes(q) ||
    (e.instructor || '').toLowerCase().includes(q)
  );

  if (!matches.length) {
    resultsEl.style.display = 'block';
    resultsEl.innerHTML = `<div class="sb-search-empty">No subjects found for "<strong>${query}</strong>"</div>`;
    return;
  }

  resultsEl.style.display = 'block';
  resultsEl.innerHTML = matches.map(e => renderSearchResultItem(e, q)).join('');
}

function renderSearchResultItem(e, q) {
  const typeLabel = { fixed: 'Fixed', enrolled: 'Enrolled', added: 'Added', browse: 'Available' };
  const typeCls   = { fixed: 'sr-badge-fixed', enrolled: 'sr-badge-enrolled', added: 'sr-badge-added', browse: 'sr-badge-browse' };
  const isExpanded = _srExpandedCode === e.code;

  if (e._type === 'browse') {
    const sections = SECTION_SCHEDULES[e.code] ? Object.keys(SECTION_SCHEDULES[e.code]) : [];
    const expandedHTML = isExpanded ? renderBrowseDetailTile(e, sections, q) : '';
    return `
      <div class="sb-search-result-item sr-browse-item${isExpanded ? ' sr-expanded' : ''}" onclick="toggleBrowseExpand('${e.code}')">
        <div class="sr-left">
          <div class="sr-code">${highlight(e.code, q)}</div>
          <div class="sr-title">${highlight(e.title || e.code, q)}</div>
          <div class="sr-instr">${sections.length} section${sections.length !== 1 ? 's' : ''} available · ${e.units} units</div>
        </div>
        <div class="sr-right">
          <span class="sr-badge sr-badge-browse">Available</span>
          <span class="sr-expand-arrow">${isExpanded ? '▲' : '▼'}</span>
        </div>
      </div>
      ${expandedHTML}`;
  }

  return `
    <div class="sb-search-result-item">
      <div class="sr-left">
        <div class="sr-code">${highlight(e.code, q)}</div>
        <div class="sr-title">${highlight(e.title || e.code, q)}</div>
        ${e.instructor ? `<div class="sr-instr">${highlight(e.instructor, q)}</div>` : ''}
      </div>
      <span class="sr-badge ${typeCls[e._type] || ''}">${typeLabel[e._type] || ''}</span>
    </div>`;
}

function renderBrowseDetailTile(subj, sections, q) {
  if (!sections.length) return `<div class="sr-detail-tile"><div class="sr-detail-empty">No sections available for this subject.</div></div>`;

  const rows = sections.map(sec => {
    const entries = SECTION_SCHEDULES[subj.code][sec] || [];
    const alreadyEnrolled = enrolledCourses.some(e => e.code === subj.code && e.section === sec);
    const schedLines = entries.map(en =>
      `<div class="sr-sec-sched">${en.days.join(', ')} · ${en.start}–${en.end} · ${en.room} <span class="sr-type-tag ${en.type==='LAB'?'sr-tag-lab':'sr-tag-lec'}">${en.type}</span></div>`
    ).join('');
    const hasConflict = entries.some(en => entryConflicts(en, [...EXISTING, ...addedCourses, ...enrolledCourses]));

    let btnHTML;
    if (alreadyEnrolled) {
      btnHTML = `<button class="sr-add-btn sr-add-enrolled" disabled>✓ Enrolled</button>`;
    } else {
      const label = hasConflict ? '⚠ Add Anyway' : '+ Add to Schedule';
      const cls   = hasConflict ? 'sr-add-btn sr-add-conflict' : 'sr-add-btn sr-add-ok';
      const eJson = JSON.stringify(entries[0]).replace(/'/g, "&#39;");
      btnHTML = `<button class="${cls}" onclick="searchEnrollSection(event,'${subj.code}','${sec}')">${label}</button>`;
    }

    const instr = entries[0] ? entries[0].instructor : '—';
    return `
      <div class="sr-sec-row${hasConflict && !alreadyEnrolled ? ' sr-sec-conflict' : ''}">
        <div class="sr-sec-info">
          <div class="sr-sec-label">Section ${sec}</div>
          <div class="sr-sec-instr">${instr}</div>
          ${schedLines}
        </div>
        ${btnHTML}
      </div>`;
  }).join('');

  return `
    <div class="sr-detail-tile" onclick="event.stopPropagation()">
      <div class="sr-detail-header">
        <span class="sr-detail-code">${subj.code}</span>
        <span class="sr-detail-title">${subj.title}</span>
        <span class="sr-detail-units">${subj.units} units · ${subj.type}</span>
      </div>
      <div class="sr-sec-list">${rows}</div>
    </div>`;
}

function toggleBrowseExpand(code) {
  _srExpandedCode = (_srExpandedCode === code) ? null : code;
  // Re-render results keeping current query
  const input = document.getElementById('sb-search-input');
  if (input) searchSubjects(input.value);
}

function searchEnrollSection(event, code, sec) {
  event.stopPropagation();
  const entries = SECTION_SCHEDULES[code]?.[sec] || [];
  if (!entries.length) return;

  // Enroll all entries for this section
  const alreadyEnrolled = enrolledCourses.some(e => e.code === code && e.section === sec);
  if (alreadyEnrolled) return;

  const hasConflict = entries.some(en => entryConflicts(en, [...EXISTING, ...addedCourses, ...enrolledCourses]));
  if (hasConflict && !confirm(`Section ${sec} conflicts with an existing class. Enroll anyway?`)) return;

  entries.forEach(en => {
    enrolledCourses.push({ ...en, section: sec, id: `${en.code}-${sec}-${en.type}-${Date.now()}` });
  });
  saveEnrolled(enrolledCourses);
  renderMyAll();
  renderBrowseEnrolledPanel();

  // Re-render search to update button states
  const input = document.getElementById('sb-search-input');
  if (input) searchSubjects(input.value);

  showBackupToast(`✅ ${code} (${sec}) added to schedule!`);
}

function highlight(text, q) {
  if (!q) return text;
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
  return text.replace(re, '<mark class="sr-highlight">$1</mark>');
}

function clearSearch() {
  const input = document.getElementById('sb-search-input');
  if (input) input.value = '';
  _srExpandedCode = null;
  searchSubjects('');
}

/* ─────────────────────────────────────────
   MY SCHEDULE TAB
───────────────────────────────────────── */
function renderSidebar() {
  const unique = {};
  EXISTING.forEach(e => { if (!unique[e.code]) unique[e.code] = { ...e, _type: 'fixed' }; });
  enrolledCourses.forEach(e => { if (!unique[e.code]) unique[e.code] = { ...e, _type: 'enrolled' }; });
  addedCourses.forEach(e => { if (!unique[e.code]) unique[e.code] = { ...e, _type: 'added' }; });

  document.getElementById('sb-subjects').innerHTML = Object.entries(unique).map(([code, e]) => `
    <div class="subj-card ${e._type === 'enrolled' ? 'subj-card-enrolled' : e._type === 'added' ? 'subj-card-added' : ''}">
      <div class="subj-code">${code}</div>
      <div class="subj-title">${e.instructor}</div>
      ${e._type === 'enrolled' ? `<div class="subj-units"><span class="ep-section-tag">Section ${e.section}</span></div>` : `<div class="subj-units"><span class="tt-badge ${(e.type||'').toLowerCase()==='lab'?'tt-lab':'tt-lec'}">${e.type||'LEC'}</span></div>`}
    </div>`).join('');

  document.getElementById('stat-subjects').textContent = Object.keys(unique).length;
  document.getElementById('stat-added').textContent    = addedCourses.length + enrolledCourses.length;
  document.getElementById('sb-clear-wrap').style.display = (addedCourses.length || enrolledCourses.length) ? 'block' : 'none';
}

function renderSchedule() {
  const occ   = getAllOccupied();
  const tbody = document.getElementById('sched-body');
  tbody.innerHTML = '';
  const blocked = {};

  TIMES_ARR.forEach((time, ti) => {
    if (ti >= TIMES_ARR.length - 1) return;
    const tr     = document.createElement('tr');
    const tdTime = document.createElement('td');
    tdTime.className   = 'time-col';
    tdTime.textContent = time;
    tr.appendChild(tdTime);

    DAYS_ARR.forEach((day, di) => {
      const cellKey    = `${di}-${ti}`;
      if (blocked[cellKey]) return;

      const fixedEntry    = EXISTING.find(b => b.days.includes(day) && tIdx(b.start) === ti);
      const addedEntry    = addedCourses.find(b => b.days.includes(day) && tIdx(b.start) === ti);
      const enrolledEntry = enrolledCourses.find(b => b.days.includes(day) && tIdx(b.start) === ti);

      if (fixedEntry) {
        const dur = tIdx(fixedEntry.end) - tIdx(fixedEntry.start);
        const h   = dur * SLOT_H - 4;
        for (let k = 1; k < dur; k++) blocked[`${di}-${ti + k}`] = true;
        const td  = document.createElement('td');
        td.rowSpan = dur;
        td.style.cssText = 'vertical-align:top;padding:0;';
        td.innerHTML = `<div class="blk blk-fixed" style="height:${h}px;" onclick='showTooltip(event,${JSON.stringify(fixedEntry)},false,null)'>
          <div class="blk-inner">
            <div class="blk-code">${fixedEntry.code}</div>
            <div class="blk-instr">${fixedEntry.instructor}</div>
            <div class="blk-room">${fixedEntry.room}</div>
          </div></div>`;
        tr.appendChild(td);
      } else if (enrolledEntry) {
        const dur = tIdx(enrolledEntry.end) - tIdx(enrolledEntry.start);
        const h   = dur * SLOT_H - 4;
        for (let k = 1; k < dur; k++) blocked[`${di}-${ti + k}`] = true;
        const td  = document.createElement('td');
        td.rowSpan = dur;
        td.style.cssText = 'vertical-align:top;padding:0;';
        const ej = JSON.stringify(enrolledEntry).replace(/'/g,"&#39;");
        td.innerHTML = `<div class="blk blk-enrolled" style="height:${h}px;" onclick='showTooltip(event,${ej},true,"${enrolledEntry.section}")'>
          <div class="blk-inner">
            <div class="blk-code">${enrolledEntry.code}</div>
            <div class="blk-instr">${enrolledEntry.instructor}</div>
            <div class="blk-room">${enrolledEntry.room} · Sec ${enrolledEntry.section}</div>
          </div></div>`;
        tr.appendChild(td);
      } else if (addedEntry) {
        const dur = tIdx(addedEntry.end) - tIdx(addedEntry.start);
        const h   = dur * SLOT_H - 4;
        for (let k = 1; k < dur; k++) blocked[`${di}-${ti + k}`] = true;
        const td  = document.createElement('td');
        td.rowSpan = dur;
        td.style.cssText = 'vertical-align:top;padding:0;';
        td.innerHTML = `<div class="blk blk-added" style="height:${h}px;" onclick='showTooltip(event,${JSON.stringify(addedEntry)},true,null)'>
          <div class="blk-inner">
            <div class="blk-code">${addedEntry.code}</div>
            <div class="blk-instr">${addedEntry.instructor || 'TBA'}</div>
            <div class="blk-room">${addedEntry.room || ''}</div>
          </div></div>`;
        tr.appendChild(td);
      } else if (!occ[cellKey]) {
        const td = document.createElement('td');
        td.className = 'free-cell';
        td.innerHTML = `<div class="free-cell-inner"></div><div class="free-hover-label">+ ADD</div>`;
        td.onclick   = () => openFreeSlotModal(day, time);
        tr.appendChild(td);
      } else {
        tr.appendChild(document.createElement('td'));
      }
    });
    tbody.appendChild(tr);
  });
}

function renderAddedPanel() {
  const body = document.getElementById('ap-body');
  document.getElementById('ap-count').textContent =
    addedCourses.length + ' subject' + (addedCourses.length !== 1 ? 's' : '');
  if (!addedCourses.length) {
    body.innerHTML = `<div class="ep-empty">No subjects added yet — hover the free slots on the schedule to add.</div>`;
    return;
  }
  body.innerHTML = `<div class="ep-grid">${addedCourses.map(a => `
    <div class="ep-card">
      <div class="ep-top"><div class="ep-code">${a.code}</div>
        <button class="ep-remove" onclick="removeAdded('${a.id}')" title="Remove">✕</button></div>
      <div class="ep-name">${a.title || a.code}</div>
      <div class="ep-sched">${a.days.join(', ')} · ${a.start}–${a.end}</div>
      <div class="ep-room">Room: ${a.room || 'TBA'} · ${a.instructor || 'TBA'}</div>
    </div>`).join('')}</div>`;
}

function renderMyAll() {
  renderSidebar();
  renderSchedule();
  renderAddedPanel();
}

function removeAdded(id) {
  addedCourses = addedCourses.filter(a => a.id !== id);
  saveAdded(addedCourses);
  closeTT();
  renderMyAll();
}

function clearAdded() {
  if (!confirm('Remove all added subjects?')) return;
  addedCourses = [];
  saveAdded(addedCourses);
  renderMyAll();
}

/* ─────────────────────────────────────────
   FREE SLOT MODAL
───────────────────────────────────────── */
function openFreeSlotModal(day, time) {
  pendingFreeSlot = { day, time };
  document.getElementById('modal-title-text').textContent = 'Add Subject to Free Slot';
  document.getElementById('modal-slot-info').textContent  = `${day} at ${time}`;
  document.getElementById('modal-body-content').innerHTML = `
    <div style="margin-bottom:12px;">
      <label style="font-size:11px;color:var(--text3);display:block;margin-bottom:4px;">Subject Code</label>
      <input id="fs-code" type="text" placeholder="e.g. GE 106" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius);font-family:'DM Mono',monospace;font-size:12px;color:var(--text);background:var(--surface3);outline:none;"/>
    </div>
    <div style="margin-bottom:12px;">
      <label style="font-size:11px;color:var(--text3);display:block;margin-bottom:4px;">Subject Title</label>
      <input id="fs-title" type="text" placeholder="e.g. Art Appreciation" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius);font-family:'DM Mono',monospace;font-size:12px;color:var(--text);background:var(--surface3);outline:none;"/>
    </div>
    <div style="margin-bottom:12px;">
      <label style="font-size:11px;color:var(--text3);display:block;margin-bottom:4px;">Instructor</label>
      <input id="fs-instr" type="text" placeholder="e.g. MS. REYES" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius);font-family:'DM Mono',monospace;font-size:12px;color:var(--text);background:var(--surface3);outline:none;"/>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
      <div>
        <label style="font-size:11px;color:var(--text3);display:block;margin-bottom:4px;">End Time</label>
        <select id="fs-end" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius);font-family:'DM Mono',monospace;font-size:12px;background:var(--surface3);">
          ${TIMES_ARR.filter(t => tIdx(t) > tIdx(time)).map(t => `<option value="${t}">${t}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:11px;color:var(--text3);display:block;margin-bottom:4px;">Room</label>
        <input id="fs-room" type="text" placeholder="e.g. LEC 5" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius);font-family:'DM Mono',monospace;font-size:12px;background:var(--surface3);"/>
      </div>
    </div>
    <div style="font-size:11px;color:var(--text3);margin-bottom:4px;">Days</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      ${DAYS_ARR.map(d => `<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;">
        <input type="checkbox" name="fsday" value="${d}"${d === day ? ' checked' : ''}> ${d}</label>`).join('')}
    </div>`;
  const addBtn = document.getElementById('modal-add-btn');
  addBtn.className   = 'modal-btn modal-btn-add';
  addBtn.textContent = 'Add to Schedule';
  document.getElementById('addModal').classList.add('open');
}

function doModalAdd() {
  if (!pendingFreeSlot) return;
  const code  = (document.getElementById('fs-code').value  || '').trim().toUpperCase();
  const title = (document.getElementById('fs-title').value || '').trim();
  const instr = (document.getElementById('fs-instr').value || '').trim();
  const room  = (document.getElementById('fs-room').value  || '').trim();
  const end   = document.getElementById('fs-end').value;
  const days  = [...document.querySelectorAll('input[name=fsday]:checked')].map(e => e.value);
  if (!code || !days.length) { alert('Please fill in a subject code and select at least one day.'); return; }
  const entry = {
    id: `${code}-${days.join('')}-${pendingFreeSlot.time}-${end}-${Date.now()}`,
    code, title: title || code, instructor: instr || 'TBA',
    room: room || 'TBA', days, start: pendingFreeSlot.time, end, type: 'LEC',
  };
  if (entryConflicts(entry, EXISTING)) {
    if (!confirm('This conflicts with an existing class. Add anyway?')) return;
  }
  addedCourses.push(entry);
  saveAdded(addedCourses);
  closeModal();
  renderMyAll();
}

function closeModal() {
  document.getElementById('addModal').classList.remove('open');
  pendingFreeSlot = null;
}

/* ─────────────────────────────────────────
   TOOLTIP
───────────────────────────────────────── */
function showTooltip(event, blk, isAdded, section) {
  const box  = document.getElementById('ttBox');
  const over = document.getElementById('ttOverlay');
  document.getElementById('tt-code').textContent = blk.code;
  const isEnrolled = !!section;
  const typeClass = (blk.type || 'LEC').toLowerCase() === 'lab'
    ? 'tt-lab' : (isEnrolled ? 'tt-enrolled-badge' : isAdded ? 'tt-added-badge' : 'tt-lec');
  document.getElementById('tt-rows').innerHTML = `
    <div class="tt-row"><span class="tt-lbl">Subject</span><span class="tt-val">${blk.title || blk.code}</span></div>
    <div class="tt-row"><span class="tt-lbl">Days</span><span class="tt-val">${(blk.days || []).join(', ')}</span></div>
    <div class="tt-row"><span class="tt-lbl">Time</span><span class="tt-val">${blk.start} – ${blk.end}</span></div>
    <div class="tt-row"><span class="tt-lbl">Room</span><span class="tt-val">${blk.room || '—'}</span></div>
    <div class="tt-row"><span class="tt-lbl">Instructor</span><span class="tt-val">${blk.instructor || '—'}</span></div>
    <div class="tt-row"><span class="tt-lbl">Type</span><span class="tt-val"><span class="tt-badge ${typeClass}">${blk.type || 'LEC'}</span></span></div>
    ${isEnrolled ? `<div class="tt-row"><span class="tt-lbl">Section</span><span class="tt-val"><span class="tt-badge tt-enrolled-badge">Section ${section}</span></span></div>` : ''}
    ${isEnrolled ? `<div class="tt-row"><span class="tt-lbl">Status</span><span class="tt-val" style="color:var(--purple);font-weight:600;">Enrolled from Browse</span></div>` : ''}
    ${isAdded && !isEnrolled ? `<div class="tt-row"><span class="tt-lbl">Status</span><span class="tt-val" style="color:var(--green);font-weight:600;">Added by you</span></div>` : ''}`;
  document.getElementById('tt-actions').innerHTML = isEnrolled
    ? `<button class="tt-btn tt-btn-remove" onclick="removeEnrolled('${blk.id}')">Remove</button>
       <button class="tt-btn tt-btn-close"  onclick="closeTT()">Close</button>`
    : isAdded
    ? `<button class="tt-btn tt-btn-remove" onclick="removeAdded('${blk.id}')">Remove</button>
       <button class="tt-btn tt-btn-close"  onclick="closeTT()">Close</button>`
    : `<button class="tt-btn tt-btn-close"  onclick="closeTT()" style="flex:1;">Close</button>`;
  over.classList.add('open');
  box.style.display = 'block';
  const x = Math.min(event.clientX + 12, window.innerWidth  - 260);
  const y = Math.min(event.clientY - 10, window.innerHeight - 320);
  box.style.left = x + 'px';
  box.style.top  = Math.max(8, y) + 'px';
}

function closeTT() {
  document.getElementById('ttOverlay').classList.remove('open');
  document.getElementById('ttBox').style.display = 'none';
}

/* ─────────────────────────────────────────
   BROWSE TAB
───────────────────────────────────────── */
function renderSubjectPicker() {
  document.getElementById('subj-picker-grid').innerHTML = BROWSE_SUBJECTS.map(s => `
    <div class="sp-card${selectedSubjCode === s.code ? ' selected' : ''}" onclick="selectSubject('${s.code}')">
      <div class="sp-code">${s.code}</div>
      <div class="sp-title">${s.title}</div>
      <div class="sp-units">${s.units} units · ${s.type}</div>
    </div>`).join('');
}

function selectSubject(code) {
  selectedSubjCode = code;
  selectedSection  = null;
  renderSubjectPicker();
  const step2 = document.getElementById('step2-wrap');
  step2.style.display = 'block';
  document.getElementById('step2-sub').textContent = `Available sections for ${code}`;
  const sections = Object.keys(SECTION_SCHEDULES[code] || {});
  document.getElementById('section-bar').innerHTML = sections.map(s => `
    <button class="sec-btn${selectedSection === s ? ' active' : ''}" id="secbtn-${s}" onclick="selectSection('${s}')">${s}</button>`).join('');
  document.getElementById('sec-sched-wrap').style.display = 'none';
}

function selectSection(sec) {
  selectedSection = sec;
  document.querySelectorAll('.sec-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('secbtn-' + sec);
  if (btn) btn.classList.add('active');
  renderSectionSchedule();
}

function renderSectionSchedule() {
  if (!selectedSubjCode || !selectedSection) return;
  const entries = SECTION_SCHEDULES[selectedSubjCode]?.[selectedSection] || [];
  document.getElementById('sec-sched-wrap').style.display = 'block';
  document.getElementById('sec-sched-title').textContent  = `${selectedSubjCode} — Section ${selectedSection}`;
  document.getElementById('sec-sched-badge').textContent  = `Section ${selectedSection}`;

  const tbody   = document.getElementById('sec-sched-body');
  tbody.innerHTML = '';
  const blocked = {};

  TIMES_ARR.forEach((time, ti) => {
    if (ti >= TIMES_ARR.length - 1) return;
    const tr     = document.createElement('tr');
    const tdTime = document.createElement('td');
    tdTime.className   = 'time-col';
    tdTime.textContent = time;
    tr.appendChild(tdTime);

    DAYS_ARR.forEach((day, di) => {
      const cellKey  = `${di}-${ti}`;
      if (blocked[cellKey]) return;

      const secEntry = entries.find(b => b.days.includes(day) && tIdx(b.start) === ti);
      const myEntry  = EXISTING.find(b => b.days.includes(day) && tIdx(b.start) === ti)
                    || addedCourses.find(b => b.days.includes(day) && tIdx(b.start) === ti)
                    || enrolledCourses.find(b => b.days.includes(day) && tIdx(b.start) === ti);

      if (secEntry) {
        const dur = tIdx(secEntry.end) - tIdx(secEntry.start);
        const h   = dur * SLOT_H - 4;
        for (let k = 1; k < dur; k++) blocked[`${di}-${ti + k}`] = true;
        const conflicts = entryConflicts(secEntry, [...EXISTING, ...addedCourses, ...enrolledCourses]);
        const td  = document.createElement('td');
        td.rowSpan = dur;
        td.style.cssText = 'vertical-align:top;padding:0;';
        const ej  = JSON.stringify(secEntry).replace(/'/g, "&#39;");
        td.innerHTML = `<div class="blk ${conflicts ? 'blk-conflict' : 'blk-added'}" style="height:${h}px;" onclick='openSecModal(${ej},${conflicts})'>
          <div class="blk-inner">
            <div class="blk-code">${secEntry.code}</div>
            <div class="blk-instr">${secEntry.instructor}</div>
            <div class="blk-room">${secEntry.room} · ${secEntry.type}</div>
          </div></div>`;
        tr.appendChild(td);
      } else if (myEntry) {
        const dur = tIdx(myEntry.end) - tIdx(myEntry.start);
        const h   = dur * SLOT_H - 4;
        for (let k = 1; k < dur; k++) blocked[`${di}-${ti + k}`] = true;
        const td  = document.createElement('td');
        td.rowSpan = dur;
        td.style.cssText = 'vertical-align:top;padding:0;';
        td.innerHTML = `<div class="blk blk-fixed" style="height:${h}px;" onclick='showTooltip(event,${JSON.stringify(myEntry)},false)'>
          <div class="blk-inner">
            <div class="blk-code">${myEntry.code}</div>
            <div class="blk-instr">${myEntry.instructor}</div>
            <div class="blk-room">${myEntry.room}</div>
          </div></div>`;
        tr.appendChild(td);
      } else {
        tr.appendChild(document.createElement('td'));
      }
    });
    tbody.appendChild(tr);
  });
}

function openSecModal(entry, hasConflict) {
  pendingSecEntry = entry;
  document.getElementById('sec-modal-title').textContent = entry.code;
  document.getElementById('sec-modal-sub').textContent   = `Section ${selectedSection} · ${entry.type}`;
  const alreadyEnrolled = enrolledCourses.some(e => e.code === entry.code && e.section === selectedSection);
  document.getElementById('sec-modal-body').innerHTML = `
    <div class="modal-info-row"><span class="modal-info-label">Subject</span><span class="modal-info-val">${entry.title}</span></div>
    <div class="modal-info-row"><span class="modal-info-label">Section</span><span class="modal-info-val">${selectedSection}</span></div>
    <div class="modal-info-row"><span class="modal-info-label">Days</span><span class="modal-info-val">${entry.days.join(', ')}</span></div>
    <div class="modal-info-row"><span class="modal-info-label">Time</span><span class="modal-info-val">${entry.start} – ${entry.end}</span></div>
    <div class="modal-info-row"><span class="modal-info-label">Room</span><span class="modal-info-val">${entry.room}</span></div>
    <div class="modal-info-row"><span class="modal-info-label">Instructor</span><span class="modal-info-val">${entry.instructor}</span></div>
    <div class="modal-info-row"><span class="modal-info-label">Units</span><span class="modal-info-val">${entry.units}</span></div>
    ${hasConflict
      ? `<div class="modal-conflict-box">⚠️ <strong>Schedule Conflict:</strong> This subject overlaps with one of your current classes.</div>`
      : `<div class="modal-ok-box">✅ <strong>No Conflict:</strong> This subject fits your current schedule.</div>`}`;
  const addBtn = document.getElementById('sec-modal-add-btn');
  if (alreadyEnrolled) {
    addBtn.textContent   = '✓ Already Enrolled';
    addBtn.className     = 'modal-btn';
    addBtn.style.cssText = 'background:var(--border);color:var(--text3);cursor:not-allowed;';
  } else if (hasConflict) {
    addBtn.className     = 'modal-btn modal-btn-cancel';
    addBtn.style.cssText = 'background:var(--danger-light);color:var(--danger);border:1px solid var(--danger-mid);';
    addBtn.textContent   = 'Enroll Anyway';
  } else {
    addBtn.className     = 'modal-btn modal-btn-add';
    addBtn.style.cssText = '';
    addBtn.textContent   = 'Enroll this Subject';
  }
  document.getElementById('secModal').classList.add('open');
}

function doSecAdd() {
  if (!pendingSecEntry) return;
  const alreadyEnrolled = enrolledCourses.some(e => e.code === pendingSecEntry.code && e.section === selectedSection);
  if (alreadyEnrolled) { closeSecModal(); return; }
  const entry = { ...pendingSecEntry, section: selectedSection, id: `${pendingSecEntry.code}-${selectedSection}-${Date.now()}` };
  enrolledCourses.push(entry);
  saveEnrolled(enrolledCourses);
  closeSecModal();
  renderSectionSchedule();
  renderBrowseEnrolledPanel();
  // Also refresh My Schedule so the enrolled subject appears there immediately
  renderMyAll();
}

function closeSecModal() {
  document.getElementById('secModal').classList.remove('open');
  pendingSecEntry = null;
}

function removeEnrolled(id) {
  enrolledCourses = enrolledCourses.filter(e => e.id !== id);
  saveEnrolled(enrolledCourses);
  closeTT();
  renderBrowseEnrolledPanel();
  renderMyAll();
  if (selectedSubjCode && selectedSection) renderSectionSchedule();
}

function renderBrowseEnrolledPanel() {
  const count = document.getElementById('browse-ep-count');
  const body  = document.getElementById('browse-ep-body');
  count.textContent = enrolledCourses.length + ' subject' + (enrolledCourses.length !== 1 ? 's' : '');
  if (!enrolledCourses.length) {
    body.innerHTML = `<div class="ep-empty">No subjects enrolled yet — browse sections above and click a subject block to enroll.</div>`;
    return;
  }
  body.innerHTML = `<div class="ep-grid">${enrolledCourses.map(e => `
    <div class="ep-card">
      <div class="ep-top"><div class="ep-code">${e.code}</div>
        <button class="ep-remove" onclick="removeEnrolled('${e.id}')" title="Remove">✕</button></div>
      <div class="ep-name">${e.title}</div>
      <div class="ep-sched">${e.days.join(', ')} · ${e.start}–${e.end}</div>
      <div class="ep-room">Room: ${e.room} · ${e.instructor}</div>
      <span class="ep-section-tag">Section ${e.section}</span>
    </div>`).join('')}</div>`;
}
/* ─────────────────────────────────────────
   PRINT — grid only
───────────────────────────────────────── */
function printSchedule() {
  window.print();
}