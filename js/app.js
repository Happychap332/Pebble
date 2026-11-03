/* =========================================================
   Pebble — plan calmly
   A calm study planner. Everything is stored in this browser
   (localStorage), so it works on GitHub Pages with no server.
   ========================================================= */
'use strict';

/* ---------- small helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYMD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const todayStr = () => ymd(new Date());
const tomorrowStr = () => ymd(addDays(new Date(), 1));
const daysUntil = s => Math.round((parseYMD(s) - parseYMD(todayStr())) / 86400000);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const pick = a => a[Math.floor(Math.random() * a.length)];
const fmtDate = (s, o = { weekday: 'short', day: 'numeric', month: 'short' }) => parseYMD(s).toLocaleDateString(undefined, o);
const fmtTime = t => { if (!t) return ''; const [h, m] = t.split(':').map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
const nowHM = () => { const n = new Date(); return `${pad(n.getHours())}:${pad(n.getMinutes())}`; };
function relDay(s) {
  const n = daysUntil(s);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  if (n > 1 && n < 7) return fmtDate(s, { weekday: 'long' });
  return fmtDate(s);
}

const ICON = {
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/></svg>',
  event: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16"/></svg>',
  exam: '<svg viewBox="0 0 24 24"><path d="M12 4l9 4.5-9 4.5-9-4.5z"/><path d="M7 11v4.5c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V11"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
  reset: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5"/><path d="M4 4v4.5h4.5"/></svg>',
  skip: '<svg viewBox="0 0 24 24"><path d="M6 5.5v13l9-6.5zM18 5.5v13"/></svg>',
  left: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>',
  off: '<svg viewBox="0 0 24 24"><path d="M4 9.5v5h3.5L12 19V5L7.5 9.5zM16 9.5l5 5M21 9.5l-5 5"/></svg>',
  rain: '<svg viewBox="0 0 24 24"><path d="M7 15a4.5 4.5 0 1 1 1.3-8.8A5.5 5.5 0 0 1 18.5 9 3.5 3.5 0 0 1 18 15.5"/><path d="M9 18l-1 2.5M13 17l-1 3M17 18l-1 2.5"/></svg>',
  waves: '<svg viewBox="0 0 24 24"><path d="M2.5 9c2.4 0 2.4-2 4.75-2S9.6 9 12 9s2.4-2 4.75-2S19.1 9 21.5 9M2.5 14c2.4 0 2.4-2 4.75-2S9.6 14 12 14s2.4-2 4.75-2 2.35 2 4.75 2M2.5 19c2.4 0 2.4-2 4.75-2S9.6 19 12 19s2.4-2 4.75-2 2.35 2 4.75 2"/></svg>',
  brown: '<svg viewBox="0 0 24 24"><path d="M3 12h2l2-5 3 10 3-12 3 12 2-5h3"/></svg>',
  stones: '<svg class="stones" viewBox="0 0 64 64"><ellipse cx="32" cy="49" rx="21" ry="9.5" fill="var(--accent)" stroke="none"/><ellipse cx="30.5" cy="34.5" rx="15" ry="7.5" fill="var(--lav)" stroke="none"/><ellipse cx="33" cy="22.5" rx="9.5" ry="5.6" fill="var(--peach)" stroke="none"/></svg>',
};

/* ---------- state ---------- */
let KEY = 'pebble:v1'; // set per account at sign-in
const PALETTE = ['#7FA99B', '#A8A4CE', '#E9B98F', '#D49A9A', '#9DB8D3', '#C9C27F', '#B5A1C9', '#8FC1C4'];
const DEFAULT_SUBJECTS = [
  { id: 's1', name: 'Maths', color: '#7FA99B' },
  { id: 's2', name: 'English', color: '#A8A4CE' },
  { id: 's3', name: 'Science', color: '#E9B98F' },
  { id: 's4', name: 'History', color: '#D49A9A' },
  { id: 's5', name: 'Personal', color: '#9DB8D3' },
];

function defaultState() {
  return {
    items: [], subjects: DEFAULT_SUBJECTS.map(s => ({ ...s })), decks: [], focusLog: [], notified: {},
    firstRun: false,
    settings: {
      name: '', theme: 'auto',
      notify: false, digestTime: '19:00', lastDigest: '',
      morning: false, morningTime: '08:00', lastMorning: '',
      focusLen: 25, breakLen: 5, volume: 0.5,
    },
  };
}
function mk(o = {}) {
  return { id: uid(), kind: 'task', title: '', date: todayStr(), time: '', subjectId: null, priority: 'normal', done: false, doneAt: null, notes: '', remind: false, created: Date.now(), ...o };
}
function mkCard(q, a) { return { id: uid(), q, a, box: 0, due: todayStr() }; }

function seed(s) {
  const d = n => ymd(addDays(new Date(), n));
  s.items = [
    mk({ title: 'Welcome to Pebble — tick me off', date: d(0) }),
    mk({ title: 'Review chapter 4 notes', date: d(0), time: '16:00', subjectId: 's3' }),
    mk({ title: 'Plan essay introduction', date: d(1), time: '15:30', subjectId: 's2', priority: 'high' }),
    mk({ title: 'Study group', date: d(3), time: '17:00', subjectId: 's1', kind: 'event' }),
    mk({ title: 'Maths mock exam', date: d(9), time: '09:00', subjectId: 's1', kind: 'exam' }),
  ];
  s.decks = [{
    id: uid(), name: 'Example: Biology', color: PALETTE[0], cards: [
      mkCard('What is the powerhouse of the cell?', 'The mitochondria'),
      mkCard('What does DNA stand for?', 'Deoxyribonucleic acid'),
      mkCard('Where in a plant cell does photosynthesis happen?', 'In the chloroplasts'),
      mkCard('What do red blood cells carry?', 'Oxygen, bound to haemoglobin'),
    ],
  }];
  s.firstRun = true;
  return s;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) { const s = seed(defaultState()); localStorage.setItem(KEY, JSON.stringify(s)); return s; }
    const s = JSON.parse(raw), d = defaultState();
    return { ...d, ...s, settings: { ...d.settings, ...(s.settings || {}) } };
  } catch (e) { return seed(defaultState()); }
}
let S = null; // loaded after sign-in (see startPebble)
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Could not save — storage is full or blocked'); } }

const getItem = id => S.items.find(i => i.id === id);
const subj = id => S.subjects.find(s => s.id === id);
const subjColor = id => subj(id)?.color || 'var(--accent)';
const prioRank = { high: 0, normal: 1, low: 2 };
const byList = (a, b) => (a.done - b.done) || a.date.localeCompare(b.date) || (a.time || '99:99').localeCompare(b.time || '99:99') || (prioRank[a.priority] - prioRank[b.priority]);

/* ---------- toast ---------- */
let toastTimer;
function toast(msg, action) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button class="toast-btn">${esc(action.label)}</button>` : ''}`;
  if (action) $('.toast-btn', t).onclick = () => { action.fn(); t.classList.remove('show'); };
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), action ? 5000 : 2600);
}

/* ---------- item actions ---------- */
function toggleItem(id, li) {
  const i = getItem(id); if (!i) return;
  i.done = !i.done; i.doneAt = i.done ? todayStr() : null; save();
  if (li) { li.classList.toggle('done', i.done); if (i.done) li.classList.add('just-done'); }
  if (i.done) toast(pick(['Nice one ✨', 'Done. Breathe out.', 'One pebble lighter.', 'Lovely work.', 'Steady progress.']));
  setTimeout(render, li ? 450 : 0);
}
function deleteItem(id) {
  const idx = S.items.findIndex(i => i.id === id); if (idx < 0) return;
  const [it] = S.items.splice(idx, 1); save(); closeModal(); render();
  toast('Deleted', { label: 'Undo', fn: () => { S.items.splice(idx, 0, it); save(); render(); } });
}

function itemRow(i, { showDate = false } = {}) {
  const s = subj(i.subjectId);
  const overdue = i.kind === 'task' && !i.done && i.date < todayStr();
  const lead = i.kind === 'task'
    ? `<button class="check" data-ia="toggle" aria-label="${i.done ? 'Mark not done' : 'Mark done'}">${ICON.check}</button>`
    : `<span class="kind-badge" title="${cap(i.kind)}">${i.kind === 'exam' ? ICON.exam : ICON.event}</span>`;
  const meta = [
    overdue ? `<span class="overdue-label">${relDay(i.date)}</span>` : (showDate ? `<span>${relDay(i.date)}</span>` : ''),
    i.time ? `<span>${fmtTime(i.time)}</span>` : '',
    i.kind !== 'task' ? `<span>${cap(i.kind)}</span>` : '',
    s ? `<span class="tag" style="--c:${s.color}">${esc(s.name)}</span>` : '',
    i.priority === 'high' ? '<span class="flag">High</span>' : '',
    i.remind ? `<span title="Reminder on" style="display:inline-flex">${ICON.bell.replace('<svg', '<svg style="width:13px;height:13px"')}</span>` : '',
  ].join('');
  return `<li class="item kind-${i.kind} pri-${i.priority} ${i.done ? 'done' : ''}" data-id="${i.id}" draggable="true">
    ${lead}
    <div class="item-body" data-ia="edit" tabindex="0" role="button"><span class="item-title">${esc(i.title)}</span><span class="item-meta">${meta}</span></div>
    <button class="icon-btn" data-ia="delete" aria-label="Delete">${ICON.x}</button>
  </li>`;
}
const emptyHTML = msg => `<li class="empty">${ICON.stones}${esc(msg)}</li>`;

