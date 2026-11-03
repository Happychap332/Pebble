/* =========================================================
   Pebble — learning tools
   Revision planner · topic tracker · notes · blurt test
   flashcard quiz + match + import · insights
   Everything runs in the browser; nothing is sent anywhere.
   ========================================================= */
'use strict';

/* ---------- shared helpers ---------- */
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const STOP = new Set(`about above across after again against almost along already also although always among another anything around because become been before being below between both called cannot could different does doing done down during each either else enough especially even ever every example few first following from further given good great have having here however important into itself just known large later least less like little long made main make makes many might more most much must near need never next normally often only other others over part people perhaps place quite rather really same several shall should show since small some something sometimes still such take than that their them themselves then there therefore these they thing things this those though three through thus together too toward under until upon used uses using usually very what when where whether which while whole whom whose will with within without would year years your yours happen happens happened mostly mainly words word equation definition definitions notes note topic topics answer question chapter section summary basically actually simply include includes including within become becomes`.split(/\s+/));
function stem(w) {
  w = String(w).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (w.length > 5) w = w.replace(/(ing|ed|es|s)$/, '');
  return w;
}
const ICON2 = {
  speak: '<svg viewBox="0 0 24 24"><path d="M4 9.5v5h3.5L12 19V5L7.5 9.5zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4.5 7h15M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4.5h6V7"/></svg>',
  spark: '<svg viewBox="0 0 24 24"><path d="M12 3c.6 3.8 2.2 5.4 6 6-3.8.6-5.4 2.2-6 6-.6-3.8-2.2-5.4-6-6 3.8-.6 5.4-2.2 6-6zM19 15c.3 1.7 1 2.4 2.7 2.7-1.7.3-2.4 1-2.7 2.7-.3-1.7-1-2.4-2.7-2.7 1.7-.3 2.4-1 2.7-2.7z"/></svg>',
};

