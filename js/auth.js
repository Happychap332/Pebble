/* =========================================================
   Pebble — sign in / create account
   Accounts live in this browser (GitHub Pages has no server).
   Passwords are never stored: only a salted PBKDF2 hash.
   Each account's planner data is stored separately.
   ========================================================= */
(function () {
  'use strict';
  const AKEY = 'pebble:accounts', SKEY = 'pebble:session', OLD_DATA = 'pebble:v1';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const enc = new TextEncoder();
  const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  const randHex = (n = 16) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return hex(a); };
  const norm = u => String(u || '').trim().toLowerCase();

  async function hashPw(pw, salt) {
    const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 150000, hash: 'SHA-256' }, key, 256);
    return hex(bits);
  }
  const accounts = () => { try { return JSON.parse(localStorage.getItem(AKEY)) || []; } catch (e) { return []; } };
  const saveAccounts = a => localStorage.setItem(AKEY, JSON.stringify(a));
  const findUser = u => accounts().find(a => a.username === norm(u));
  const publicAcc = a => ({ id: a.id, username: a.username, name: a.name });

  function getSession() {
    try { return JSON.parse(sessionStorage.getItem(SKEY) || localStorage.getItem(SKEY) || 'null'); } catch (e) { return null; }
  }
  function setSession(id, remember) {
    clearSession();
    (remember ? localStorage : sessionStorage).setItem(SKEY, JSON.stringify({ id, at: Date.now() }));
  }
  function clearSession() { localStorage.removeItem(SKEY); sessionStorage.removeItem(SKEY); }

  let current = null;
  function enter(acc) {
    current = acc;
    $('#auth').innerHTML = '';
    $('#auth').hidden = true;
    document.body.classList.remove('locked');
    window.startPebble(publicAcc(acc));
  }

  /* ---------- account actions ---------- */
  async function signUp({ name, username, password, remember }) {
    const u = norm(username);
    if (!name.trim()) return 'Please tell us your name.';
    if (!/^[a-z0-9._-]{3,24}$/.test(u)) return 'Usernames are 3–24 characters: letters, numbers, dots, dashes or underscores.';
    if (password.length < 6) return 'Use at least 6 characters for your password.';
    if (findUser(u)) return 'That username is already taken on this device.';
    const salt = randHex();
    const acc = { id: randHex(8), username: u, name: name.trim().slice(0, 40), salt, hash: await hashPw(password, salt), created: Date.now() };
    const list = accounts();
    // The very first account keeps any planner data from before accounts existed.
    if (!list.length && localStorage.getItem(OLD_DATA)) {
      localStorage.setItem('pebble:data:' + acc.id, localStorage.getItem(OLD_DATA));
      localStorage.removeItem(OLD_DATA);
    }
    list.push(acc); saveAccounts(list);
    setSession(acc.id, remember);
    enter(acc);
    return null;
  }

  const attempts = { n: 0, until: 0 };
  async function signIn({ username, password, remember }) {
    if (Date.now() < attempts.until) return `Too many tries. Please wait ${Math.ceil((attempts.until - Date.now()) / 1000)} seconds.`;
    const acc = findUser(username);
    const ok = acc && (await hashPw(password, acc.salt)) === acc.hash;
    if (!ok) {
      attempts.n++;
      if (attempts.n >= 5) { attempts.until = Date.now() + 30000; attempts.n = 0; }
      return acc ? 'That password isn\'t right.' : 'No account with that username on this device.';
    }
    attempts.n = 0;
    setSession(acc.id, remember);
    enter(acc);
    return null;
  }

  window.PebbleAuth = {
    logout() { clearSession(); location.hash = ''; location.reload(); },
    async changePassword(cur, next) {
      const list = accounts(), acc = list.find(a => a.id === current?.id);
      if (!acc) return { ok: false, error: 'Not signed in.' };
      if ((await hashPw(cur, acc.salt)) !== acc.hash) return { ok: false, error: 'Current password isn\'t right.' };
      if (String(next).length < 6) return { ok: false, error: 'New password needs at least 6 characters.' };
      acc.salt = randHex(); acc.hash = await hashPw(next, acc.salt); saveAccounts(list);
      return { ok: true };
    },
    async deleteAccount(pw) {
      const list = accounts(), acc = list.find(a => a.id === current?.id);
      if (!acc) return { ok: false, error: 'Not signed in.' };
      if ((await hashPw(pw, acc.salt)) !== acc.hash) return { ok: false, error: 'That password isn\'t right — account not deleted.' };
      localStorage.removeItem('pebble:data:' + acc.id);
      saveAccounts(list.filter(a => a.id !== acc.id));
      clearSession(); location.hash = ''; location.reload();
      return { ok: true };
    },
  };

  /* ---------- UI ---------- */
  const EYE = '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  let mode = accounts().length ? 'signin' : 'signup';
  let prefill = '';

  function render() {
    const list = accounts();
    const root = $('#auth');
    root.innerHTML = `
      <div class="auth-wrap">
        <section class="auth-hero" aria-hidden="true">
          <div class="auth-brand"><img src="assets/logo.svg" alt="" width="44" height="44"><span>Pebble</span></div>
          <div class="auth-hero-body">
            <h1>Plan calmly.<br>Study steadily.</h1>
            <p>Your calendar, to-dos, focus timer and flashcards in one quiet place.</p>
            <ul class="auth-points">
              <li><i style="--c:var(--accent)"></i>A heads-up about tomorrow, every evening</li>
              <li><i style="--c:var(--lav)"></i>Focus sessions with relaxing sounds</li>
              <li><i style="--c:var(--peach)"></i>Flashcards that help you remember</li>
            </ul>
          </div>
          <div class="auth-stones"><span class="s1"></span><span class="s2"></span><span class="s3"></span></div>
        </section>

        <section class="auth-panel">
          <div class="auth-card">
            <div class="auth-mobile-brand"><img src="assets/logo.svg" alt="" width="40" height="40"><span>Pebble</span></div>
            ${mode === 'forgot' ? forgotHTML(list) : formHTML(list)}
          </div>
          <p class="auth-foot">Your account and planner are saved privately in this browser.</p>
        </section>
      </div>`;
    bind(root);
  }

  function formHTML(list) {
    const up = mode === 'signup';
    return `
      <h2>${up ? 'Create your account' : 'Welcome back'}</h2>
      <p class="muted">${up ? 'It takes ten seconds. No email needed.' : 'Sign in to pick up where you left off.'}</p>
      ${!up && list.length ? `<div class="auth-people">${list.slice(0, 6).map(a => `<button type="button" class="person ${norm(prefill) === a.username ? 'on' : ''}" data-user="${esc(a.username)}"><span class="av">${esc((a.name || a.username)[0].toUpperCase())}</span><span>${esc(a.name.split(' ')[0])}</span></button>`).join('')}</div>` : ''}
      <form id="authForm" novalidate>
        ${up ? `<label class="field"><span>Your name</span><input name="name" autocomplete="name" placeholder="e.g. Alex Morgan" maxlength="40" required></label>` : ''}
        <label class="field"><span>Username</span><input name="username" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="${up ? 'Pick a username' : 'Your username'}" value="${esc(prefill)}" required></label>
        <label class="field"><span>Password</span>
          <span class="pw"><input name="password" type="password" autocomplete="${up ? 'new-password' : 'current-password'}" placeholder="${up ? 'At least 6 characters' : 'Your password'}" required><button type="button" class="icon-btn" id="pwEye" aria-label="Show password">${EYE}</button></span></label>
        ${up ? `<label class="field"><span>Confirm password</span><input name="confirm" type="password" autocomplete="new-password" placeholder="Type it again" required></label>` : ''}
        <div class="auth-row">
          <label class="check-row"><input type="checkbox" name="remember" checked> Keep me signed in</label>
          ${!up ? '<button type="button" class="linkish" id="toForgot">Forgot password?</button>' : ''}
        </div>
        <p class="auth-error" id="authError" role="alert"></p>
        <button class="btn primary full big-ish" id="authSubmit">${up ? 'Create account' : 'Sign in'}</button>
      </form>
      <p class="auth-switch">${up
        ? (list.length ? 'Already have an account? <button type="button" class="linkish" data-mode="signin">Sign in</button>' : '')
        : 'New here? <button type="button" class="linkish" data-mode="signup">Create an account</button>'}</p>`;
  }

  function forgotHTML(list) {
    return `
      <h2>Forgot your password?</h2>
      <p class="muted">Pebble keeps accounts on this device only, so there's no email to reset it with — and nobody (not even us) can see your password.</p>
      <div class="note" style="margin:14px 0">
        <b>What you can do:</b><br>
        • Try any passwords you usually use — there's no limit, just a short pause after 5 tries.<br>
        • If you made a backup (Settings → Download backup), create a new account and restore it there.<br>
        • Or remove the old account from this device and start fresh. Its planner data will be deleted.
      </div>
      ${list.length ? `<label class="field"><span>Remove an account from this device</span>
        <select id="forgetUser" class="input">${list.map(a => `<option value="${esc(a.username)}">${esc(a.name)} (@${esc(a.username)})</option>`).join('')}</select></label>
        <button type="button" class="btn ghost danger full" id="forgetBtn">Remove account and its data</button>` : ''}
      <p class="auth-switch"><button type="button" class="linkish" data-mode="signin">← Back to sign in</button></p>`;
  }

  function bind(root) {
    root.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { mode = b.dataset.mode; render(); focusFirst(); });
    root.querySelectorAll('[data-user]').forEach(b => b.onclick = () => { prefill = b.dataset.user; render(); $('input[name=password]').focus(); });
    const forgot = $('#toForgot', root); if (forgot) forgot.onclick = () => { mode = 'forgot'; render(); };
    const eye = $('#pwEye', root);
    if (eye) eye.onclick = () => { const i = $('input[name=password]', root); i.type = i.type === 'password' ? 'text' : 'password'; eye.classList.toggle('on', i.type === 'text'); };
    const fb = $('#forgetBtn', root);
    if (fb) fb.onclick = () => {
      const u = $('#forgetUser', root).value, acc = findUser(u); if (!acc) return;
      if (!confirm(`Remove @${u} and delete all of its planner data from this device? This can't be undone.`)) return;
      localStorage.removeItem('pebble:data:' + acc.id);
      saveAccounts(accounts().filter(a => a.id !== acc.id));
      mode = accounts().length ? 'signin' : 'signup'; prefill = ''; render();
    };
    const form = $('#authForm', root);
    if (!form) return;
    form.onsubmit = async e => {
      e.preventDefault();
      const f = new FormData(form), err = $('#authError', root), btn = $('#authSubmit', root);
      const data = { name: f.get('name') || '', username: f.get('username') || '', password: f.get('password') || '', remember: !!f.get('remember') };
      err.textContent = '';
      if (!data.username.trim() || !data.password) { err.textContent = 'Please fill in your username and password.'; return; }
      if (mode === 'signup' && data.password !== f.get('confirm')) { err.textContent = 'Those passwords don\'t match.'; return; }
      if (!window.crypto?.subtle) { err.textContent = 'Sign-in needs a secure (https) page. Open Pebble from your GitHub Pages link.'; return; }
      btn.disabled = true; btn.textContent = mode === 'signup' ? 'Creating…' : 'Signing in…';
      const problem = mode === 'signup' ? await signUp(data) : await signIn(data);
      if (problem) {
        err.textContent = problem; btn.disabled = false; btn.textContent = mode === 'signup' ? 'Create account' : 'Sign in';
        form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
      }
    };
  }
  function focusFirst() { const i = $('#authForm input:not([value=""])') && $('#authForm input[name=password]') && prefill ? $('#authForm input[name=password]') : $('#authForm input'); if (i) i.focus(); }

  /* ---------- start ---------- */
  $('#logoutBtn').onclick = () => window.PebbleAuth.logout();
  const sess = getSession();
  const acc = sess && accounts().find(a => a.id === sess.id);
  if (acc) enter(acc);
  else { clearSession(); render(); focusFirst(); }
})();