/* ---------- quick add (natural language) ---------- */
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
function parseQuick(text, baseDate) {
  let t = ' ' + text + ' ';
  let date = baseDate || todayStr(), time = '', subjectId = null, priority = 'normal', kind = 'task';

  t = t.replace(/#([\w-]+)/g, (m, n) => {
    const s = S.subjects.find(s => s.name.toLowerCase().replace(/\s+/g, '') .startsWith(n.toLowerCase()));
    if (s) { subjectId = s.id; return ' '; }
    return m;
  });
  if (/(^|\s)(!high|!!)(?=\s)/i.test(t)) { priority = 'high'; t = t.replace(/(^|\s)(!high|!!)(?=\s)/ig, ' '); }
  if (/(^|\s)!low(?=\s)/i.test(t)) { priority = 'low'; t = t.replace(/(^|\s)!low(?=\s)/ig, ' '); }
  if (/\bexam\b/i.test(t)) kind = 'exam';
  else if (/\b(lesson|lecture|class|meeting|practice|club)\b/i.test(t) && !/\b(revise|review|homework|prep|prepare)\b/i.test(t)) kind = 'event';

  const tm = t.match(/\b(?:at\s+)?(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)\b/i) || t.match(/\b(?:at\s+)?([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
  if (tm) {
    let h = +tm[1], m = +(tm[2] || 0); const ap = (tm[3] || '').toLowerCase();
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    if (h < 24 && m < 60) { time = `${pad(h)}:${pad(m)}`; t = t.replace(tm[0], ' '); }
  }

  const base = baseDate ? parseYMD(baseDate) : new Date();
  let dm;
  if ((dm = t.match(/\b(?:on\s+|by\s+|due\s+)?(today|tonight)\b/i))) { date = todayStr(); t = t.replace(dm[0], ' '); }
  else if ((dm = t.match(/\b(?:on\s+|by\s+|due\s+)?(tomorrow|tmrw|tmr)\b/i))) { date = tomorrowStr(); t = t.replace(dm[0], ' '); }
  else if ((dm = t.match(/\bin\s+(\d{1,3})\s+(day|days|week|weeks)\b/i))) {
    const n = +dm[1] * (/week/i.test(dm[2]) ? 7 : 1); date = ymd(addDays(new Date(), n)); t = t.replace(dm[0], ' ');
  }
  else if ((dm = t.match(/\b(?:on\s+|by\s+|due\s+)?(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri)\b/i))) {
    const name = dm[2].toLowerCase(); const target = WEEKDAYS.findIndex(w => w.startsWith(name.slice(0, 3)));
    const now = new Date(); let diff = (target - now.getDay() + 7) % 7; if (diff === 0) diff = 7; if (dm[1]) diff += diff < 7 ? 7 : 0;
    date = ymd(addDays(now, diff)); t = t.replace(dm[0], ' ');
  }
  else if ((dm = t.match(/\b(?:on\s+|by\s+|due\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) {
    const day = +dm[1], mon = +dm[2] - 1; let yr = dm[3] ? +dm[3] : new Date().getFullYear(); if (yr < 100) yr += 2000;
    let d = new Date(yr, mon, day);
    if (!dm[3] && d < parseYMD(todayStr())) d = new Date(yr + 1, mon, day);
    if (d.getMonth() === mon) { date = ymd(d); t = t.replace(dm[0], ' '); }
  }
  void base;
  const title = t.replace(/\s+(on|at|by|due|for)\s*$/i, '').replace(/\s{2,}/g, ' ').trim();
  return { title, date, time, subjectId, priority, kind };
}
function parseChips(p) {
  const s = subj(p.subjectId);
  return [
    `<span class="chip">${relDay(p.date)}</span>`,
    p.time ? `<span class="chip">${fmtTime(p.time)}</span>` : '',
    p.kind !== 'task' ? `<span class="chip">${cap(p.kind)}</span>` : '',
    s ? `<span class="chip c" style="--c:${s.color}">${esc(s.name)}</span>` : '',
    p.priority !== 'normal' ? `<span class="chip">${cap(p.priority)} priority</span>` : '',
  ].join('');
}
function quickAddHTML(placeholder) {
  return `<div class="quick-add">
    <div class="qa-row"><input class="qa-input" placeholder="${esc(placeholder)}" aria-label="Quick add" autocomplete="off"><button class="btn primary qa-btn">Add</button></div>
    <div class="qa-preview"></div></div>`;
}
function bindQuickAdd(root, baseDate) {
  const inp = $('.qa-input', root), prev = $('.qa-preview', root), btn = $('.qa-btn', root);
  if (!inp) return;
  const update = () => { const v = inp.value.trim(); prev.innerHTML = v ? parseChips(parseQuick(v, baseDate)) : ''; };
  const add = () => {
    const v = inp.value.trim(); if (!v) { inp.focus(); return; }
    const p = parseQuick(v, baseDate);
    if (!p.title) { toast('Give it a name first'); return; }
    S.items.push(mk(p)); save();
    toast(`Added to ${relDay(p.date).toLowerCase() === 'today' ? 'today' : relDay(p.date)}`);
    render();
    const again = $('.qa-input', $('#view-' + view)); if (again) again.focus();
  };
  inp.addEventListener('input', update);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
  btn.addEventListener('click', add);
}

/* ---------- router ---------- */
const VIEWS = ['today', 'calendar', 'tasks', 'focus', 'cards', 'breathe', 'settings'];
let view = 'today';
function go(v) {
  if (!VIEWS.includes(v)) v = 'today';
  if (view === 'breathe' && v !== 'breathe') breatheStop();
  view = v;
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  $$('.view').forEach(s => { s.hidden = s.id !== 'view-' + v; });
  if (location.hash.slice(1) !== v) history.replaceState(null, '', '#' + v);
  render();
  window.scrollTo({ top: 0 });
}
function render() {
  ({ today: renderToday, calendar: renderCalendar, tasks: renderTasks, focus: renderFocus, cards: renderCards, breathe: renderBreathe, settings: renderSettings })[view]();
}

/* =========================================================
   TODAY
   ========================================================= */
const THOUGHTS = [
  'Small steps still move you forward.',
  'You don\'t have to do it all today. Just the next thing.',
  'Rest is part of the work, not a break from it.',
  'Progress, not perfection.',
  'A tidy plan makes a quiet mind.',
  'Start where you are. Use what you have.',
  'One page, one problem, one pebble at a time.',
  'Be as kind to yourself as you are to your friends.',
  'Focus is a muscle — every session makes it stronger.',
  'Done is lighter than perfect.',
];
function greeting() { const h = new Date().getHours(); return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
function gentleLine(n) {
  if (n === 0) return 'Nothing left for today. Rest counts as progress too.';
  if (n === 1) return 'Just one thing left today. You\'ve got this.';
  return `${n} things left today. One pebble at a time.`;
}
function focusByDay(n = 7) {
  const out = [];
  for (let k = n - 1; k >= 0; k--) {
    const d = ymd(addDays(new Date(), -k));
    out.push({ d, m: S.focusLog.filter(f => f.date === d).reduce((a, f) => a + f.minutes, 0) });
  }
  return out;
}
function calcStreak() {
  const active = new Set([...S.focusLog.map(f => f.date), ...S.items.filter(i => i.doneAt).map(i => i.doneAt)]);
  let d = new Date(); if (!active.has(ymd(d))) d = addDays(d, -1);
  let n = 0; while (active.has(ymd(d))) { n++; d = addDays(d, -1); }
  return n;
}

function renderToday() {
  const el = $('#view-today'), t = todayStr(), tm = tomorrowStr();
  const todays = S.items.filter(i => i.date === t).sort(byList);
  const overdue = S.items.filter(i => i.kind === 'task' && !i.done && i.date < t).sort(byList);
  const tomorrows = S.items.filter(i => i.date === tm).sort(byList);
  const exams = S.items.filter(i => i.kind === 'exam' && i.date >= t).sort(byList).slice(0, 4);
  const tasksToday = todays.filter(i => i.kind === 'task');
  const doneToday = tasksToday.filter(i => i.done).length;
  const left = tasksToday.length - doneToday + overdue.length;
  const week = focusByDay(7), maxM = Math.max(30, ...week.map(w => w.m));
  const weekMin = week.reduce((a, w) => a + w.m, 0);
  const weekStart = ymd(addDays(new Date(), -6));
  const doneWeek = S.items.filter(i => i.doneAt && i.doneAt >= weekStart).length;
  const thought = THOUGHTS[(parseYMD(t).getDate() + parseYMD(t).getMonth()) % THOUGHTS.length];
  const pct = tasksToday.length ? Math.round(doneToday / tasksToday.length * 100) : 0;

  el.innerHTML = `
    <header class="page-head">
      <p class="eyebrow">${fmtDate(t, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      <h1>${greeting()}${S.settings.name ? ', ' + esc(S.settings.name) : ''}.</h1>
      <p class="sub">${gentleLine(left)}</p>
    </header>
    ${S.firstRun ? `<div class="card welcome"><img src="assets/logo.svg" alt=""><div class="grow"><h3>Welcome to Pebble</h3>
      <p>Type naturally to add things — <b>"History essay friday 4pm #history !high"</b>. Turn on reminders in Settings to get a heads-up about tomorrow every evening. Everything stays private on this device.</p></div>
      <button class="icon-btn" id="dismissWelcome" aria-label="Dismiss">${ICON.x}</button></div>` : ''}
    ${quickAddHTML('Add something… try "Revise algebra tomorrow 5pm #maths"')}
    <div class="grid today-grid">
      <section class="card">
        <div class="card-head"><h2>Today</h2><span class="pill">${doneToday}/${tasksToday.length} done</span></div>
        <div class="progress"><span style="width:${pct}%"></span></div>
        <ul class="list">
          ${overdue.length ? `<li class="group-label danger">Carried over</li>${overdue.map(i => itemRow(i)).join('')}<li class="group-label">Today</li>` : ''}
          ${todays.map(i => itemRow(i)).join('') || emptyHTML('A clear day. Add something above, or simply enjoy it.')}
        </ul>
      </section>
      <div class="stack">
        <section class="card tomorrow">
          <div class="card-head"><h2>Tomorrow</h2>
            <button class="bell-btn ${S.settings.notify ? 'on' : ''}" id="bellBtn">${ICON.bell}${S.settings.notify ? 'Heads-up at ' + fmtTime(S.settings.digestTime) : 'Remind me'}</button></div>
          <ul class="list">${tomorrows.map(i => itemRow(i)).join('') || emptyHTML('Nothing planned for tomorrow yet.')}</ul>
        </section>
        <section class="card">
          <div class="card-head"><h2>Coming up</h2><span class="pill lav">Exams</span></div>
          ${exams.map(e => { const n = daysUntil(e.date); return `<div class="exam" data-edit="${e.id}">
            <div class="exam-days"><b>${n}</b><small>${n === 1 ? 'day' : 'days'}</small></div>
            <div><div class="item-title">${esc(e.title)}</div><div class="item-meta">${relDay(e.date)}${e.time ? ' · ' + fmtTime(e.time) : ''}</div></div></div>`; }).join('')
            || `<p class="muted" style="margin:0;font-size:14.5px">No exams on the horizon. Add one with the word <b>exam</b> and a date.</p>`}
        </section>
        <section class="card">
          <div class="card-head"><h2>Your week</h2></div>
          <div class="stat-row">
            <div class="stat"><b>${weekMin}</b><span>focus mins</span></div>
            <div class="stat"><b>${doneWeek}</b><span>tasks done</span></div>
            <div class="stat"><b>${calcStreak()}</b><span>day streak</span></div>
          </div>
          <div class="bars">${week.map((w, k) => `<div class="bar ${k === 6 ? 'today' : ''}" title="${w.m} min"><i style="height:${Math.max(4, w.m / maxM * 70)}px"></i><span>${parseYMD(w.d).toLocaleDateString(undefined, { weekday: 'narrow' })}</span></div>`).join('')}</div>
        </section>
      </div>
    </div>
    <p class="thought">“${esc(thought)}”</p>`;

  bindQuickAdd(el);
  $('#bellBtn', el).onclick = () => go('settings');
  const dw = $('#dismissWelcome', el); if (dw) dw.onclick = () => { S.firstRun = false; save(); render(); };
  $$('[data-edit]', el).forEach(x => x.onclick = () => openEditor(getItem(x.dataset.edit)));
}

/* =========================================================
   CALENDAR
   ========================================================= */
const cal = { month: new Date(new Date().getFullYear(), new Date().getMonth(), 1), sel: todayStr() };
function renderCalendar() {
  const el = $('#view-calendar'), m = cal.month, t = todayStr();
  const offset = (m.getDay() + 6) % 7; // Monday first
  const start = addDays(m, -offset);
  const daysInMonth = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
  const cellsNeeded = Math.ceil((offset + daysInMonth) / 7) * 7;
  let cells = '';
  for (let k = 0; k < cellsNeeded; k++) {
    const d = addDays(start, k), ds = ymd(d);
    const items = S.items.filter(i => i.date === ds).sort(byList);
    cells += `<div class="cal-cell ${d.getMonth() !== m.getMonth() ? 'out' : ''} ${ds === t ? 'is-today' : ''} ${ds === cal.sel ? 'is-sel' : ''}" data-date="${ds}" tabindex="0" aria-label="${fmtDate(ds, { weekday: 'long', day: 'numeric', month: 'long' })}, ${items.length} items">
      <span class="cal-num">${d.getDate()}</span>
      <div class="cal-chips">${items.slice(0, 3).map(i => `<div class="cal-chip k-${i.kind} ${i.done ? 'done' : ''}" draggable="true" data-id="${i.id}" style="--c:${subjColor(i.subjectId)}" title="${esc(i.title)}${i.time ? ' · ' + fmtTime(i.time) : ''}">${esc(i.title)}</div>`).join('')}
      ${items.length > 3 ? `<div class="cal-more">+${items.length - 3} more</div>` : ''}</div>
      <div class="cal-dots">${items.slice(0, 4).map(i => `<i style="--c:${subjColor(i.subjectId)}"></i>`).join('')}</div>
    </div>`;
  }
  const selItems = S.items.filter(i => i.date === cal.sel).sort(byList);
  el.innerHTML = `
    <header class="page-head row">
      <div><p class="eyebrow">Calendar</p><h1>${m.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h1></div>
      <div class="head-actions">
        <button class="icon-btn lg" id="calPrev" aria-label="Previous month">${ICON.left}</button>
        <button class="btn" id="calToday">Today</button>
        <button class="icon-btn lg" id="calNext" aria-label="Next month">${ICON.right}</button>
      </div>
    </header>
    <div class="cal-layout">
      <div class="card cal-card">
        <div class="cal-week">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(w => `<span>${w}</span>`).join('')}</div>
        <div class="cal-grid" id="calGrid">${cells}</div>
        <p class="hint">Drag items between days to reschedule · double-click a day to add with details · ← → to change month</p>
      </div>
      <aside class="card day-panel">
        <p class="eyebrow">${relDay(cal.sel)}</p>
        <h2 style="margin-bottom:14px">${fmtDate(cal.sel, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
        ${quickAddHTML('Add to this day…')}
        <ul class="list">${selItems.map(i => itemRow(i)).join('') || emptyHTML('A clear day.')}</ul>
        <button class="btn full" id="calAddDetailed">+ Add with details</button>
      </aside>
    </div>`;

  $('#calPrev', el).onclick = () => shiftMonth(-1);
  $('#calNext', el).onclick = () => shiftMonth(1);
  $('#calToday', el).onclick = () => { const n = new Date(); cal.month = new Date(n.getFullYear(), n.getMonth(), 1); cal.sel = todayStr(); render(); };
  $('#calAddDetailed', el).onclick = () => openEditor(null, { date: cal.sel });
  bindQuickAdd($('.day-panel', el), cal.sel);

  const grid = $('#calGrid', el);
  grid.addEventListener('click', e => {
    const chip = e.target.closest('.cal-chip');
    const cell = e.target.closest('.cal-cell'); if (!cell) return;
    if (chip && window.innerWidth > 820) { cal.sel = cell.dataset.date; openEditor(getItem(chip.dataset.id)); return; }
    cal.sel = cell.dataset.date; render();
  });
  grid.addEventListener('dblclick', e => { const cell = e.target.closest('.cal-cell'); if (cell && !e.target.closest('.cal-chip')) openEditor(null, { date: cell.dataset.date }); });
  grid.addEventListener('keydown', e => { const cell = e.target.closest('.cal-cell'); if (cell && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); cal.sel = cell.dataset.date; render(); } });
  grid.addEventListener('dragover', e => { const cell = e.target.closest('.cal-cell'); if (!cell) return; e.preventDefault(); $$('.cal-cell.drop', grid).forEach(c => c !== cell && c.classList.remove('drop')); cell.classList.add('drop'); });
  grid.addEventListener('dragleave', e => { const cell = e.target.closest('.cal-cell'); if (cell && !cell.contains(e.relatedTarget)) cell.classList.remove('drop'); });
  grid.addEventListener('drop', e => {
    const cell = e.target.closest('.cal-cell'); if (!cell) return; e.preventDefault();
    const it = getItem(e.dataTransfer.getData('text/plain')); if (!it) return;
    const old = it.date; it.date = cell.dataset.date; save(); cal.sel = it.date;
    const pm = parseYMD(it.date); if (pm.getMonth() !== cal.month.getMonth()) cal.month = new Date(pm.getFullYear(), pm.getMonth(), 1);
    render();
    if (old !== it.date) toast(`Moved to ${relDay(it.date)}`, { label: 'Undo', fn: () => { it.date = old; save(); render(); } });
  });
}
function shiftMonth(n) { cal.month = new Date(cal.month.getFullYear(), cal.month.getMonth() + n, 1); render(); }

/* =========================================================
   TO-DO LIST
   ========================================================= */
let taskFilter = 'upcoming', taskSearch = '';
function taskSets() {
  const t = todayStr();
  return {
    upcoming: S.items.filter(i => !i.done && (i.date >= t || i.kind === 'task')),
    today: S.items.filter(i => i.date === t || (i.kind === 'task' && !i.done && i.date < t)),
    overdue: S.items.filter(i => i.kind === 'task' && !i.done && i.date < t),
    done: S.items.filter(i => i.done),
    all: S.items.slice(),
  };
}
function renderTasks() {
  const el = $('#view-tasks'), sets = taskSets();
  const labels = { upcoming: 'Upcoming', today: 'Today', overdue: 'Overdue', done: 'Done', all: 'All' };
  el.innerHTML = `
    <header class="page-head"><p class="eyebrow">To-do</p><h1>Everything, gently sorted</h1></header>
    ${quickAddHTML('Add a task… "Maths homework thu #maths !high"')}
    <div class="toolbar">
      <div class="tabs" role="tablist">${Object.keys(labels).map(k => `<button role="tab" data-f="${k}" class="${taskFilter === k ? 'on' : ''}">${labels[k]}<span class="n">${sets[k].length}</span></button>`).join('')}</div>
      <label class="search">${ICON.search}<input id="taskSearch" placeholder="Search" value="${esc(taskSearch)}"></label>
    </div>
    <section class="card"><ul class="list" id="taskList"></ul></section>`;
  bindQuickAdd(el);
  $$('.tabs button', el).forEach(b => b.onclick = () => { taskFilter = b.dataset.f; renderTasks(); });
  $('#taskSearch', el).addEventListener('input', e => { taskSearch = e.target.value; renderTaskList(); });
  renderTaskList();
}
function renderTaskList() {
  const list = $('#taskList'); if (!list) return;
  const t = todayStr(), q = taskSearch.trim().toLowerCase();
  let items = taskSets()[taskFilter];
  if (q) items = items.filter(i => (i.title + ' ' + i.notes + ' ' + (subj(i.subjectId)?.name || '')).toLowerCase().includes(q));
  items.sort(taskFilter === 'done' ? (a, b) => (b.doneAt || '').localeCompare(a.doneAt || '') || b.date.localeCompare(a.date) : byList);
  if (!items.length) {
    list.innerHTML = emptyHTML(q ? 'Nothing matches that search.' : taskFilter === 'overdue' ? 'Nothing overdue. Lovely.' : taskFilter === 'done' ? 'Ticked-off tasks will rest here.' : 'All clear. Add something above when you\'re ready.');
    return;
  }
  let html = '', last = null;
  for (const i of items) {
    const g = taskFilter === 'done' ? 'Completed' : (i.kind === 'task' && !i.done && i.date < t) ? 'Overdue' : relDay(i.date) + (daysUntil(i.date) > 6 ? '' : '');
    if (g !== last) { html += `<li class="group-label ${g === 'Overdue' ? 'danger' : ''}">${g}</li>`; last = g; }
    html += itemRow(i, { showDate: taskFilter === 'done' || g === 'Overdue' });
  }
  list.innerHTML = html;
}

/* =========================================================
   EDITOR MODAL
   ========================================================= */
let lastFocus = null;
function openEditor(item, defaults = {}) {
  const isNew = !item;
  const it = item ? { ...item } : mk({ date: todayStr(), ...defaults });
  lastFocus = document.activeElement;
  const m = $('#modal');
  const seg = (name, opts) => `<div class="seg full" data-name="${name}">${opts.map(([v, l]) => `<button type="button" data-v="${v}" class="${it[name] === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  m.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="edTitle">
    <div class="card-head"><h2 id="edTitle">${isNew ? 'Add something' : 'Edit'}</h2><button class="icon-btn" data-close aria-label="Close">${ICON.x}</button></div>
    <form id="edForm" autocomplete="off">
      <label class="field"><span>Title</span><input name="title" required maxlength="140" value="${esc(it.title)}" placeholder="What's the plan?"></label>
      <div class="field"><span>Type</span>${seg('kind', [['task', 'Task'], ['event', 'Event / class'], ['exam', 'Exam']])}</div>
      <div class="row2">
        <label class="field"><span>Date</span><input type="date" name="date" value="${it.date}" required></label>
        <label class="field"><span>Time <em>(optional)</em></span><input type="time" name="time" value="${it.time}"></label>
      </div>
      <div class="row2">
        <label class="field"><span>Subject</span><select name="subjectId"><option value="">None</option>${S.subjects.map(s => `<option value="${s.id}" ${s.id === it.subjectId ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
        <div class="field"><span>Priority</span>${seg('priority', [['low', 'Low'], ['normal', 'Normal'], ['high', 'High']])}</div>
      </div>
      <label class="field"><span>Notes</span><textarea name="notes" rows="3" placeholder="Pages, links, anything useful…">${esc(it.notes)}</textarea></label>
      <label class="switch-row"><input type="checkbox" name="remind" ${it.remind ? 'checked' : ''}><span class="switch"></span><span>Remind me on the day <em>— 15 min before, or at your morning time if there's no time set</em></span></label>
      <div class="modal-actions">
        ${isNew ? '' : '<button type="button" class="btn ghost danger" id="edDel">Delete</button>'}
        <span class="grow"></span>
        <button type="button" class="btn ghost" data-close>Cancel</button>
        <button type="submit" class="btn primary">${isNew ? 'Add' : 'Save'}</button>
      </div>
    </form></div>`;
  m.classList.add('open'); m.setAttribute('aria-hidden', 'false');
  $$('.seg', m).forEach(sg => sg.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('button', sg).forEach(x => x.classList.toggle('on', x === b)); it[sg.dataset.name] = b.dataset.v;
  }));
  $$('[data-close]', m).forEach(b => b.onclick = closeModal);
  const del = $('#edDel', m); if (del) del.onclick = () => deleteItem(it.id);
  $('#edForm', m).onsubmit = e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const data = {
      title: f.get('title').trim(), date: f.get('date'), time: f.get('time') || '',
      subjectId: f.get('subjectId') || null, notes: f.get('notes').trim(), remind: !!f.get('remind'),
      kind: it.kind, priority: it.priority,
    };
    if (!data.title || !data.date) return;
    if (isNew) S.items.push(mk(data)); else Object.assign(getItem(it.id), data);
    if (data.remind && S.settings.notify === false) setTimeout(() => toast('Tip: switch on notifications in Settings for reminders'), 900);
    save(); closeModal(); render();
    if (isNew) toast(`Added to ${relDay(data.date)}`);
  };
  setTimeout(() => $('input[name=title]', m).focus(), 60);
}
function closeModal() {
  const m = $('#modal'); if (!m.classList.contains('open')) return;
  m.classList.remove('open'); m.setAttribute('aria-hidden', 'true');
  setTimeout(() => { if (!m.classList.contains('open')) m.innerHTML = ''; }, 300);
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
}

/* =========================================================
   FOCUS TIMER + AMBIENT SOUND
   ========================================================= */
const F = { mode: 'focus', running: false, endAt: 0, remaining: null, taskId: '' };
const fTotal = () => (F.mode === 'focus' ? S.settings.focusLen : S.settings.breakLen) * 60;
const fRemaining = () => F.running ? Math.max(0, Math.ceil((F.endAt - Date.now()) / 1000)) : (F.remaining ?? fTotal());
const mmss = s => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
function fStart() { ensureAudio(); F.endAt = Date.now() + fRemaining() * 1000; F.running = true; F.remaining = null; updateFocus(); }
function fPause() { F.remaining = fRemaining(); F.running = false; updateFocus(); }
function fReset() { F.running = false; F.remaining = null; updateFocus(); }
function fSetMode(m) { F.mode = m; F.running = false; F.remaining = null; if (view === 'focus') renderFocus(); updateFocus(); }
function fComplete() {
  const wasFocus = F.mode === 'focus';
  F.running = false; F.remaining = null; chime();
  if (wasFocus) {
    S.focusLog.push({ date: todayStr(), minutes: S.settings.focusLen, taskId: F.taskId || null }); save();
    sendNotification('Focus session complete', `Lovely. Take a ${S.settings.breakLen}-minute break — stretch, sip some water.`, 'pebble-focus');
    toast('Session complete — break time');
    F.mode = 'break'; if (view === 'focus') renderFocus(); fStart();
  } else {
    sendNotification('Break over', 'Ready for another focus session when you are.', 'pebble-focus');
    toast('Break over');
    F.mode = 'focus'; if (view === 'focus') renderFocus(); updateFocus();
  }
}
function updateFocus() {
  const rem = fRemaining(), total = fTotal();
  const badge = $('#focusBadge');
  badge.hidden = !F.running && F.remaining == null; badge.textContent = mmss(rem);
  document.title = F.running ? `${mmss(rem)} · ${F.mode === 'focus' ? 'Focus' : 'Break'} — Pebble` : 'Pebble — plan calmly';
  if (view !== 'focus') return;
  const el = $('#view-focus');
  const time = $('#fTime', el); if (!time) return;
  time.textContent = mmss(rem);
  const C = 2 * Math.PI * 96;
  const fg = $('#ringFg', el); fg.style.strokeDasharray = C; fg.style.strokeDashoffset = C * (1 - rem / total);
  $('#fToggle', el).textContent = F.running ? 'Pause' : (F.remaining != null ? 'Resume' : 'Start');
  $('.focus-card', el).classList.toggle('running', F.running);
  $('.focus-card', el).classList.toggle('mode-break', F.mode === 'break');
  $$('[data-len]', el).forEach(s => s.disabled = F.running);
}
function renderFocus() {
  const el = $('#view-focus'), t = todayStr();
  const tasks = S.items.filter(i => i.kind === 'task' && !i.done && i.date <= tomorrowStr()).sort(byList);
  const todayLog = S.focusLog.filter(f => f.date === t);
  const mins = todayLog.reduce((a, f) => a + f.minutes, 0);
  const opt = (arr, cur) => arr.map(v => `<option value="${v}" ${v === cur ? 'selected' : ''}>${v} min</option>`).join('');
  el.innerHTML = `
    <header class="page-head"><p class="eyebrow">Focus</p><h1>One thing, fully.</h1><p class="sub">Work in calm, timed sessions with short breaks in between.</p></header>
    <div class="focus-layout">
      <section class="card focus-card">
        <div class="seg"><button data-mode="focus" class="${F.mode === 'focus' ? 'on' : ''}">Focus</button><button data-mode="break" class="${F.mode === 'break' ? 'on' : ''}">Break</button></div>
        <div class="ring-wrap"><svg class="ring" viewBox="0 0 220 220"><circle class="ring-bg" cx="110" cy="110" r="96"/><circle class="ring-fg" id="ringFg" cx="110" cy="110" r="96"/></svg>
          <div class="ring-center"><div class="time" id="fTime">00:00</div><div class="ring-label">${F.mode === 'focus' ? 'Focus' : 'Break'}</div></div></div>
        <div class="focus-controls">
          <button class="icon-btn lg" id="fReset" title="Reset" aria-label="Reset">${ICON.reset}</button>
          <button class="btn primary big" id="fToggle">Start</button>
          <button class="icon-btn lg" id="fSkip" title="Skip to ${F.mode === 'focus' ? 'break' : 'focus'}" aria-label="Skip">${ICON.skip}</button>
        </div>
        <label class="field inline" style="width:min(420px,100%)"><span>Working on</span>
          <select id="fTask"><option value="">Just focusing</option>${tasks.map(i => `<option value="${i.id}" ${i.id === F.taskId ? 'selected' : ''}>${esc(i.title)}</option>`).join('')}</select></label>
        <p class="kbd"><kbd>Space</kbd> start / pause</p>
      </section>
      <div class="focus-side">
        <section class="card"><h2>Session length</h2>
          <div class="row2">
            <label class="field" style="margin:0"><span>Focus</span><select data-len="focusLen">${opt([15, 20, 25, 30, 40, 45, 50, 60, 90], S.settings.focusLen)}</select></label>
            <label class="field" style="margin:0"><span>Break</span><select data-len="breakLen">${opt([3, 5, 10, 15, 20], S.settings.breakLen)}</select></label>
          </div>
        </section>
        <section class="card"><h2>Ambient sound</h2>
          <div class="sound-grid">${[['none', 'Off', ICON.off], ['rain', 'Rain', ICON.rain], ['waves', 'Waves', ICON.waves], ['brown', 'Deep', ICON.brown]].map(([k, l, ic]) => `<button class="sound-btn ${soundKind === k ? 'on' : ''}" data-sound="${k}">${ic}${l}</button>`).join('')}</div>
          <input type="range" id="vol" min="0" max="1" step="0.01" value="${S.settings.volume}" aria-label="Volume">
        </section>
        <section class="card"><h2>Today</h2>
          <p class="big-num">${mins} <small>minutes focused · ${todayLog.length} session${todayLog.length === 1 ? '' : 's'}</small></p>
          <div class="pebbles">${todayLog.map(() => '<i></i>').join('')}</div>
          ${todayLog.length ? '' : '<p class="muted" style="margin:6px 0 0;font-size:14px">Each finished session adds a pebble here.</p>'}
        </section>
      </div>
    </div>`;
  $$('[data-mode]', el).forEach(b => b.onclick = () => fSetMode(b.dataset.mode));
  $('#fToggle', el).onclick = () => F.running ? fPause() : fStart();
  $('#fReset', el).onclick = fReset;
  $('#fSkip', el).onclick = () => fSetMode(F.mode === 'focus' ? 'break' : 'focus');
  $('#fTask', el).onchange = e => { F.taskId = e.target.value; };
  $$('[data-len]', el).forEach(s => s.onchange = () => { S.settings[s.dataset.len] = +s.value; save(); F.remaining = null; updateFocus(); });
  $$('[data-sound]', el).forEach(b => b.onclick = () => { playSound(b.dataset.sound); $$('[data-sound]', el).forEach(x => x.classList.toggle('on', x === b)); });
  $('#vol', el).oninput = e => { S.settings.volume = +e.target.value; if (snd) snd.vol.gain.value = S.settings.volume; };
  $('#vol', el).onchange = save;
  updateFocus();
}

/* --- Web Audio: generated sounds, no files needed --- */
let AC = null, snd = null, soundKind = 'none';
function ensureAudio() {
  try {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
  } catch (e) { /* audio not available */ }
  return AC;
}
const noiseCache = {};
function noiseBuffer(type) {
  if (noiseCache[type]) return noiseCache[type];
  const len = AC.sampleRate * 6, buf = AC.createBuffer(2, len, AC.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let last = 0, b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else {
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
      }
    }
    // soften the loop seam
    const fade = 2000; for (let i = 0; i < fade; i++) { const g = i / fade; d[i] *= g; d[len - 1 - i] *= g; }
  }
  return (noiseCache[type] = buf);
}
function playSound(kind) {
  stopSound(); soundKind = kind;
  if (kind === 'none' || !ensureAudio()) return;
  const src = AC.createBufferSource(); src.buffer = noiseBuffer(kind === 'rain' ? 'pink' : 'brown'); src.loop = true;
  let node = src, extra = null;
  const filt = (type, f) => { const b = AC.createBiquadFilter(); b.type = type; b.frequency.value = f; node.connect(b); node = b; };
  if (kind === 'rain') { filt('highpass', 400); filt('lowpass', 6500); }
  if (kind === 'brown') { filt('lowpass', 900); }
  if (kind === 'waves') {
    filt('lowpass', 650);
    const wg = AC.createGain(); wg.gain.value = 0.5;
    const lfo = AC.createOscillator(); lfo.frequency.value = 0.085;
    const depth = AC.createGain(); depth.gain.value = 0.45;
    lfo.connect(depth); depth.connect(wg.gain); lfo.start();
    node.connect(wg); node = wg; extra = lfo;
  }
  const fade = AC.createGain(), vol = AC.createGain();
  vol.gain.value = S.settings.volume;
  fade.gain.setValueAtTime(0, AC.currentTime); fade.gain.linearRampToValueAtTime(1, AC.currentTime + 1.5);
  node.connect(fade); fade.connect(vol); vol.connect(AC.destination); src.start();
  snd = { src, fade, vol, extra };
}
function stopSound() {
  if (!snd) return; const s = snd; snd = null; soundKind = 'none';
  try {
    const t = AC.currentTime; s.fade.gain.cancelScheduledValues(t); s.fade.gain.setValueAtTime(s.fade.gain.value, t); s.fade.gain.linearRampToValueAtTime(0, t + 0.6);
    setTimeout(() => { try { s.src.stop(); s.extra && s.extra.stop(); } catch (e) { } }, 700);
  } catch (e) { }
}
function chime() {
  if (!ensureAudio()) return;
  [523.25, 659.25, 783.99].forEach((f, k) => {
    const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.value = f;
    const t0 = AC.currentTime + k * 0.2;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.2);
    o.connect(g); g.connect(AC.destination); o.start(t0); o.stop(t0 + 2.3);
  });
}

/* =========================================================
   FLASHCARDS (simple spaced repetition)
   ========================================================= */
const INTERVALS = [0, 1, 3, 7, 14, 30, 60];
const CU = { deck: null, study: null };
const getDeck = id => S.decks.find(d => d.id === id);
const dueCards = d => d.cards.filter(c => c.due <= todayStr());

function renderCards() {
  const el = $('#view-cards');
  if (CU.study) return renderStudy(el);
  const deck = CU.deck && getDeck(CU.deck);
  if (!deck) {
    CU.deck = null;
    el.innerHTML = `
      <header class="page-head"><p class="eyebrow">Flashcards</p><h1>Remember more, cram less</h1><p class="sub">Cards come back just before you'd forget them — little and often.</p></header>
      <div class="deck-grid">
        ${S.decks.map(d => { const due = dueCards(d).length; return `<div class="card deck" data-deck="${d.id}" style="--c:${d.color || PALETTE[1]}" tabindex="0" role="button">
          <h3>${esc(d.name)}</h3><span class="muted">${d.cards.length} card${d.cards.length === 1 ? '' : 's'}</span>
          <span class="pill ${due ? '' : 'lav'}">${due ? due + ' to review' : 'All caught up'}</span></div>`; }).join('')}
        <form class="card deck new" id="newDeck"><h3 style="font-size:17px">New deck</h3>
          <input class="input" name="name" placeholder="e.g. French vocab" maxlength="60" required>
          <button class="btn primary">Create</button></form>
      </div>`;
    $$('[data-deck]', el).forEach(d => { d.onclick = () => { CU.deck = d.dataset.deck; render(); }; d.onkeydown = e => { if (e.key === 'Enter') d.click(); }; });
    $('#newDeck', el).onsubmit = e => {
      e.preventDefault(); const name = new FormData(e.target).get('name').trim(); if (!name) return;
      const d = { id: uid(), name, color: PALETTE[S.decks.length % PALETTE.length], cards: [] }; S.decks.push(d); save();
      CU.deck = d.id; render(); setTimeout(() => $('#cardQ')?.focus(), 50);
    };
    return;
  }
  const due = dueCards(deck).length;
  el.innerHTML = `
    <header class="page-head row">
      <div><p class="eyebrow"><a href="#cards" id="backDecks" style="color:inherit">← All decks</a></p><h1>${esc(deck.name)}</h1>
      <p class="sub">${deck.cards.length} cards · ${due} due today</p></div>
      <div class="head-actions">
        ${deck.cards.length ? `<button class="btn ${due ? 'primary' : ''}" id="studyBtn">${due ? `Review ${due} card${due === 1 ? '' : 's'}` : 'Practise all anyway'}</button>` : ''}
      </div>
    </header>
    <div class="grid" style="grid-template-columns:1fr">
      <form class="card" id="addCard">
        <h2 style="margin-bottom:12px">Add a card</h2>
        <div class="row2">
          <label class="field"><span>Front — question</span><textarea id="cardQ" name="q" rows="2" required placeholder="e.g. Capital of Japan?"></textarea></label>
          <label class="field"><span>Back — answer</span><textarea name="a" rows="2" required placeholder="Tokyo"></textarea></label>
        </div>
        <div class="btn-row"><button class="btn primary">Add card</button><span class="kbd" style="align-self:center">Tip: <kbd>Ctrl</kbd> + <kbd>Enter</kbd> adds quickly</span></div>
      </form>
      <section class="card">
        <div class="card-head"><h2>Cards</h2><button class="btn ghost danger sm" id="delDeck">Delete deck</button></div>
        <ul class="card-list">${deck.cards.map(c => `<li><span>${esc(c.q)}</span><span class="a">${esc(c.a)}</span>
          <span style="display:flex;gap:10px;align-items:center"><span class="box-dots" title="Memory strength">${INTERVALS.slice(1).map((_, k) => `<i class="${k < c.box ? 'f' : ''}"></i>`).join('')}</span>
          <button class="icon-btn" data-delcard="${c.id}" aria-label="Delete card">${ICON.x}</button></span></li>`).join('') || emptyHTML('No cards yet — add your first one above.')}</ul>
      </section>
    </div>`;
  $('#backDecks', el).onclick = e => { e.preventDefault(); CU.deck = null; render(); };
  const sb = $('#studyBtn', el); if (sb) sb.onclick = () => startStudy(deck, !due);
  const form = $('#addCard', el);
  const addCard = () => {
    const f = new FormData(form), q = f.get('q').trim(), a = f.get('a').trim(); if (!q || !a) return;
    deck.cards.push(mkCard(q, a)); save(); render(); toast('Card added'); setTimeout(() => $('#cardQ')?.focus(), 30);
  };
  form.onsubmit = e => { e.preventDefault(); addCard(); };
  form.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); addCard(); } });
  $$('[data-delcard]', el).forEach(b => b.onclick = () => { deck.cards = deck.cards.filter(c => c.id !== b.dataset.delcard); save(); render(); });
  $('#delDeck', el).onclick = () => {
    if (!confirm(`Delete the deck "${deck.name}" and all its cards?`)) return;
    const idx = S.decks.indexOf(deck); S.decks.splice(idx, 1); CU.deck = null; save(); render();
    toast('Deck deleted', { label: 'Undo', fn: () => { S.decks.splice(idx, 0, deck); save(); render(); } });
  };
}
function startStudy(deck, all) {
  const pool = (all ? deck.cards.slice() : dueCards(deck)).sort(() => Math.random() - 0.5);
  CU.study = { deckId: deck.id, queue: pool.map(c => c.id), i: 0, flipped: false, again: 0, good: 0 };
  render();
}
function renderStudy(el) {
  const st = CU.study, deck = getDeck(st.deckId);
  if (!deck) { CU.study = null; return renderCards(); }
  if (st.i >= st.queue.length) {
    el.innerHTML = `<div class="study" style="padding-top:40px">${ICON.stones.replace('class="stones"', 'class="stones" style="width:70px;height:70px;opacity:1"')}
      <h1>All done for now</h1><p class="sub" style="text-align:center">You reviewed ${st.queue.length} card${st.queue.length === 1 ? '' : 's'}. They'll come back when it's time.</p>
      <button class="btn primary" id="studyDone">Back to deck</button></div>`;
    $('#studyDone', el).onclick = () => { CU.study = null; render(); };
    return;
  }
  const c = deck.cards.find(x => x.id === st.queue[st.i]);
  if (!c) { st.i++; return renderStudy(el); }
  const next = g => { const b = g === 'good' ? Math.min(c.box + 1, INTERVALS.length - 1) : Math.min(c.box + 2, INTERVALS.length - 1); return INTERVALS[b]; };
  const dayLabel = n => n === 1 ? '1 day' : n + ' days';
  el.innerHTML = `<div class="study">
    <div class="study-progress"><div style="display:flex;justify-content:space-between;margin-bottom:8px"><a href="#cards" id="quitStudy" class="muted">← ${esc(deck.name)}</a><span class="muted">${st.i + 1} / ${st.queue.length}</span></div>
      <div class="progress"><span style="width:${st.i / st.queue.length * 100}%"></span></div></div>
    <div class="flip ${st.flipped ? 'flipped' : ''}" id="flip" tabindex="0" role="button" aria-label="Flip card">
      <div class="flip-inner"><div class="face front"><small>Question</small>${esc(c.q)}</div><div class="face back"><small>Answer</small>${esc(c.a)}</div></div></div>
    <div class="grade" id="grade" ${st.flipped ? '' : 'hidden'}>
      <button class="btn" data-g="again">Again<small>today</small></button>
      <button class="btn primary" data-g="good">Got it<small>${dayLabel(next('good'))}</small></button>
      <button class="btn" data-g="easy">Easy<small>${dayLabel(next('easy'))}</small></button>
    </div>
    <p class="kbd" id="flipHint" ${st.flipped ? 'hidden' : ''}>Tap the card or press <kbd>Space</kbd> to flip</p>
    <p class="kbd" ${st.flipped ? '' : 'hidden'} id="gradeHint"><kbd>1</kbd> again · <kbd>2</kbd> got it · <kbd>3</kbd> easy</p>
  </div>`;
  $('#quitStudy', el).onclick = e => { e.preventDefault(); CU.study = null; render(); };
  $('#flip', el).onclick = flipCard;
  $$('[data-g]', el).forEach(b => b.onclick = () => gradeCard(b.dataset.g));
}
function flipCard() {
  const st = CU.study; if (!st) return; st.flipped = !st.flipped;
  $('#flip').classList.toggle('flipped', st.flipped);
  $('#grade').hidden = !st.flipped; $('#flipHint').hidden = st.flipped; $('#gradeHint').hidden = !st.flipped;
}
function gradeCard(g) {
  const st = CU.study; if (!st || !st.flipped) return;
  const deck = getDeck(st.deckId), c = deck.cards.find(x => x.id === st.queue[st.i]);
  if (c) {
    if (g === 'again') { c.box = 0; c.due = todayStr(); st.queue.push(c.id); }
    else { c.box = Math.min(c.box + (g === 'easy' ? 2 : 1), INTERVALS.length - 1); c.due = ymd(addDays(new Date(), INTERVALS[c.box])); }
    save();
  }
  st.i++; st.flipped = false; render();
}