/* ---------- read aloud (free, built into browsers) ---------- */
let speaking = false;
function speak(text, onend) {
  if (!('speechSynthesis' in window)) { toast('Read-aloud isn\'t supported in this browser'); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();
  const v = voices.find(v => /en-GB/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang));
  if (v) u.voice = v;
  u.rate = 0.97;
  u.onend = u.onerror = () => { speaking = false; if (onend) onend(); };
  speaking = true;
  speechSynthesis.speak(u);
}
function stopSpeak() { if ('speechSynthesis' in window) speechSynthesis.cancel(); speaking = false; }
const plainText = body => String(body || '').replace(/::/g, ' — ').replace(/[#*`>]/g, '').replace(/^\s*[-•]\s+/gm, '');

function logReview(n = 1) {
  if (!S.reviewLog) S.reviewLog = {};
  const t = todayStr(); S.reviewLog[t] = (S.reviewLog[t] || 0) + n;
}

/* =========================================================
   STUDY HUB
   ========================================================= */
let studyTab = 'plan';
const STUDY_TABS = [
  ['plan', 'Revision planner', 'Revise smarter, not longer', 'Tell Pebble your exam and topics. It builds a spaced-out timetable that gives your weakest topics the most time.'],
  ['topics', 'Topics', 'Know what you know', 'Rate every topic red, amber or green. Be honest — it\'s how your plan knows where to focus.'],
  ['notes', 'Notes', 'Your notes', 'Write notes once, then turn them into flashcards, listen to them, or test yourself with a blurt.'],
  ['blurt', 'Blurt test', 'Test your memory', 'Write everything you remember, then see exactly which key ideas you got and which you missed.'],
];
function renderStudy() {
  const el = $('#view-study');
  const tab = STUDY_TABS.find(t => t[0] === studyTab) || STUDY_TABS[0];
  el.innerHTML = `
    <header class="page-head"><p class="eyebrow">Study</p><h1>${tab[2]}</h1><p class="sub">${tab[3]}</p></header>
    <div class="tabs study-tabs" role="tablist">${STUDY_TABS.map(t => `<button role="tab" data-st="${t[0]}" class="${t[0] === studyTab ? 'on' : ''}">${t[1]}</button>`).join('')}</div>
    <div id="studyBody"></div>`;
  $$('[data-st]', el).forEach(b => b.onclick = () => { if (BL.phase === 'write' && b.dataset.st !== 'blurt' && !confirm('Stop this blurt test?')) return; if (b.dataset.st !== 'blurt' && BL.phase === 'write') BL.phase = 'pick'; studyTab = b.dataset.st; stopSpeak(); renderStudy(); });
  const body = $('#studyBody', el);
  ({ plan: renderPlanner, topics: renderTopics, notes: renderNotes, blurt: renderBlurt })[studyTab](body);
}

/* =========================================================
   TOPIC TRACKER (red / amber / green)
   ========================================================= */
const CONF = { 1: { label: 'Not confident yet', cls: 'red' }, 2: { label: 'Getting there', cls: 'amber' }, 3: { label: 'Confident', cls: 'green' } };
function addTopics(subjectId, text, conf = 2) {
  const names = String(text).split(/[,\n;]/).map(s => s.trim()).filter(Boolean);
  const out = [];
  names.forEach(name => {
    if (S.topics.some(t => t.subjectId === subjectId && t.name.toLowerCase() === name.toLowerCase())) return;
    const t = { id: uid(), subjectId, name: name.slice(0, 60), conf, updated: todayStr() };
    S.topics.push(t); out.push(t);
  });
  save();
  return out;
}
function renderTopics(box) {
  const groups = S.subjects.map(s => ({ s, topics: S.topics.filter(t => t.subjectId === s.id) }));
  const all = S.topics.length, green = S.topics.filter(t => t.conf === 3).length;
  box.innerHTML = `
    <div class="topic-legend">
      <span><i class="rag red"></i>Not confident yet</span><span><i class="rag amber"></i>Getting there</span><span><i class="rag green"></i>Confident</span>
      <span class="muted">· click a dot to change it</span>
      ${all ? `<span class="pill" style="margin-left:auto">${Math.round(green / all * 100)}% of topics confident</span>` : ''}
    </div>
    <div class="topic-grid">${groups.map(g => {
      const n = [1, 2, 3].map(c => g.topics.filter(t => t.conf === c).length);
      const pct = g.topics.length ? Math.round(g.topics.reduce((a, t) => a + t.conf - 1, 0) / (g.topics.length * 2) * 100) : 0;
      return `<section class="card topic-card" style="--c:${g.s.color}">
        <div class="card-head"><h2><span class="sdot"></span>${esc(g.s.name)}</h2><span class="pill ${g.topics.length ? '' : 'lav'}">${g.topics.length ? pct + '% there' : 'No topics yet'}</span></div>
        ${g.topics.length ? `<div class="conf-bar"><span class="r" style="flex:${n[0]}"></span><span class="a" style="flex:${n[1]}"></span><span class="g" style="flex:${n[2]}"></span></div>` : ''}
        <ul class="topic-list">${g.topics.sort((a, b) => a.conf - b.conf || a.name.localeCompare(b.name)).map(t => `<li data-tid="${t.id}">
          <button class="rag ${CONF[t.conf].cls}" data-cycle title="${CONF[t.conf].label} — click to change" aria-label="${esc(t.name)}: ${CONF[t.conf].label}"></button>
          <span class="tname">${esc(t.name)}</span>
          <button class="icon-btn" data-deltopic aria-label="Remove topic">${ICON.x}</button></li>`).join('')}</ul>
        <form class="topic-add" data-sid="${g.s.id}"><input class="input" placeholder="Add topics, separated by commas…" maxlength="400"><button class="btn sm">Add</button></form>
        ${g.topics.length ? `<button class="btn sm full" data-plan="${g.s.id}" style="margin-top:10px">Plan revision for ${esc(g.s.name)} →</button>` : ''}
      </section>`;
    }).join('')}</div>
    ${S.subjects.length ? '' : '<p class="muted">Add a subject in Settings first.</p>'}`;

  box.onclick = e => {
    const li = e.target.closest('[data-tid]');
    if (li && e.target.closest('[data-cycle]')) {
      const t = S.topics.find(x => x.id === li.dataset.tid); t.conf = t.conf % 3 + 1; t.updated = todayStr(); save(); renderTopics(box);
      if (t.conf === 3) toast(`${t.name}: confident ✨`);
    } else if (li && e.target.closest('[data-deltopic]')) {
      const idx = S.topics.findIndex(x => x.id === li.dataset.tid); const [t] = S.topics.splice(idx, 1); save(); renderTopics(box);
      toast('Topic removed', { label: 'Undo', fn: () => { S.topics.splice(idx, 0, t); save(); render(); } });
    } else if (e.target.closest('[data-plan]')) {
      openPlannerFor(e.target.closest('[data-plan]').dataset.plan);
    }
  };
  $$('.topic-add', box).forEach(f => f.onsubmit = e => {
    e.preventDefault(); const inp = $('input', f); const added = addTopics(f.dataset.sid, inp.value);
    if (added.length) { renderTopics(box); const again = $(`.topic-add[data-sid="${f.dataset.sid}"] input`, box); if (again) again.focus(); }
  });
}

/* =========================================================
   SMART REVISION PLANNER
   ========================================================= */
const PD = { examId: '', subjectId: null, forExam: null, newTitle: '', newDate: '', topicIds: [], perDay: 2, len: 45, startTime: '16:30', days: [1, 2, 3, 4, 5, 6, 0], startDate: '', preview: null, error: '' };
const DAYN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ROUND = [
  { prefix: 'Learn', tip: 'Go through your notes on this topic and turn the key facts into flashcards. Finish with a 5-minute blurt.' },
  { prefix: 'Recall', tip: 'Close your notes. Blurt everything you remember, check what you missed, then review your due flashcards.' },
  { prefix: 'Exam practice', tip: 'Do exam-style questions against a timer, then mark them and write down anything you got wrong.' },
];
const upcomingExams = () => S.items.filter(i => i.kind === 'exam' && i.date > todayStr()).sort((a, b) => a.date.localeCompare(b.date));

function openPlannerFor(subjectId) {
  const ex = upcomingExams().find(e => e.subjectId === subjectId);
  PD.examId = ex ? ex.id : 'new'; PD.forExam = PD.examId; PD.subjectId = subjectId;
  PD.topicIds = S.topics.filter(t => t.subjectId === subjectId).map(t => t.id);
  PD.preview = null; PD.error = '';
  studyTab = 'plan'; if (view !== 'study') go('study'); else renderStudy();
}

function buildPlan() {
  const examDate = PD.examId === 'new' ? PD.newDate : getItem(PD.examId)?.date;
  const examTitle = PD.examId === 'new' ? PD.newTitle.trim() : getItem(PD.examId)?.title;
  if (!examTitle) return { error: 'Give the exam a name.' };
  if (!examDate || examDate <= todayStr()) return { error: 'Pick an exam date in the future.' };
  const topics = S.topics.filter(t => PD.topicIds.includes(t.id)).sort((a, b) => a.conf - b.conf);
  if (!topics.length) return { error: 'Pick at least one topic to revise (add some in step 2).' };
  if (!PD.days.length) return { error: 'Choose at least one day of the week to study.' };
  const start = parseYMD(PD.startDate || todayStr()), end = addDays(parseYMD(examDate), -1);
  const days = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) if (PD.days.includes(d.getDay())) days.push(ymd(d));
  if (!days.length) return { error: 'There are no study days before the exam — pick more days or an earlier start date.' };

  // weakest first; red = 3 rounds, amber = 2, green = 1. Rounds are spaced apart (spaced repetition)
  const rounds = [[], [], []];
  topics.forEach(t => { for (let r = 0; r < 4 - t.conf; r++) rounds[r].push(t); });
  let queue = rounds.flatMap((list, r) => list.map(t => ({ t, r })));
  const finalDay = days.length >= 2 ? days[days.length - 1] : null;
  const slotDays = finalDay ? days.slice(0, -1) : days;
  const totalSlots = slotDays.length * PD.perDay;
  let note = '';
  if (queue.length > totalSlots) {
    note = `There isn't room for all ${queue.length} sessions, so Pebble kept the ${totalSlots} most important (weakest topics first). Add more sessions a day or start earlier to fit everything in.`;
    queue = queue.slice(0, totalSlots);
  }
  const sessions = queue.map((q, i) => {
    const slot = Math.floor(i * totalSlots / queue.length);
    return { ...q, date: slotDays[Math.floor(slot / PD.perDay)] };
  });
  if (finalDay) sessions.push({ final: true, date: finalDay });
  // give each session a time on its day
  const [h0, m0] = PD.startTime.split(':').map(Number);
  const byDay = {};
  sessions.forEach(s => { (byDay[s.date] = byDay[s.date] || []).push(s); });
  Object.values(byDay).forEach(list => list.forEach((s, k) => {
    let mins = Math.min(h0 * 60 + m0 + k * (PD.len + 15), 23 * 60);
    s.time = `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
  }));
  sessions.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  return { sessions, examTitle, examDate, studyDays: days.length, note };
}

function planItems(plan, planId) {
  return plan.sessions.map(s => mk({
    title: s.final ? `Final review: ${plan.examTitle}` : `${ROUND[s.r].prefix}: ${s.t.name}`,
    date: s.date, time: s.time, subjectId: s.final ? PD.subjectId : s.t.subjectId,
    priority: s.final || (s.t && s.t.conf === 1) ? 'high' : 'normal',
    notes: (s.final ? 'Light review: your due flashcards and summary notes, then an early night. You\'ve prepared well.' : ROUND[s.r].tip) + ` (${PD.len} min)`,
    planId,
  }));
}

function renderPlanner(box) {
  const exams = upcomingExams();
  if (!PD.examId || (PD.examId !== 'new' && !getItem(PD.examId))) PD.examId = exams[0]?.id || 'new';
  if (PD.forExam !== PD.examId) {
    const ex = getItem(PD.examId);
    PD.subjectId = ex?.subjectId || PD.subjectId || S.subjects[0]?.id || null;
    PD.topicIds = S.topics.filter(t => t.subjectId === PD.subjectId).map(t => t.id);
    PD.forExam = PD.examId;
  }
  const topics = S.topics.filter(t => t.subjectId === PD.subjectId).sort((a, b) => a.conf - b.conf || a.name.localeCompare(b.name));
  const opt = (arr, cur, f = v => v) => arr.map(v => `<option value="${v}" ${v === cur ? 'selected' : ''}>${f(v)}</option>`).join('');
  box.innerHTML = `
    <div class="planner">
      <section class="card plan-form">
        <div class="step"><span class="step-n">1</span><div class="grow">
          <h2>Which exam?</h2>
          <div class="row2">
            <label class="field"><span>Exam</span><select id="pExam">${exams.map(e => `<option value="${e.id}" ${e.id === PD.examId ? 'selected' : ''}>${esc(e.title)} · ${fmtDate(e.date)}</option>`).join('')}<option value="new" ${PD.examId === 'new' ? 'selected' : ''}>+ Add a new exam…</option></select></label>
            <label class="field"><span>Subject</span><select id="pSubj">${S.subjects.map(s => `<option value="${s.id}" ${s.id === PD.subjectId ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
          </div>
          ${PD.examId === 'new' ? `<div class="row2">
            <label class="field"><span>Exam name</span><input id="pNewTitle" value="${esc(PD.newTitle)}" placeholder="e.g. Biology Paper 1" maxlength="80"></label>
            <label class="field"><span>Exam date</span><input type="date" id="pNewDate" value="${PD.newDate}" min="${tomorrowStr()}"></label></div>` : ''}
        </div></div>

        <div class="step"><span class="step-n">2</span><div class="grow">
          <h2>Which topics?</h2>
          <p class="muted small">Red topics get 3 sessions, amber 2, green 1 — spread out so each one comes back just as you start to forget it.</p>
          <div class="topic-chips">${topics.map(t => `<button type="button" class="tchip ${PD.topicIds.includes(t.id) ? 'on' : ''}" data-t="${t.id}"><i class="rag ${CONF[t.conf].cls}"></i>${esc(t.name)}</button>`).join('') || '<span class="muted small">No topics for this subject yet — add a few below.</span>'}</div>
          <form id="pAddTopic" class="topic-add"><input class="input" placeholder="Add topics, separated by commas…" maxlength="400"><select class="input" id="pAddConf" style="width:auto"><option value="1">Red</option><option value="2" selected>Amber</option><option value="3">Green</option></select><button class="btn sm">Add</button></form>
        </div></div>

        <div class="step"><span class="step-n">3</span><div class="grow">
          <h2>When can you study?</h2>
          <div class="days-pick">${[1, 2, 3, 4, 5, 6, 0].map(d => `<button type="button" data-day="${d}" class="${PD.days.includes(d) ? 'on' : ''}">${DAYN[d]}</button>`).join('')}</div>
          <div class="row3">
            <label class="field"><span>Sessions a day</span><select id="pPer">${opt([1, 2, 3, 4], PD.perDay)}</select></label>
            <label class="field"><span>Session length</span><select id="pLen">${opt([25, 30, 45, 60], PD.len, v => v + ' min')}</select></label>
            <label class="field"><span>First session at</span><input type="time" id="pTime" value="${PD.startTime}"></label>
          </div>
          <label class="field" style="max-width:240px"><span>Start from</span><input type="date" id="pStart" value="${PD.startDate || todayStr()}" min="${todayStr()}"></label>
        </div></div>
        <p class="auth-error" id="pErr">${esc(PD.error)}</p>
        <button class="btn primary big" id="pBuild">${ICON2.spark} Build my revision plan</button>
      </section>
      <section class="card plan-preview" id="pPreview"></section>
    </div>
    <div id="pPlans"></div>`;
  renderPlanPreview(); renderPlanList();

  const rerender = () => renderPlanner(box);
  $('#pExam', box).onchange = e => { PD.examId = e.target.value; PD.preview = null; PD.error = ''; rerender(); };
  $('#pSubj', box).onchange = e => { PD.subjectId = e.target.value; PD.topicIds = S.topics.filter(t => t.subjectId === PD.subjectId).map(t => t.id); PD.preview = null; rerender(); };
  const nt = $('#pNewTitle', box); if (nt) nt.oninput = e => { PD.newTitle = e.target.value; };
  const nd = $('#pNewDate', box); if (nd) nd.onchange = e => { PD.newDate = e.target.value; };
  $$('[data-t]', box).forEach(b => b.onclick = () => {
    const id = b.dataset.t; const on = PD.topicIds.includes(id);
    PD.topicIds = on ? PD.topicIds.filter(x => x !== id) : [...PD.topicIds, id]; b.classList.toggle('on', !on);
  });
  $('#pAddTopic', box).onsubmit = e => {
    e.preventDefault(); if (!PD.subjectId) return;
    const added = addTopics(PD.subjectId, $('input', e.target).value, +$('#pAddConf', box).value);
    PD.topicIds.push(...added.map(t => t.id)); rerender(); $('#pAddTopic input', box)?.focus();
  };
  $$('[data-day]', box).forEach(b => b.onclick = () => {
    const d = +b.dataset.day; PD.days = PD.days.includes(d) ? PD.days.filter(x => x !== d) : [...PD.days, d]; b.classList.toggle('on');
  });
  $('#pPer', box).onchange = e => { PD.perDay = +e.target.value; };
  $('#pLen', box).onchange = e => { PD.len = +e.target.value; };
  $('#pTime', box).onchange = e => { PD.startTime = e.target.value || '16:30'; };
  $('#pStart', box).onchange = e => { PD.startDate = e.target.value; };
  $('#pBuild', box).onclick = () => {
    const r = buildPlan();
    PD.error = r.error || ''; $('#pErr', box).textContent = PD.error;
    PD.preview = r.error ? null : r; renderPlanPreview();
    if (!r.error && window.innerWidth < 1000) $('#pPreview').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
}

function renderPlanPreview() {
  const box = $('#pPreview'); if (!box) return;
  const p = PD.preview;
  if (!p) {
    box.innerHTML = `<div class="plan-empty">${ICON.stones}
      <h2>Your plan appears here</h2>
      <p class="muted">Pebble uses three things that research shows work best:</p>
      <ul class="why"><li><b>Spaced repetition</b> — each topic comes back over several days instead of one long cram.</li>
      <li><b>Active recall</b> — sessions move from learning, to recalling from memory, to exam practice.</li>
      <li><b>Weakest first</b> — red topics get the most time, green ones a quick check.</li></ul></div>`;
    return;
  }
  const groups = {};
  p.sessions.forEach(s => (groups[s.date] = groups[s.date] || []).push(s));
  const hours = Math.round(p.sessions.length * PD.len / 6) / 10;
  box.innerHTML = `
    <div class="card-head"><div><p class="eyebrow">Preview</p><h2>${esc(p.examTitle)}</h2></div><span class="pill lav">${relDay(p.examDate)}</span></div>
    <div class="stat-row">
      <div class="stat"><b>${p.sessions.length}</b><span>sessions</span></div>
      <div class="stat"><b>${Object.keys(groups).length}</b><span>study days</span></div>
      <div class="stat"><b>${hours}</b><span>hours total</span></div>
    </div>
    ${p.note ? `<p class="note warn">${esc(p.note)}</p>` : ''}
    <div class="plan-days">${Object.entries(groups).map(([d, list]) => `<div class="plan-day"><div class="pd-date"><b>${parseYMD(d).getDate()}</b><span>${fmtDate(d, { weekday: 'short' })}</span></div>
      <div class="grow">${list.map(s => `<div class="pd-item ${s.final ? 'final' : 'r' + s.r}" style="--c:${subjColor(s.final ? PD.subjectId : s.t.subjectId)}"><span class="pd-time">${fmtTime(s.time)}</span>${s.final ? `Final review` : `<em>${ROUND[s.r].prefix}</em> ${esc(s.t.name)}`}</div>`).join('')}</div></div>`).join('')}</div>
    <div class="btn-row" style="margin-top:16px"><button class="btn primary" id="pAdd">Add ${p.sessions.length} sessions to my calendar</button><button class="btn ghost" id="pClear">Start over</button></div>`;
  $('#pClear', box).onclick = () => { PD.preview = null; renderPlanPreview(); };
  $('#pAdd', box).onclick = () => {
    const planId = uid();
    if (PD.examId === 'new') {
      const ex = mk({ kind: 'exam', title: p.examTitle, date: p.examDate, subjectId: PD.subjectId, priority: 'high' });
      S.items.push(ex); PD.examId = ex.id; PD.forExam = ex.id; PD.newTitle = ''; PD.newDate = '';
    }
    const items = planItems(p, planId);
    S.items.push(...items);
    S.plans.push({ id: planId, title: p.examTitle, examDate: p.examDate, subjectId: PD.subjectId, created: Date.now(), count: items.length });
    save(); PD.preview = null;
    toast(`${items.length} sessions added — good luck!`, { label: 'View calendar', fn: () => { cal.sel = items[0].date; const d = parseYMD(items[0].date); cal.month = new Date(d.getFullYear(), d.getMonth(), 1); go('calendar'); } });
    renderStudy();
  };
}

function renderPlanList() {
  const box = $('#pPlans'); if (!box) return;
  const plans = S.plans.filter(p => p.examDate >= ymd(addDays(new Date(), -14))).sort((a, b) => a.examDate.localeCompare(b.examDate));
  if (!plans.length) { box.innerHTML = ''; return; }
  box.innerHTML = `<section class="card" style="margin-top:18px"><h2 style="margin-bottom:12px">Your revision plans</h2>
    ${plans.map(p => {
      const items = S.items.filter(i => i.planId === p.id), done = items.filter(i => i.done).length;
      const pct = items.length ? Math.round(done / items.length * 100) : 0;
      return `<div class="plan-row" data-pid="${p.id}"><span class="sdot" style="--c:${subjColor(p.subjectId)}"></span>
        <div class="grow"><div class="item-title">${esc(p.title)}</div><div class="item-meta">Exam ${relDay(p.examDate)} · ${done}/${items.length} sessions done</div>
        <div class="progress" style="margin:6px 0 0"><span style="width:${pct}%"></span></div></div>
        <button class="btn sm ghost danger" data-rmplan>Remove</button></div>`;
    }).join('')}</section>`;
  $$('[data-rmplan]', box).forEach(b => b.onclick = () => {
    const pid = b.closest('[data-pid]').dataset.pid;
    const left = S.items.filter(i => i.planId === pid && !i.done).length;
    if (!confirm(`Remove this plan? Its ${left} unfinished session${left === 1 ? '' : 's'} will be taken off your calendar.`)) return;
    S.items = S.items.filter(i => !(i.planId === pid && !i.done));
    S.plans = S.plans.filter(p => p.id !== pid); save(); renderStudy(); toast('Plan removed');
  });
}

/* =========================================================
   NOTES  (mini-markdown, auto flashcards, read aloud)
   ========================================================= */
let noteSel = null, notePreview = false, noteQuery = '', noteSaveTimer = null;
function inlineMd(s) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>').replace(/`([^`]+)`/g, '<code>$1</code>');
}
function md(src) {
  let out = '', inList = false;
  for (const raw of String(src || '').split('\n')) {
    const l = raw.replace(/\s+$/, '');
    const li = l.match(/^\s*[-*•]\s+(.*)/);
    if (li) {
      if (!inList) { out += '<ul>'; inList = true; }
      const def = li[1].split('::');
      out += def.length > 1 ? `<li><b>${inlineMd(def[0].trim())}</b> — ${inlineMd(def.slice(1).join('::').trim())}</li>` : `<li>${inlineMd(li[1])}</li>`;
      continue;
    }
    if (inList) { out += '</ul>'; inList = false; }
    const h = l.match(/^(#{1,3})\s+(.*)/);
    if (h) { out += `<h${h[1].length + 2}>${inlineMd(h[2])}</h${h[1].length + 2}>`; continue; }
    if (l.includes('::')) { const [t, ...d] = l.split('::'); out += `<div class="def"><b>${inlineMd(t.trim())}</b><span>${inlineMd(d.join('::').trim())}</span></div>`; continue; }
    if (l.trim()) out += `<p>${inlineMd(l)}</p>`;
  }
  if (inList) out += '</ul>';
  return out;
}
function notePairs(body) {
  return String(body || '').split('\n')
    .map(l => l.replace(/^\s*[-*•#]+\s*/, ''))
    .filter(l => l.includes('::'))
    .map(l => { const [q, ...a] = l.split('::'); return [q.replace(/\*\*/g, '').trim(), a.join('::').replace(/\*\*/g, '').trim()]; })
    .filter(([q, a]) => q && a);
}
function newNote(subjectId) {
  const n = { id: uid(), title: 'Untitled note', subjectId: subjectId || null, body: '', created: Date.now(), updated: Date.now() };
  S.notes.unshift(n); save(); noteSel = n.id; notePreview = false; return n;
}
function makeCardsFromNote(n) {
  const pairs = notePairs(n.body);
  if (!pairs.length) { toast('Add lines like "Osmosis :: movement of water across a membrane" first'); return; }
  let deck = S.decks.find(d => d.noteId === n.id);
  if (!deck) { deck = { id: uid(), name: n.title || 'Untitled', color: subj(n.subjectId)?.color || PALETTE[S.decks.length % PALETTE.length], noteId: n.id, cards: [] }; S.decks.push(deck); }
  const have = new Set(deck.cards.map(c => c.q.toLowerCase()));
  let added = 0;
  pairs.forEach(([q, a]) => { if (!have.has(q.toLowerCase())) { deck.cards.push(mkCard(q, a)); have.add(q.toLowerCase()); added++; } });
  save();
  toast(added ? `${added} flashcard${added === 1 ? '' : 's'} added to "${deck.name}"` : 'Those cards are already in your deck', { label: 'Open deck', fn: () => { CU.deck = deck.id; CU.study = null; CU.quiz = null; CU.match = null; go('cards'); } });
}

function renderNotes(box) {
  if (noteSel && !S.notes.find(n => n.id === noteSel)) noteSel = null;
  if (!noteSel && S.notes.length) noteSel = [...S.notes].sort((a, b) => b.updated - a.updated)[0].id;
  box.innerHTML = `<div class="notes-layout">
    <aside class="card notes-side">
      <div class="notes-tools"><label class="search">${ICON.search}<input id="nSearch" placeholder="Search notes" value="${esc(noteQuery)}"></label><button class="btn primary sm" id="nNew">+ New</button></div>
      <ul class="note-list" id="nList"></ul>
    </aside>
    <section class="card note-editor" id="nEditor"></section></div>`;
  renderNoteList(); renderNoteEditor();
  $('#nSearch', box).oninput = e => { noteQuery = e.target.value; renderNoteList(); };
  $('#nNew', box).onclick = () => { newNote(); noteQuery = ''; renderNotes(box); setTimeout(() => { const t = $('#nTitle'); t.focus(); t.select(); }, 30); };
}
function renderNoteList() {
  const list = $('#nList'); if (!list) return;
  const q = noteQuery.trim().toLowerCase();
  const notes = [...S.notes].sort((a, b) => b.updated - a.updated).filter(n => !q || (n.title + ' ' + n.body).toLowerCase().includes(q));
  list.innerHTML = notes.map(n => {
    const s = subj(n.subjectId);
    const snippet = plainText(n.body).replace(/\s+/g, ' ').slice(0, 70);
    return `<li class="note-li ${n.id === noteSel ? 'on' : ''}" data-nid="${n.id}" tabindex="0">
      <span class="nl-title">${esc(n.title || 'Untitled')}</span>
      <span class="nl-meta">${s ? `<span class="tag" style="--c:${s.color}">${esc(s.name)}</span>` : ''}<span>${esc(snippet) || 'Empty note'}</span></span></li>`;
  }).join('') || `<li class="empty" style="list-style:none">${q ? 'No notes match.' : 'No notes yet.'}</li>`;
  $$('[data-nid]', list).forEach(li => {
    li.onclick = () => { noteSel = li.dataset.nid; stopSpeak(); renderNoteList(); renderNoteEditor(); };
    li.onkeydown = e => { if (e.key === 'Enter') li.click(); };
  });
}
function renderNoteEditor() {
  const ed = $('#nEditor'); if (!ed) return;
  const n = S.notes.find(x => x.id === noteSel);
  if (!n) {
    ed.innerHTML = `<div class="empty" style="padding:60px 20px">${ICON.stones}<p>Your notes live here. Make one, then turn it into flashcards or test yourself with a blurt.</p><button class="btn primary" id="nFirst">Write your first note</button></div>`;
    $('#nFirst', ed).onclick = () => { newNote(); renderStudy(); };
    return;
  }
  const pairs = notePairs(n.body).length;
  ed.innerHTML = `
    <div class="note-head">
      <input class="note-title" id="nTitle" value="${esc(n.title)}" placeholder="Note title" maxlength="80" aria-label="Note title">
      <select id="nSubj" class="input" style="width:auto"><option value="">No subject</option>${S.subjects.map(s => `<option value="${s.id}" ${s.id === n.subjectId ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
    </div>
    <div class="note-toolbar">
      <div class="seg"><button data-np="0" class="${notePreview ? '' : 'on'}">Write</button><button data-np="1" class="${notePreview ? 'on' : ''}">Read</button></div>
      <span class="grow"></span>
      <button class="btn sm" id="nCards" title="Turns every 'term :: definition' line into a flashcard">${ICON2.spark} Make flashcards${pairs ? ` (${pairs})` : ''}</button>
      <button class="btn sm" id="nBlurt">Blurt test</button>
      <button class="btn sm" id="nSpeak">${ICON2.speak}${speaking ? 'Stop' : 'Listen'}</button>
      <button class="icon-btn" id="nDel" aria-label="Delete note" title="Delete note">${ICON2.trash}</button>
    </div>
    ${notePreview
      ? `<div class="note-render">${md(n.body) || '<p class="muted">Nothing here yet — switch to Write.</p>'}</div>`
      : `<textarea id="nBody" class="note-body" placeholder="# Photosynthesis&#10;Plants make glucose using light energy.&#10;&#10;Chlorophyll :: green pigment that absorbs light&#10;- happens in the **chloroplasts**">${esc(n.body)}</textarea>`}
    <p class="hint">Write <code>term :: definition</code> on a line to make a flashcard · <code>#</code> heading · <code>-</code> bullet · <code>**key word**</code> · saved automatically</p>`;
  const touch = () => { n.updated = Date.now(); clearTimeout(noteSaveTimer); noteSaveTimer = setTimeout(() => { save(); renderNoteList(); }, 500); };
  $('#nTitle', ed).oninput = e => { n.title = e.target.value; touch(); };
  $('#nSubj', ed).onchange = e => { n.subjectId = e.target.value || null; touch(); };
  const body = $('#nBody', ed);
  if (body) body.oninput = e => {
    n.body = e.target.value; touch();
    const c = notePairs(n.body).length; $('#nCards', ed).innerHTML = `${ICON2.spark} Make flashcards${c ? ` (${c})` : ''}`;
  };
  $$('[data-np]', ed).forEach(b => b.onclick = () => { notePreview = b.dataset.np === '1'; save(); renderNoteEditor(); });
  $('#nCards', ed).onclick = () => { save(); makeCardsFromNote(n); };
  $('#nBlurt', ed).onclick = () => { save(); if (!keyTerms(n.body).length) { toast('Write a bit more in this note first'); return; } startBlurt(n.id); };
  $('#nSpeak', ed).onclick = () => {
    if (speaking) { stopSpeak(); renderNoteEditor(); return; }
    const text = (n.title ? n.title + '. ' : '') + plainText(n.body);
    if (!text.trim()) return;
    speak(text, () => { if ($('#nSpeak')) renderNoteEditor(); }); renderNoteEditor();
  };
  $('#nDel', ed).onclick = () => {
    if (!confirm(`Delete the note "${n.title || 'Untitled'}"?`)) return;
    const idx = S.notes.indexOf(n); S.notes.splice(idx, 1); noteSel = null; stopSpeak(); save(); renderStudy();
    toast('Note deleted', { label: 'Undo', fn: () => { S.notes.splice(idx, 0, n); noteSel = n.id; save(); render(); } });
  };
}

/* =========================================================
   BLURT TEST (active recall with automatic checking)
   ========================================================= */
const BL = { phase: 'pick', noteId: null, mins: 5, endAt: 0, text: '', result: null };
function keyTerms(body) {
  const map = new Map();
  const add = (label, w) => {
    const parts = (String(label).match(/[A-Za-z0-9][A-Za-z0-9'’-]*/g) || []).filter(x => !STOP.has(x.toLowerCase())).map(stem).filter(s => s.length >= 3);
    if (!parts.length) return;
    const key = parts.join(' ');
    if (!map.has(key)) map.set(key, { label: String(label).trim(), parts, w });
  };
  notePairs(body).forEach(([q]) => add(q, 2));
  (String(body).match(/\*\*(.+?)\*\*/g) || []).forEach(b => add(b.slice(2, -2), 2));
  const counts = {}, first = {};
  (plainText(body).match(/[A-Za-z][A-Za-z'’-]+/g) || []).forEach(w => {
    if (STOP.has(w.toLowerCase())) return;
    const s = stem(w); if (s.length < 5) return;
    counts[s] = (counts[s] || 0) + 1; if (!first[s]) first[s] = w;
  });
  const singles = new Set([...map.values()].flatMap(t => t.parts));
  Object.keys(counts).sort((a, b) => counts[b] - counts[a] || b.length - a.length).slice(0, 30)
    .forEach(s => { if (!singles.has(s)) map.set(s, { label: first[s], parts: [s], w: 1 }); });
  return [...map.values()];
}
function scoreBlurt(body, text) {
  const have = new Set((String(text).match(/[A-Za-z0-9][A-Za-z0-9'’-]*/g) || []).map(stem));
  const hit = [], miss = [];
  keyTerms(body).forEach(t => {
    const got = t.parts.filter(p => have.has(p)).length;
    (got >= Math.ceil(t.parts.length * 0.6) ? hit : miss).push(t);
  });
  const total = [...hit, ...miss].reduce((a, t) => a + t.w, 0) || 1;
  return { score: Math.round(hit.reduce((a, t) => a + t.w, 0) / total * 100), hit, miss, words: (String(text).match(/\S+/g) || []).length };
}
function startBlurt(noteId) {
  stopSpeak();
  BL.noteId = noteId; BL.phase = 'write'; BL.text = ''; BL.result = null; BL.endAt = Date.now() + BL.mins * 60000;
  studyTab = 'blurt';
  if (view !== 'study') go('study'); else renderStudy();
  setTimeout(() => $('#blText')?.focus(), 60);
}
function finishBlurt() {
  const n = S.notes.find(x => x.id === BL.noteId);
  if (!n) { BL.phase = 'pick'; return; }
  BL.result = scoreBlurt(n.body, BL.text);
  S.blurts.push({ id: uid(), noteId: n.id, date: todayStr(), score: BL.result.score, at: Date.now() });
  logReview(Math.max(1, Math.round(BL.result.words / 20)));
  save(); BL.phase = 'result'; chime();
  if (view === 'study' && studyTab === 'blurt') renderStudy();
  else toast(`Blurt checked: ${BL.result.score}%`, { label: 'See results', fn: () => { studyTab = 'blurt'; go('study'); } });
}
function renderBlurt(box) {
  if (BL.phase === 'write') return blurtWrite(box);
  if (BL.phase === 'result') return blurtResult(box);
  const notes = [...S.notes].filter(n => keyTerms(n.body).length >= 3).sort((a, b) => b.updated - a.updated);
  box.innerHTML = `
    <section class="card how-card">
      <div class="how"><span class="step-n">1</span><div><b>Pick a note</b><p>Choose something you've been learning.</p></div></div>
      <div class="how"><span class="step-n">2</span><div><b>Write it all out</b><p>Everything you remember, in any order. No peeking.</p></div></div>
      <div class="how"><span class="step-n">3</span><div><b>See your gaps</b><p>Pebble shows which key ideas you got and which you missed.</p></div></div>
    </section>
    <div class="blurt-opts"><span class="muted">Time limit</span><div class="seg">${[3, 5, 10].map(m => `<button data-bm="${m}" class="${BL.mins === m ? 'on' : ''}">${m} min</button>`).join('')}</div></div>
    <div class="deck-grid">${notes.map(n => {
      const hist = S.blurts.filter(b => b.noteId === n.id); const last = hist[hist.length - 1];
      return `<div class="card deck" data-bnote="${n.id}" style="--c:${subj(n.subjectId)?.color || PALETTE[1]}" tabindex="0" role="button">
        <h3>${esc(n.title || 'Untitled')}</h3><span class="muted">${keyTerms(n.body).length} key ideas</span>
        <span class="pill ${last ? '' : 'lav'}">${last ? `Last score ${last.score}%` : 'Not tested yet'}</span></div>`;
    }).join('') || `<div class="card empty" style="grid-column:1/-1">${ICON.stones}<p>Write a note first (a few sentences is enough), then come back to test yourself.</p><button class="btn primary" id="bGoNotes">Go to notes</button></div>`}</div>`;
  $$('[data-bm]', box).forEach(b => b.onclick = () => { BL.mins = +b.dataset.bm; renderBlurt(box); });
  $$('[data-bnote]', box).forEach(d => { d.onclick = () => startBlurt(d.dataset.bnote); d.onkeydown = e => { if (e.key === 'Enter') d.click(); }; });
  const g = $('#bGoNotes', box); if (g) g.onclick = () => { studyTab = 'notes'; renderStudy(); };
}
function blurtWrite(box) {
  const n = S.notes.find(x => x.id === BL.noteId);
  if (!n) { BL.phase = 'pick'; return renderBlurt(box); }
  box.innerHTML = `<section class="card blurt-card">
    <div class="card-head"><div><p class="eyebrow">Blurt test</p><h2 class="serif">${esc(n.title || 'Untitled')}</h2></div><div class="blurt-timer" id="blTimer">--:--</div></div>
    <p class="muted" style="margin-top:-6px">Write down everything you can remember about this topic — facts, key words, definitions, examples. Spelling doesn't matter.</p>
    <textarea id="blText" class="note-body blurt-text" placeholder="Start typing…">${esc(BL.text)}</textarea>
    <div class="btn-row"><button class="btn primary" id="blDone">I'm done — check it</button><button class="btn ghost" id="blQuit">Cancel</button><span class="muted" id="blWords" style="align-self:center;margin-left:auto">0 words</span></div>
  </section>`;
  const ta = $('#blText', box);
  ta.oninput = () => { BL.text = ta.value; $('#blWords', box).textContent = `${(ta.value.match(/\S+/g) || []).length} words`; };
  $('#blDone', box).onclick = finishBlurt;
  $('#blQuit', box).onclick = () => { BL.phase = 'pick'; renderBlurt(box); };
  updateBlurtTimer();
}
function updateBlurtTimer() {
  const el = $('#blTimer'); if (!el) return;
  const s = Math.max(0, Math.ceil((BL.endAt - Date.now()) / 1000));
  el.textContent = `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
  el.classList.toggle('low', s <= 30);
}
function highlightNote(body, res) {
  const hitS = new Set(res.hit.flatMap(t => t.parts)), missS = new Set(res.miss.flatMap(t => t.parts));
  return plainText(body).split(/([A-Za-z0-9][A-Za-z0-9'’-]*)/).map((part, i) => {
    if (i % 2 === 0) return esc(part);
    const s = stem(part);
    return hitS.has(s) ? `<mark class="hit">${esc(part)}</mark>` : missS.has(s) ? `<mark class="miss">${esc(part)}</mark>` : esc(part);
  }).join('');
}
function blurtResult(box) {
  const n = S.notes.find(x => x.id === BL.noteId), r = BL.result;
  if (!n || !r) { BL.phase = 'pick'; return renderBlurt(box); }
  const hist = S.blurts.filter(b => b.noteId === n.id).slice(-6);
  const msg = r.score >= 85 ? 'Brilliant recall — you really know this.' : r.score >= 60 ? 'Solid! Fill the gaps below and it\'ll stick.' : r.score >= 35 ? 'Good start. Blurting is how memories get stronger.' : 'That\'s okay — now you know exactly what to learn.';
  const C = 2 * Math.PI * 52;
  const missedPairs = notePairs(n.body).filter(([q]) => r.miss.some(t => t.label.toLowerCase() === q.toLowerCase()));
  box.innerHTML = `
    <section class="card blurt-result">
      <div class="score-ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="ring-bg"/><circle cx="60" cy="60" r="52" class="ring-fg" style="stroke-dasharray:${C};stroke-dashoffset:${C * (1 - r.score / 100)}"/></svg><div><b>${r.score}%</b><span>recalled</span></div></div>
      <div class="grow">
        <p class="eyebrow">${esc(n.title || 'Untitled')}</p><h2 class="serif" style="font-size:24px">${msg}</h2>
        <p class="muted">${r.hit.length} of ${r.hit.length + r.miss.length} key ideas · ${r.words} words written</p>
        ${hist.length > 1 ? `<div class="hist">${hist.map(b => `<span title="${fmtDate(b.date)}"><i style="height:${Math.max(6, b.score * 0.5)}px"></i>${b.score}</span>`).join('')}<em>your last ${hist.length} tries</em></div>` : ''}
      </div>
    </section>
    <div class="grid blurt-cols">
      <section class="card"><h2>You remembered</h2><div class="chips">${r.hit.map(t => `<span class="kchip hit">${esc(t.label)}</span>`).join('') || '<span class="muted">Nothing matched yet — that\'s fine.</span>'}</div></section>
      <section class="card"><h2>You missed</h2><div class="chips">${r.miss.map(t => `<span class="kchip miss">${esc(t.label)}</span>`).join('') || '<span class="muted">Nothing! Every key idea is there. ✨</span>'}</div></section>
    </div>
    <section class="card"><div class="card-head"><h2>Your note, checked</h2><span class="muted small"><mark class="hit">remembered</mark> <mark class="miss">missed</mark></span></div>
      <div class="note-check">${highlightNote(n.body, r)}</div></section>
    <div class="btn-row" style="margin-top:16px">
      <button class="btn primary" id="brAgain">Try again</button>
      ${missedPairs.length ? `<button class="btn" id="brCards">Practise the ${missedPairs.length} missed definition${missedPairs.length === 1 ? '' : 's'} as flashcards</button>` : ''}
      <button class="btn ghost" id="brBack">Pick another note</button>
    </div>
    <p class="muted small" style="margin-top:14px">Your answer: “${esc(BL.text.slice(0, 400))}${BL.text.length > 400 ? '…' : ''}”</p>`;
  $('#brAgain', box).onclick = () => startBlurt(n.id);
  $('#brBack', box).onclick = () => { BL.phase = 'pick'; renderBlurt(box); };
  const bc = $('#brCards', box);
  if (bc) bc.onclick = () => {
    makeCardsFromNote(n);
    const deck = S.decks.find(d => d.noteId === n.id);
    if (deck) { const qs = new Set(missedPairs.map(p => p[0].toLowerCase())); deck.cards.forEach(c => { if (qs.has(c.q.toLowerCase())) { c.due = todayStr(); c.box = 0; } }); save(); }
  };
}

/* =========================================================
   FLASHCARD QUIZ (multiple choice + typed answers)
   ========================================================= */
function normAns(s) { return String(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\b(the|a|an)\b/g, ' ').replace(/\s+/g, ' ').trim(); }
function lev(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
function fuzzyMatch(input, answer) {
  const a = normAns(input), b = normAns(answer);
  if (!a) return false;
  if (a === b) return true;
  const tol = Math.max(1, Math.floor(b.length * 0.2));
  if (Math.abs(a.length - b.length) <= tol && lev(a, b) <= tol) return true;
  if (a.length >= 4 && b.includes(a) && a.length >= b.length * 0.6) return true;
  if (b.length >= 4 && a.includes(b)) return true;
  return false;
}
function startQuiz(deck) {
  if (deck.cards.length < 2) { toast('Add at least 2 cards to quiz yourself'); return; }
  const list = shuffle(deck.cards.slice()).slice(0, 15).map(c => ({ id: c.id, mode: deck.cards.length >= 4 && Math.random() < 0.6 ? 'mc' : 'type' }));
  CU.study = null; CU.match = null;
  CU.quiz = { deckId: deck.id, list, i: 0, right: 0, wrong: [], state: null, opts: null, picked: null, typed: '' };
  render();
}
function quizAnswer(correct) {
  const qz = CU.quiz, deck = getDeck(qz.deckId), c = deck.cards.find(x => x.id === qz.list[qz.i].id);
  qz.state = correct ? 'right' : 'wrong';
  if (correct) qz.right++;
  else { qz.wrong.push(c.id); c.due = todayStr(); c.box = Math.max(0, c.box - 1); }
  logReview(); save(); render();
  if (correct) setTimeout(() => $('#qNext')?.focus(), 30);
}
function quizNext() { const qz = CU.quiz; qz.i++; qz.state = null; qz.opts = null; qz.picked = null; qz.typed = ''; render(); setTimeout(() => $('#qInput')?.focus(), 30); }
function renderQuiz(el) {
  const qz = CU.quiz, deck = getDeck(qz.deckId);
  if (!deck) { CU.quiz = null; return renderCards(); }
  const head = `<div class="study-progress"><div style="display:flex;justify-content:space-between;margin-bottom:8px"><a href="#cards" id="qQuit" class="muted">← ${esc(deck.name)}</a><span class="muted">${Math.min(qz.i + 1, qz.list.length)} / ${qz.list.length} · ${qz.right} correct</span></div>
    <div class="progress"><span style="width:${qz.i / qz.list.length * 100}%"></span></div></div>`;
  if (qz.i >= qz.list.length) {
    const pct = Math.round(qz.right / qz.list.length * 100);
    const wrongCards = qz.wrong.map(id => deck.cards.find(c => c.id === id)).filter(Boolean);
    el.innerHTML = `<div class="study" style="padding-top:30px">${ICON.stones.replace('class="stones"', 'class="stones" style="width:64px;height:64px;opacity:1"')}
      <h1>${pct >= 90 ? 'Outstanding!' : pct >= 70 ? 'Great work!' : pct >= 40 ? 'Nice effort!' : 'Keep going — you\'re learning!'}</h1>
      <p class="sub" style="text-align:center">${qz.right} of ${qz.list.length} correct (${pct}%)</p>
      ${wrongCards.length ? `<section class="card" style="width:min(600px,100%)"><h2 style="margin-bottom:10px">Worth another look</h2><p class="muted small" style="margin-top:-6px">These are now due in your review pile.</p>
        <ul class="card-list">${wrongCards.map(c => `<li style="grid-template-columns:1fr 1fr"><span>${esc(c.q)}</span><span class="a">${esc(c.a)}</span></li>`).join('')}</ul></section>` : ''}
      <div class="btn-row"><button class="btn primary" id="qAgain">Quiz again</button><button class="btn" id="qBack">Back to deck</button></div></div>`;
    $('#qAgain', el).onclick = () => startQuiz(deck);
    $('#qBack', el).onclick = () => { CU.quiz = null; render(); };
    return;
  }
  const item = qz.list[qz.i], c = deck.cards.find(x => x.id === item.id);
  if (!c) { qz.i++; return renderQuiz(el); }
  if (item.mode === 'mc' && !qz.opts) {
    const others = [...new Set(deck.cards.filter(x => x.id !== c.id && normAns(x.a) !== normAns(c.a)).map(x => x.a))];
    qz.opts = shuffle([c.a, ...shuffle(others).slice(0, 3)]);
  }
  const fb = qz.state === 'right' ? `<b>Correct ✨</b>${item.mode === 'type' && normAns(qz.typed) !== normAns(c.a) ? ` — the full answer is “${esc(c.a)}”` : ''}`
    : qz.state === 'wrong' ? `Not quite. The answer is <b>${esc(c.a)}</b>${item.mode === 'type' ? ' <button class="linkish" id="qOverride">I was right</button>' : ''}` : '';
  el.innerHTML = `<div class="study">${head}
    <div class="quiz-card"><small>${item.mode === 'mc' ? 'Choose the right answer' : 'Type the answer'}</small><div class="quiz-q">${esc(c.q)}</div>
      <button class="icon-btn quiz-speak" id="qSpeak" aria-label="Read question aloud">${ICON2.speak}</button></div>
    ${item.mode === 'mc'
      ? `<div class="quiz-opts">${qz.opts.map((o, k) => {
          const cls = qz.state ? (o === c.a ? 'right' : (o === qz.picked ? 'wrong' : 'dim')) : '';
          return `<button class="quiz-opt ${cls}" data-o="${k}" ${qz.state ? 'disabled' : ''}><kbd>${k + 1}</kbd><span>${esc(o)}</span></button>`;
        }).join('')}</div>`
      : `<form id="qForm" class="quiz-type ${qz.state || ''}"><input id="qInput" class="input" placeholder="Your answer…" value="${esc(qz.typed)}" ${qz.state ? 'disabled' : ''} autocomplete="off" spellcheck="false">${qz.state ? '' : '<button class="btn primary">Check</button>'}</form>`}
    <div class="quiz-feedback ${qz.state || ''}" role="status">${fb}</div>
    ${qz.state ? `<button class="btn primary" id="qNext">${qz.i + 1 < qz.list.length ? 'Next question' : 'See results'} →</button><p class="kbd"><kbd>Enter</kbd> next</p>` : item.mode === 'mc' ? '<p class="kbd"><kbd>1</kbd>–<kbd>4</kbd> to answer</p>' : ''}
  </div>`;
  $('#qQuit', el).onclick = e => { e.preventDefault(); CU.quiz = null; render(); };
  $('#qSpeak', el).onclick = () => speak(c.q);
  $$('[data-o]', el).forEach(b => b.onclick = () => { const o = qz.opts[+b.dataset.o]; qz.picked = o; quizAnswer(o === c.a); });
  const f = $('#qForm', el);
  if (f) f.onsubmit = e => { e.preventDefault(); if (qz.state) return; qz.typed = $('#qInput', el).value; if (!qz.typed.trim()) return; quizAnswer(fuzzyMatch(qz.typed, c.a)); };
  const ov = $('#qOverride', el);
  if (ov) ov.onclick = () => { qz.state = 'right'; qz.right++; qz.wrong = qz.wrong.filter(id => id !== c.id); c.due = ymd(addDays(new Date(), 1)); save(); render(); };
  const nx = $('#qNext', el); if (nx) nx.onclick = quizNext;
}

/* =========================================================
   MATCH GAME (timed)
   ========================================================= */
function startMatch(deck) {
  if (deck.cards.length < 3) { toast('Add at least 3 cards to play Match'); return; }
  const pick = shuffle(deck.cards.slice()).slice(0, 6);
  const tiles = shuffle(pick.flatMap(c => [{ k: c.id + ':q', pair: c.id, text: c.q, side: 'q' }, { k: c.id + ':a', pair: c.id, text: c.a, side: 'a' }]));
  CU.study = null; CU.quiz = null;
  CU.match = { deckId: deck.id, tiles, sel: null, done: [], start: Date.now(), penalty: 0, finished: null, record: false };
  render();
}
function matchTime() { const m = CU.match; return ((m.finished ?? (Date.now() - m.start) / 1000 + m.penalty)); }
function renderMatch(el) {
  const m = CU.match, deck = getDeck(m.deckId);
  if (!deck) { CU.match = null; return renderCards(); }
  const best = S.matchBest[deck.id];
  if (m.finished != null) {
    el.innerHTML = `<div class="study" style="padding-top:30px">${ICON.stones.replace('class="stones"', 'class="stones" style="width:64px;height:64px;opacity:1"')}
      <h1>${m.record ? 'New personal best!' : 'All matched!'}</h1>
      <p class="sub" style="text-align:center">${m.finished.toFixed(1)} seconds${m.penalty ? ` (including ${m.penalty}s for wrong pairs)` : ''}${best != null && !m.record ? ` · best ${best.toFixed(1)}s` : ''}</p>
      <div class="btn-row"><button class="btn primary" id="mAgain">Play again</button><button class="btn" id="mBack">Back to deck</button></div></div>`;
    $('#mAgain', el).onclick = () => startMatch(deck);
    $('#mBack', el).onclick = () => { CU.match = null; render(); };
    return;
  }
  el.innerHTML = `<div class="study">
    <div class="study-progress"><div style="display:flex;justify-content:space-between;align-items:center"><a href="#cards" id="mQuit" class="muted">← ${esc(deck.name)}</a>
      <span class="match-time" id="mTime">0.0s</span><span class="muted">${best != null ? `Best ${best.toFixed(1)}s` : 'No best yet'}</span></div></div>
    <p class="muted" style="margin:0">Tap a term, then its matching answer. Wrong pairs add a second.</p>
    <div class="match-grid">${m.tiles.map(t => `<button class="mtile side-${t.side} ${m.done.includes(t.pair) ? 'gone' : ''} ${m.sel === t.k ? 'sel' : ''}" data-k="${t.k}" ${m.done.includes(t.pair) ? 'disabled tabindex="-1"' : ''}>${esc(t.text)}</button>`).join('')}</div>
  </div>`;
  $('#mQuit', el).onclick = e => { e.preventDefault(); CU.match = null; render(); };
  $$('.mtile', el).forEach(b => b.onclick = () => {
    const t = m.tiles.find(x => x.k === b.dataset.k);
    if (!m.sel || m.sel === t.k) { m.sel = m.sel === t.k ? null : t.k; return renderMatch(el); }
    const s = m.tiles.find(x => x.k === m.sel);
    if (s.side === t.side) { m.sel = t.k; return renderMatch(el); }
    if (s.pair === t.pair) {
      m.done.push(t.pair); m.sel = null;
      if (m.done.length * 2 === m.tiles.length) {
        m.finished = (Date.now() - m.start) / 1000 + m.penalty;
        if (best == null || m.finished < best) { S.matchBest[deck.id] = m.finished; m.record = best != null; }
        logReview(m.tiles.length / 2); save(); chime();
      }
      return renderMatch(el);
    }
    m.penalty += 1; m.sel = null;
    const other = $(`.mtile[data-k="${CSS.escape(s.k)}"]`, el);
    b.classList.add('bad'); other?.classList.add('bad'); b.classList.remove('sel'); other?.classList.remove('sel');
    setTimeout(() => { if (CU.match === m) renderMatch(el); }, 450);
  });
}

/* =========================================================
   IMPORT CARDS (Quizlet export, spreadsheets, plain lists)
   ========================================================= */
function parseImport(text) {
  return String(text).split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => {
    for (const sep of ['\t', ' :: ', '::', ' - ', ' – ', ' — ', ': ', ' = ', ',']) {
      const i = l.indexOf(sep);
      if (i > 0) return [l.slice(0, i).trim(), l.slice(i + sep.length).trim()];
    }
    return null;
  }).filter(p => p && p[0] && p[1]);
}
function openImport(deck) {
  const m = $('#modal');
  m.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="imTitle">
    <div class="card-head"><h2 id="imTitle">Import cards</h2><button class="icon-btn" data-close aria-label="Close">${ICON.x}</button></div>
    <p class="muted" style="margin-top:-6px">Paste one card per line: <b>term</b>, then a tab, <code>::</code>, <code> - </code>, <code>: </code> or a comma, then the <b>answer</b>. Works with Quizlet exports and copied spreadsheet columns.</p>
    <label class="field"><span>Cards</span><textarea id="imText" rows="9" placeholder="Mitochondria :: powerhouse of the cell&#10;Le chat - the cat&#10;H2O, water"></textarea></label>
    <p class="muted small" id="imCount">0 cards found</p>
    <div class="modal-actions"><span class="grow"></span><button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="imGo" disabled>Import</button></div></div>`;
  m.classList.add('open'); m.setAttribute('aria-hidden', 'false');
  $$('[data-close]', m).forEach(b => b.onclick = closeModal);
  const ta = $('#imText', m);
  ta.oninput = () => { const n = parseImport(ta.value).length; $('#imCount', m).textContent = `${n} card${n === 1 ? '' : 's'} found`; $('#imGo', m).disabled = !n; };
  $('#imGo', m).onclick = () => {
    const pairs = parseImport(ta.value);
    pairs.forEach(([q, a]) => deck.cards.push(mkCard(q.slice(0, 300), a.slice(0, 500))));
    save(); closeModal(); render(); toast(`Imported ${pairs.length} card${pairs.length === 1 ? '' : 's'}`);
  };
  setTimeout(() => ta.focus(), 60);
}

/* =========================================================
   INSIGHTS
   ========================================================= */
function renderInsights() {
  const el = $('#view-insights'), t = todayStr();
  const focusBy = {}; S.focusLog.forEach(f => { focusBy[f.date] = (focusBy[f.date] || 0) + f.minutes; });
  const rev = S.reviewLog || {};
  const weeks = window.innerWidth > 1200 ? 32 : window.innerWidth > 900 ? 24 : 16, now = new Date();
  const startMon = addDays(now, -((now.getDay() + 6) % 7) - (weeks - 1) * 7);
  let cols = '', monthLabels = '', lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    const wkStart = addDays(startMon, w * 7);
    monthLabels += `<span>${wkStart.getMonth() !== lastMonth ? wkStart.toLocaleDateString(undefined, { month: 'short' }) : ''}</span>`;
    lastMonth = wkStart.getMonth();
    cols += '<div class="hm-col">';
    for (let d = 0; d < 7; d++) {
      const ds = ymd(addDays(startMon, w * 7 + d));
      const v = (focusBy[ds] || 0) + (rev[ds] || 0) * 0.5;
      const lvl = v === 0 ? 0 : v < 15 ? 1 : v < 45 ? 2 : v < 90 ? 3 : 4;
      cols += `<i class="hm l${lvl} ${ds > t ? 'fut' : ''} ${ds === t ? 'now' : ''}" title="${fmtDate(ds)} · ${focusBy[ds] || 0} min focus · ${rev[ds] || 0} cards"></i>`;
    }
    cols += '</div>';
  }
  const since = n => ymd(addDays(now, -n));
  const totalMin = S.focusLog.reduce((a, f) => a + f.minutes, 0);
  const min30 = S.focusLog.filter(f => f.date >= since(29)).reduce((a, f) => a + f.minutes, 0);
  const rev30 = Object.entries(rev).filter(([d]) => d >= since(29)).reduce((a, [, n]) => a + n, 0);
  const allCards = S.decks.flatMap(d => d.cards), mastered = allCards.filter(c => c.box >= 3).length;
  const due = S.decks.reduce((a, d) => a + dueCards(d).length, 0);
  const topicPct = S.topics.length ? Math.round(S.topics.filter(x => x.conf === 3).length / S.topics.length * 100) : 0;
  const blurts = S.blurts.slice(-8);
  const bySubj = {};
  S.focusLog.filter(f => f.date >= since(29)).forEach(f => { const k = f.subjectId || (f.taskId && getItem(f.taskId)?.subjectId) || '_'; bySubj[k] = (bySubj[k] || 0) + f.minutes; });
  const subjRows = Object.entries(bySubj).sort((a, b) => b[1] - a[1]);
  const maxS = Math.max(1, ...subjRows.map(r => r[1]));
  const byDow = [0, 0, 0, 0, 0, 0, 0]; S.focusLog.forEach(f => { byDow[parseYMD(f.date).getDay()] += f.minutes; });
  const bestDow = byDow.indexOf(Math.max(...byDow));
  const weak = [...S.topics].sort((a, b) => a.conf - b.conf || (a.updated || '').localeCompare(b.updated || '')).filter(x => x.conf < 3).slice(0, 6);
  const tips = [];
  if (due) tips.push(`${due} flashcard${due === 1 ? ' is' : 's are'} due for review today.`);
  if (totalMin && byDow[bestDow]) tips.push(`You focus most on ${['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'][bestDow]}.`);
  if (weak.length) tips.push(`Your weakest topic right now is “${weak[0].name}”.`);
  if (blurts.length >= 2 && blurts[blurts.length - 1].score > blurts[0].score) tips.push(`Your blurt scores are climbing — from ${blurts[0].score}% to ${blurts[blurts.length - 1].score}%.`);
  if (!tips.length) tips.push('Finish a focus session, review some flashcards or try a blurt test, and your insights will start to fill in.');

  el.innerHTML = `
    <header class="page-head"><p class="eyebrow">Insights</p><h1>How your learning is going</h1><p class="sub">${esc(tips[0])}</p></header>
    <div class="ins-stats">
      <div class="card stat-big"><b>${Math.round(totalMin / 6) / 10}</b><span>hours focused, all time</span></div>
      <div class="card stat-big"><b>${min30}</b><span>focus minutes, last 30 days</span></div>
      <div class="card stat-big"><b>${rev30}</b><span>cards reviewed, last 30 days</span></div>
      <div class="card stat-big"><b>${allCards.length ? Math.round(mastered / allCards.length * 100) : 0}%</b><span>of flashcards mastered</span></div>
      <div class="card stat-big"><b>${calcStreak()}</b><span>day study streak</span></div>
    </div>
    <section class="card"><div class="card-head"><h2>Study activity</h2><span class="muted small">last ${weeks} weeks</span></div>
      <div class="heatmap"><div class="hm-days"><span></span><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span></div>
        <div class="hm-main"><div class="hm-months">${monthLabels}</div><div class="hm-grid">${cols}</div></div></div>
      <div class="hm-legend">Less <i class="hm l0"></i><i class="hm l1"></i><i class="hm l2"></i><i class="hm l3"></i><i class="hm l4"></i> More</div>
    </section>
    <div class="grid ins-grid">
      <section class="card"><h2 style="margin-bottom:14px">Focus by subject <span class="muted small">· 30 days</span></h2>
        ${subjRows.map(([k, mins]) => { const s = subj(k); return `<div class="hbar"><span class="hb-label">${esc(s ? s.name : 'Other')}</span><span class="hb-track"><i style="width:${mins / maxS * 100}%;background:${s ? s.color : 'var(--muted)'}"></i></span><span class="hb-val">${mins}m</span></div>`; }).join('') || '<p class="muted small">Pick a task in the Focus timer and your minutes will be sorted by subject here.</p>'}
      </section>
      <section class="card"><div class="card-head"><h2>Needs attention</h2>${S.topics.length ? `<span class="pill">${topicPct}% confident</span>` : ''}</div>
        ${weak.length ? `<ul class="topic-list">${weak.map(x => `<li><i class="rag ${CONF[x.conf].cls}"></i><span class="tname">${esc(x.name)}</span><span class="tag" style="--c:${subjColor(x.subjectId)}">${esc(subj(x.subjectId)?.name || '')}</span></li>`).join('')}</ul>
          <button class="btn sm full" id="insPlan" style="margin-top:10px">Make a revision plan →</button>`
          : `<p class="muted small">${S.topics.length ? 'Every topic is green. Superb! ✨' : 'Add your topics in Study → Topics to see which need the most work.'}</p>`}
      </section>
      <section class="card"><h2 style="margin-bottom:14px">Blurt scores</h2>
        ${blurts.length ? `<div class="hist big">${blurts.map(b => `<span title="${esc(S.notes.find(n => n.id === b.noteId)?.title || '')} · ${fmtDate(b.date)}"><i style="height:${Math.max(6, b.score * 0.9)}px"></i>${b.score}</span>`).join('')}</div>`
          : '<p class="muted small">Try a blurt test in Study to see how your recall improves over time.</p>'}
      </section>
      <section class="card"><h2 style="margin-bottom:10px">Tips for you</h2><ul class="why">${tips.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>
    </div>`;
  const ip = $('#insPlan', el); if (ip) ip.onclick = () => openPlannerFor(weak[0].subjectId);
}

/* =========================================================
   TODAY PAGE — "Study next" card
   ========================================================= */
function todayStudyCard(el) {
  const stack = $('.stack', el); if (!stack) return;
  const dueDeck = S.decks.map(d => ({ d, n: dueCards(d).length })).filter(x => x.n).sort((a, b) => b.n - a.n);
  const due = dueDeck.reduce((a, x) => a + x.n, 0);
  const weak = [...S.topics].filter(t => t.conf < 3).sort((a, b) => a.conf - b.conf)[0];
  const note = [...S.notes].filter(n => keyTerms(n.body).length >= 3).sort((a, b) => {
    const la = S.blurts.filter(x => x.noteId === a.id).pop()?.at || 0, lb = S.blurts.filter(x => x.noteId === b.id).pop()?.at || 0; return la - lb;
  })[0];
  const sec = document.createElement('section');
  sec.className = 'card study-next';
  sec.innerHTML = `<div class="card-head"><h2>Study next</h2><span class="pill">${ICON2.spark.replace('<svg', '<svg style="width:13px;height:13px;vertical-align:-2px"')} picked for you</span></div>
    ${due ? `<div class="sn-row"><span class="sn-ic c1">${due}</span><div class="grow"><b>Flashcards due</b><span>${esc(dueDeck[0].d.name)}${dueDeck.length > 1 ? ` + ${dueDeck.length - 1} more` : ''}</span></div><button class="btn sm" id="snCards">Review</button></div>` : ''}
    ${weak ? `<div class="sn-row"><span class="sn-ic c2"><i class="rag ${CONF[weak.conf].cls}"></i></span><div class="grow"><b>${esc(weak.name)}</b><span>Your weakest ${esc(subj(weak.subjectId)?.name || '')} topic</span></div><button class="btn sm" id="snPlan">Plan</button></div>` : ''}
    ${note ? `<div class="sn-row"><span class="sn-ic c3">✎</span><div class="grow"><b>Blurt: ${esc(note.title)}</b><span>Test yourself in ${BL.mins} minutes</span></div><button class="btn sm" id="snBlurt">Start</button></div>` : ''}
    ${!due && !weak && !note ? '<p class="muted small" style="margin:0">Add topics, notes or flashcards in <b>Study</b> and Pebble will suggest what to do next.</p>' : ''}`;
  stack.insertBefore(sec, stack.children[1] || null);
  const c = $('#snCards', sec); if (c) c.onclick = () => { CU.deck = dueDeck[0].d.id; CU.quiz = null; CU.match = null; go('cards'); startStudy(dueDeck[0].d, false); };
  const p = $('#snPlan', sec); if (p) p.onclick = () => openPlannerFor(weak.subjectId);
  const b = $('#snBlurt', sec); if (b) b.onclick = () => startBlurt(note.id);
}

/* =========================================================
   keyboard + timers for the learning tools
   ========================================================= */
function learnKeys(e) {
  const typing = e.target.closest('input, textarea, select');
  if (view === 'cards' && CU.quiz) {
    const qz = CU.quiz;
    if (qz.i >= qz.list.length) return false;
    if (qz.state && e.key === 'Enter') { e.preventDefault(); quizNext(); return true; }
    if (typing) return true;
    if (!qz.state && qz.opts && /^[1-4]$/.test(e.key)) { const b = $(`[data-o="${+e.key - 1}"]`); if (b) b.click(); return true; }
    return /^[0-9]$/.test(e.key);
  }
  if (view === 'cards' && CU.match) return /^[0-9]$/.test(e.key);
  if (view === 'study' && BL.phase === 'write') return /^[0-9nN]$/.test(e.key) && !typing;
  return false;
}
function onLeaveView(from, to) {
  if (from !== to) stopSpeak();
}
setInterval(() => {
  if (BL.phase === 'write') {
    if (Date.now() >= BL.endAt) finishBlurt(); else updateBlurtTimer();
  }
  if (CU.match && CU.match.finished == null) { const el = $('#mTime'); if (el) el.textContent = matchTime().toFixed(1) + 's'; }
}, 100);