/* =========================================================
   BREATHE
   ========================================================= */
const PATTERNS = {
  calm: { name: 'Gentle', desc: 'In 4 · out 6 — slows everything down', steps: [['in', 4], ['out', 6]] },
  box: { name: 'Box', desc: 'In 4 · hold 4 · out 4 · hold 4 — steady focus', steps: [['in', 4], ['hold', 4], ['out', 4], ['hold', 4]] },
  relax: { name: '4-7-8', desc: 'In 4 · hold 7 · out 8 — for exam nerves & sleep', steps: [['in', 4], ['hold', 7], ['out', 8]] },
};
const B = { pattern: 'calm', running: false, step: 0, cycles: 0, timers: [] };
function renderBreathe() {
  const el = $('#view-breathe'), p = PATTERNS[B.pattern];
  el.innerHTML = `
    <header class="page-head"><p class="eyebrow">Breathe</p><h1>Take a minute</h1><p class="sub">Feeling stressed before an exam, or just need a reset? Follow the circle.</p></header>
    <section class="card breathe-wrap ${B.running ? '' : 'breathe-idle'}">
      <div class="seg">${Object.entries(PATTERNS).map(([k, v]) => `<button data-p="${k}" class="${k === B.pattern ? 'on' : ''}">${v.name}</button>`).join('')}</div>
      <p class="muted" style="margin:-8px 0 0">${p.desc}</p>
      <div class="breathe-stage"><div class="orb" id="orb"></div><div class="breath-text" id="bText">Ready when you are</div></div>
      <button class="btn primary big" id="bToggle">Begin</button>
      <p class="muted" id="bCycles" style="margin:0">Try five slow rounds.</p>
    </section>`;
  $$('[data-p]', el).forEach(b => b.onclick = () => { breatheStop(); B.pattern = b.dataset.p; renderBreathe(); });
  $('#bToggle', el).onclick = () => B.running ? (breatheStop(), renderBreathe()) : breatheStart();
}
function breatheStart() {
  B.running = true; B.step = 0; B.cycles = 0;
  $('#bToggle').textContent = 'Stop'; $('.breathe-wrap').classList.remove('breathe-idle');
  breatheStep();
}
function breatheStep() {
  if (!B.running) return;
  const steps = PATTERNS[B.pattern].steps, [phase, sec] = steps[B.step % steps.length];
  const orb = $('#orb'), txt = $('#bText'); if (!orb) return;
  orb.style.transitionDuration = sec + 's';
  if (phase === 'in') orb.classList.add('big');
  if (phase === 'out') orb.classList.remove('big');
  const label = phase === 'in' ? 'Breathe in' : phase === 'out' ? 'Breathe out' : 'Hold';
  let left = sec;
  txt.innerHTML = `${label}<small>${left}</small>`;
  for (let k = 1; k < sec; k++) B.timers.push(setTimeout(() => { if (B.running) txt.innerHTML = `${label}<small>${sec - k}</small>`; }, k * 1000));
  B.timers.push(setTimeout(() => {
    B.step++;
    if (B.step % steps.length === 0) { B.cycles++; const c = $('#bCycles'); if (c) c.textContent = `${B.cycles} round${B.cycles === 1 ? '' : 's'} complete${B.cycles >= 5 ? ' — beautifully done.' : ''}`; }
    breatheStep();
  }, sec * 1000));
}
function breatheStop() { B.running = false; B.timers.forEach(clearTimeout); B.timers = []; }

/* =========================================================
   SETTINGS
   ========================================================= */
function renderSettings() {
  const el = $('#view-settings'), st = S.settings;
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  el.innerHTML = `
    <header class="page-head"><p class="eyebrow">Settings</p><h1>Make it yours</h1></header>
    <div class="settings-grid">
      <section class="card">
        <h2>You</h2><p class="muted">Used for your greeting. Stays on this device.</p>
        <label class="field"><span>Your name</span><input id="sName" value="${esc(st.name)}" placeholder="e.g. Alex" maxlength="40"></label>
        <div class="field"><span>Theme</span><div class="seg full" id="sTheme">${[['auto', 'Match device'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<button data-v="${v}" class="${st.theme === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      </section>

      <section class="card">
        <h2>Reminders</h2><p class="muted">Get a gentle heads-up about tomorrow's to-do list, and reminders for items you flag.</p>
        <label class="switch-row"><input type="checkbox" id="sNotify" ${st.notify ? 'checked' : ''}><span class="switch"></span><span>Turn on notifications</span></label>
        <div class="row2">
          <label class="field"><span>Evening heads-up for tomorrow</span><input type="time" id="sDigest" value="${st.digestTime}"></label>
          <label class="field"><span>Morning summary <em>(optional)</em></span><input type="time" id="sMorningTime" value="${st.morningTime}" ${st.morning ? '' : 'disabled'}></label>
        </div>
        <label class="switch-row"><input type="checkbox" id="sMorning" ${st.morning ? 'checked' : ''}><span class="switch"></span><span>Also send a morning summary of today</span></label>
        <div class="btn-row"><button class="btn sm" id="sTest">Send a test notification</button><button class="btn sm" id="sIcs">Add to my phone's calendar (.ics)</button></div>
        ${perm === 'denied' ? '<p class="note warn">Notifications are blocked for this site. Allow them in your browser\'s site settings, then switch this on again.</p>' : ''}
        ${perm === 'unsupported' ? '<p class="note warn">This browser doesn\'t support notifications. You\'ll still see the Tomorrow card on the Today page.</p>' : ''}
        <p class="note">Browser notifications arrive while Pebble is open (a pinned tab or installed app works well). For reminders even when it's closed, use <b>Add to my phone's calendar</b> — it exports your upcoming plans with alerts the evening before.</p>
      </section>

      <section class="card">
        <h2>Subjects</h2><p class="muted">Colour-code your work. Use <b>#name</b> when quick-adding.</p>
        <div id="subjList">${S.subjects.map(s => `<div class="subj-row" data-sid="${s.id}"><input type="color" value="${s.color}" aria-label="Colour"><input type="text" class="input" value="${esc(s.name)}" maxlength="30" aria-label="Subject name"><button class="icon-btn" data-delsub aria-label="Remove subject">${ICON.x}</button></div>`).join('')}</div>
        <button class="btn sm" id="addSubj">+ Add subject</button>
      </section>

      <section class="card">
        <h2>Account</h2><p class="muted">Signed in as <b>${esc(ACCOUNT.name)}</b> (@${esc(ACCOUNT.username)}) on this device.</p>
        <form id="pwForm" autocomplete="off">
          <div class="row2">
            <label class="field"><span>Current password</span><input type="password" name="cur" required autocomplete="current-password"></label>
            <label class="field"><span>New password</span><input type="password" name="next" required minlength="6" autocomplete="new-password"></label>
          </div>
          <div class="btn-row"><button class="btn sm">Change password</button><button type="button" class="btn sm" id="sLogout">Sign out</button><button type="button" class="btn sm ghost danger" id="sDelAcc">Delete account</button></div>
        </form>
      </section>

      <section class="card">
        <h2>Your data</h2><p class="muted">Pebble saves to this browser only. Back up to move between devices.</p>
        <div class="btn-row">
          <button class="btn sm" id="sExport">Download backup</button>
          <label class="btn sm" style="cursor:pointer">Restore backup<input type="file" id="sImport" accept="application/json,.json" hidden></label>
          <button class="btn sm ghost danger" id="sReset">Clear everything</button>
        </div>
        <p class="note">Shortcuts: <kbd>N</kbd> new item · <kbd>1</kbd>–<kbd>7</kbd> switch pages · <kbd>Esc</kbd> close</p>
      </section>
    </div>`;

  $('#sName', el).oninput = e => { st.name = e.target.value.trim(); save(); };
  $('#sTheme', el).onclick = e => { const b = e.target.closest('button'); if (!b) return; st.theme = b.dataset.v; save(); applyTheme(); renderSettings(); };
  $('#sNotify', el).onchange = async e => {
    if (e.target.checked) {
      const ok = await requestNotify();
      st.notify = ok; e.target.checked = ok;
      if (ok) { st.lastDigest = nowHM() >= st.digestTime ? todayStr() : st.lastDigest; toast(`Reminders on — heads-up at ${fmtTime(st.digestTime)}`); }
    } else st.notify = false;
    save(); renderSettings();
  };
  $('#sDigest', el).onchange = e => { st.digestTime = e.target.value || '19:00'; st.lastDigest = ''; if (nowHM() >= st.digestTime) st.lastDigest = todayStr(); save(); toast(`Heads-up set for ${fmtTime(st.digestTime)}`); };
  $('#sMorning', el).onchange = e => { st.morning = e.target.checked; if (st.morning && nowHM() >= st.morningTime) st.lastMorning = todayStr(); save(); renderSettings(); };
  $('#sMorningTime', el).onchange = e => { st.morningTime = e.target.value || '08:00'; st.lastMorning = nowHM() >= st.morningTime ? todayStr() : ''; save(); };
  $('#sTest', el).onclick = async () => { if (await requestNotify()) sendDigest(true); };
  $('#sIcs', el).onclick = exportICS;

  const list = $('#subjList', el);
  list.addEventListener('change', e => {
    const row = e.target.closest('.subj-row'); const s = subj(row.dataset.sid); if (!s) return;
    if (e.target.type === 'color') s.color = e.target.value; else s.name = e.target.value.trim() || s.name;
    save();
  });
  list.addEventListener('click', e => {
    if (!e.target.closest('[data-delsub]')) return;
    const id = e.target.closest('.subj-row').dataset.sid;
    S.subjects = S.subjects.filter(s => s.id !== id); S.items.forEach(i => { if (i.subjectId === id) i.subjectId = null; }); save(); renderSettings();
  });
  $('#addSubj', el).onclick = () => { S.subjects.push({ id: uid(), name: 'New subject', color: PALETTE[S.subjects.length % PALETTE.length] }); save(); renderSettings(); const ins = $$('#subjList input[type=text]'); ins[ins.length - 1].select(); };

  $('#sExport', el).onclick = () => download(`pebble-backup-${todayStr()}.json`, JSON.stringify(S, null, 2), 'application/json');
  $('#sImport', el).onchange = e => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!Array.isArray(data.items)) throw new Error('bad');
        if (!confirm('Replace everything here with this backup?')) return;
        const d = defaultState(); S = { ...d, ...data, settings: { ...d.settings, ...(data.settings || {}) } }; save(); applyTheme(); toast('Backup restored'); render();
      } catch (err) { toast('That file doesn\'t look like a Pebble backup'); }
    };
    r.readAsText(file);
  };
  $('#pwForm', el).onsubmit = async e => {
    e.preventDefault(); const f = new FormData(e.target);
    const r = await PebbleAuth.changePassword(f.get('cur'), f.get('next'));
    toast(r.ok ? 'Password changed' : r.error); if (r.ok) e.target.reset();
  };
  $('#sLogout', el).onclick = () => PebbleAuth.logout();
  $('#sDelAcc', el).onclick = async () => {
    const pw = prompt(`To delete the account "${ACCOUNT.username}" and ALL of its planner data, type your password:`);
    if (pw == null) return;
    const r = await PebbleAuth.deleteAccount(pw);
    if (!r.ok) toast(r.error);
  };
  $('#sReset', el).onclick = () => {
    if (!confirm('Delete all your tasks, events, flashcards and settings on this device? This can\'t be undone.')) return;
    S = defaultState(); save(); applyTheme(); toast('Everything cleared — fresh start'); go('today');
  };
}

/* =========================================================
   NOTIFICATIONS
   ========================================================= */
async function requestNotify() {
  if (!('Notification' in window)) { toast('Notifications aren\'t supported in this browser'); return false; }
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') { toast('Notifications are blocked — allow them in site settings'); return false; }
  const p = await Notification.requestPermission();
  if (p !== 'granted') toast('No problem — you can switch them on later');
  return p === 'granted';
}
async function sendNotification(title, body, tag) {
  const canNotify = 'Notification' in window && Notification.permission === 'granted';
  if (!canNotify) return false;
  const opts = { body, tag, icon: 'assets/icon-192.png', badge: 'assets/icon-192.png', renotify: true };
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (reg) { await reg.showNotification(title, opts); return true; }
  } catch (e) { }
  try { new Notification(title, opts); return true; } catch (e) { return false; }
}
function listLine(items) {
  return items.slice(0, 4).map(i => `• ${i.time ? fmtTime(i.time) + ' ' : ''}${i.kind === 'exam' ? 'Exam: ' : ''}${i.title}`).join('\n') + (items.length > 4 ? `\n+ ${items.length - 4} more` : '');
}
function sendDigest(isTest) {
  const items = S.items.filter(i => i.date === tomorrowStr() && !i.done).sort(byList);
  const title = items.length ? `Tomorrow: ${items.length} thing${items.length === 1 ? '' : 's'} planned` : 'Tomorrow is clear';
  const body = items.length ? listLine(items) : 'Nothing planned — enjoy the space, or add something now.';
  sendNotification(title, body, 'pebble-digest').then(ok => { if (isTest) toast(ok ? 'Test sent — check your notifications' : `${title}`); });
}
function checkNotifications() {
  const st = S.settings; if (!st.notify) return;
  const t = todayStr(), hm = nowHM();
  if (st.lastDigest !== t && hm >= st.digestTime) { st.lastDigest = t; save(); sendDigest(false); }
  if (st.morning && st.lastMorning !== t && hm >= st.morningTime) {
    st.lastMorning = t; save();
    const items = S.items.filter(i => (i.date === t || (i.kind === 'task' && i.date < t)) && !i.done).sort(byList);
    if (items.length) sendNotification(`${greeting()} — ${items.length} for today`, listLine(items), 'pebble-morning');
  }
  const now = new Date();
  for (const i of S.items) {
    if (!i.remind || i.done || i.date !== t) continue;
    const key = i.id + '@' + i.date; if (S.notified[key]) continue;
    let at;
    if (i.time) { const [h, m] = i.time.split(':').map(Number); at = new Date(); at.setHours(h, m - 15, 0, 0); }
    else { const [h, m] = st.morningTime.split(':').map(Number); at = new Date(); at.setHours(h, m, 0, 0); }
    if (now >= at) {
      S.notified[key] = 1; save();
      const late = i.time && now - at > 75 * 60000; if (late) continue;
      sendNotification(i.time ? `${i.title} at ${fmtTime(i.time)}` : `Reminder: ${i.title}`, i.notes || (subj(i.subjectId)?.name ?? 'From your Pebble planner'), 'pebble-' + i.id);
    }
  }
  // tidy old reminder keys
  for (const k of Object.keys(S.notified)) if (k.split('@')[1] < ymd(addDays(new Date(), -7))) delete S.notified[k];
}

/* ---------- calendar export (.ics) ---------- */
function icsEsc(s) { return String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1'); }
function exportICS() {
  const upcoming = S.items.filter(i => !i.done && i.date >= todayStr());
  if (!upcoming.length) { toast('Nothing upcoming to export yet'); return; }
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Pebble//Study Planner//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Pebble'];
  for (const i of upcoming) {
    const d = i.date.replace(/-/g, '');
    L.push('BEGIN:VEVENT', `UID:${i.id}@pebble-planner`, `DTSTAMP:${stamp}`, `SUMMARY:${icsEsc((i.kind === 'exam' ? 'Exam: ' : '') + i.title)}`);
    if (i.notes) L.push(`DESCRIPTION:${icsEsc(i.notes)}`);
    if (i.time) {
      const [h, m] = i.time.split(':').map(Number);
      const end = parseYMD(i.date); end.setHours(h, m + (i.kind === 'task' ? 30 : 60));
      L.push(`DTSTART:${d}T${i.time.replace(':', '')}00`, `DTEND:${ymd(end).replace(/-/g, '')}T${pad(end.getHours())}${pad(end.getMinutes())}00`);
      L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(i.title)}`, 'TRIGGER:-PT30M', 'END:VALARM');
    } else {
      L.push(`DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${ymd(addDays(parseYMD(i.date), 1)).replace(/-/g, '')}`);
    }
    // the evening before (7pm) — the "tomorrow" heads-up
    L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:Tomorrow: ${icsEsc(i.title)}`,
      i.time ? `TRIGGER:-PT${(+i.time.split(':')[0]) + 5}H${+i.time.split(':')[1] ? i.time.split(':')[1] + 'M' : ''}` : 'TRIGGER:-PT5H', 'END:VALARM');
    L.push('END:VEVENT');
  }
  L.push('END:VCALENDAR');
  download('pebble-planner.ics', L.join('\r\n'), 'text/calendar');
  toast('Downloaded — open it to add to your calendar');
}
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* =========================================================
   THEME, EVENTS, BOOT
   ========================================================= */
const mq = window.matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const t = S.settings.theme === 'auto' ? (mq.matches ? 'dark' : 'light') : S.settings.theme;
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('pebble:theme', t); } catch (e) { }
  $('meta[name=theme-color]').content = t === 'dark' ? '#151918' : '#F5F3EE';
}

/* Everything below runs once a student has signed in (called from auth.js). */
let ACCOUNT = null;
window.startPebble = function startPebble(account) {
ACCOUNT = account;
KEY = 'pebble:data:' + account.id;
S = load();
if (!S.settings.name && account.name) { S.settings.name = account.name.split(' ')[0]; save(); }
$('#whoName').textContent = account.name || account.username;

// Item list interactions (delegated, works on every page)
document.addEventListener('click', e => {
  const a = e.target.closest('[data-ia]'); if (!a) return;
  const li = a.closest('.item'); if (!li) return;
  const id = li.dataset.id;
  if (a.dataset.ia === 'toggle') toggleItem(id, li);
  else if (a.dataset.ia === 'edit') openEditor(getItem(id));
  else if (a.dataset.ia === 'delete') deleteItem(id);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.matches('.item-body')) { e.preventDefault(); e.target.click(); }
});
// Drag items (calendar chips & list rows) onto calendar days
document.addEventListener('dragstart', e => {
  const d = e.target.closest?.('[draggable="true"][data-id]'); if (!d) return;
  e.dataTransfer.setData('text/plain', d.dataset.id); e.dataTransfer.effectAllowed = 'move';
});

$('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal') closeModal(); });
$('#fab').onclick = () => openEditor(null, { date: view === 'calendar' ? cal.sel : todayStr() });
$('#themeToggle').onclick = () => {
  const cur = document.documentElement.dataset.theme;
  S.settings.theme = cur === 'dark' ? 'light' : 'dark'; save(); applyTheme();
  if (view === 'settings') renderSettings();
};
$$('.nav-btn, .brand').forEach(b => b.addEventListener('click', e => { e.preventDefault(); go(b.dataset.view); }));
window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (v !== view) go(v); });
mq.addEventListener?.('change', applyTheme);

document.addEventListener('keydown', e => {
  const typing = e.target.closest('input, textarea, select, [contenteditable]');
  const modalOpen = $('#modal').classList.contains('open');
  if (e.key === 'Escape') { if (modalOpen) closeModal(); else if (document.activeElement && typing) document.activeElement.blur(); return; }
  if (typing || modalOpen || e.ctrlKey || e.metaKey || e.altKey) return;
  if (view === 'cards' && CU.study) {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flipCard(); return; }
    if (CU.study.flipped && ['1', '2', '3'].includes(e.key)) { gradeCard({ 1: 'again', 2: 'good', 3: 'easy' }[e.key]); return; }
  }
  if (view === 'focus' && e.key === ' ' && !e.target.closest('button')) { e.preventDefault(); F.running ? fPause() : fStart(); return; }
  if (view === 'calendar' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.target.closest('.cal-cell')) { shiftMonth(e.key === 'ArrowLeft' ? -1 : 1); return; }
  if (e.key === 'n' || e.key === 'N') { e.preventDefault(); $('#fab').click(); return; }
  if (/^[1-7]$/.test(e.key)) go(VIEWS[+e.key - 1]);
});

// heartbeat: timer, day rollover, reminders
let lastDay = todayStr();
setInterval(() => {
  if (F.running && fRemaining() <= 0) fComplete();
  updateFocus();
}, 500);
setInterval(() => {
  checkNotifications();
  if (todayStr() !== lastDay) { lastDay = todayStr(); if (view === 'today' || view === 'calendar') render(); }
}, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { checkNotifications(); if (todayStr() !== lastDay) { lastDay = todayStr(); render(); } } });

// boot
applyTheme();
go(location.hash.slice(1) || 'today');
setTimeout(checkNotifications, 1500);
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => { });
}
};
