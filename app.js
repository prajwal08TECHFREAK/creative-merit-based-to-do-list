(() => {
  const KEY = 'little-list-tasks-v1', PROFILE = 'little-list-profile-v1';
  const $ = s => document.querySelector(s);
  const form = $('#task-form'), input = $('#task-input'), reminderDateInput = $('#reminder-date'), reminderTimeInput = $('#reminder-time');
  const list = $('#task-list'), hint = $('#form-hint'), today = $('#today');
  const safeRead = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  let tasks = safeRead(KEY, []);
  if (!Array.isArray(tasks)) tasks = [];
  let profile = safeRead(PROFILE, { points: 0, symbol: '🗿', events: [] });
  let preferences = safeRead('little-list-settings-v1', { mode: 'dark', theme: 'black-red', bg: '#171612', accent: '#ff3438', fontSize: 16 });
  let draftSettings;
  if (!profile || typeof profile !== 'object') profile = { points: 0, symbol: '🗿', events: [] };
  profile.events = Array.isArray(profile.events) ? profile.events : [];
  profile.points = Number(profile.points) || 0;
  const symbolSelect = $('#aura-symbol');
  symbolSelect.value = profile.symbol || '🗿';
  const dialog = $('#settings-dialog');
  const presets = { 'black-red': ['#171612','#ff3438'], 'white-orange': ['#f5f1e8','#f07828'], 'pink-green': ['#f8d9df','#23734e'], 'black-pink': ['#171612','#f05ca8'] };
  const modeSelect = $('#mode-setting'), themeSelect = $('#theme-setting');
  modeSelect.value = preferences.mode || 'dark'; themeSelect.value = preferences.theme || 'black-red';
  $('#background-color').value = preferences.bg || '#171612'; $('#accent-color').value = preferences.accent || '#ff3438';
  $('#font-size-setting').value = preferences.fontSize || 16; $('#font-size-output').value = `${preferences.fontSize || 16}px`;
  function applySettings() {
    const root = document.documentElement;
    let [bg, accent] = preferences.theme === 'custom' ? [preferences.bg, preferences.accent] : (presets[preferences.theme] || presets['black-red']);
    const light = preferences.mode === 'light';
    root.dataset.mode = preferences.mode;
    root.style.setProperty('--bg', bg); root.style.setProperty('--page-bg', preferences.theme === 'custom' ? bg : (light ? '#e8e2d7' : '#171612')); root.style.setProperty('--green', accent);
    root.style.setProperty('--green-dark', accent);
    root.style.setProperty('--paper', preferences.theme === 'custom' ? bg : (light ? '#fffdf8' : '#151515'));
    root.style.setProperty('--ink', light ? '#211d1b' : '#f3efdf');
    root.style.setProperty('--line', light ? '#c9c1b7' : '#4a453a');
    root.style.setProperty('--accent-contrast', light ? '#17120f' : '#151515');
    root.style.setProperty('--base-size', `${preferences.fontSize || 16}px`);
    document.body.style.zoom = String((preferences.fontSize || 16) / 16);
    $('#custom-colors').hidden = preferences.theme !== 'custom';
    save();
  }
  applySettings();
  today.textContent = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date());

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(tasks)); localStorage.setItem(PROFILE, JSON.stringify(profile)); localStorage.setItem('little-list-settings-v1', JSON.stringify(preferences)); }
    catch { hint.textContent = 'Storage is full — try a smaller photo or remove old tasks.'; }
  }
  function award(delta, task, reason) {
    profile.points += delta;
    profile.events.push({ at: Date.now(), delta, task, reason });
  }
  function recentTrend() {
    const since = Date.now() - 14 * 86400000;
    const events = profile.events.filter(e => e.at >= since);
    const net = events.reduce((sum, e) => sum + e.delta, 0);
    return net > 0 ? '📈 Rising aura over the last 14 days' : net < 0 ? '📉 Aura dipped over the last 14 days' : '➖ Your aura is holding steady';
  }
  function markOverdue() {
    let changed = false;
    tasks.forEach(task => {
      if (!task.completed && task.reminder && Date.now() > new Date(task.reminder).getTime() && !task.missedCharged) {
        task.missedCharged = true;
        award(-5, task.text, 'deadline missed');
        changed = true;
      }
    });
    if (changed) save();
  }
  function dayKey(value) { const d = new Date(value); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
  function fmt(date) { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(date)); }
  function render() {
    markOverdue();
    list.replaceChildren();
    tasks.forEach(task => {
      const item = document.createElement('li');
      item.className = `task-item${task.completed ? ' completed' : ''}${task.reminder && !task.completed && Date.now() > new Date(task.reminder).getTime() ? ' overdue' : ''}`;
      const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'task-toggle';
      toggle.setAttribute('aria-label', task.completed ? 'Completed task' : `Complete ${task.text}`); toggle.setAttribute('aria-pressed', String(!!task.completed));
      toggle.textContent = task.completed ? '✓' : '';
      if (!task.completed) toggle.addEventListener('click', () => {
        const now = Date.now(), due = task.reminder ? new Date(task.reminder).getTime() : null;
        task.completed = true; task.completedAt = now;
        const sameLocalDeadlineDate = due !== null && dayKey(now) === dayKey(due);
        const completedBeforeDeadlineDate = due !== null && dayKey(now) < dayKey(due);
        const pts = due === null || completedBeforeDeadlineDate ? 10 : sameLocalDeadlineDate ? 5 : 3;
        award(pts, task.text, due === null || now < due ? 'finished before deadline' : now === due ? 'finished on deadline' : 'finished after deadline');
        task.pointsEarned = pts; save(); render();
      });
      const content = document.createElement('div'); content.className = 'task-content';
      const title = document.createElement('span'); title.className = 'task-text'; title.textContent = task.text; content.append(title);
      const metadata = document.createElement('span'); metadata.className = 'task-meta';
      metadata.textContent = task.reminder ? `${task.completed ? '✓' : '◷'} ${task.completed ? `Finished ${fmt(task.completedAt)}` : `Due ${fmt(task.reminder)}`}` : (task.completed ? `✓ Finished ${fmt(task.completedAt)}` : 'NO DEADLINE · time is on your side');
      content.append(metadata);
      const summary = document.createElement('p'); summary.className = 'task-summary';
      summary.textContent = task.completed ? `DONE: “${task.summary || task.text}” · ${task.pointsEarned ?? 0} aura points earned.` : `SUMMARY: ${task.summary || task.text}${task.reminder ? ` — target ${fmt(task.reminder)}.` : '.'}`;
      content.append(summary);
      const progressWrap = document.createElement('div'); progressWrap.className = 'progress-wrap';
      const progress = document.createElement('div'); progress.className = 'progress-track'; progress.setAttribute('role','progressbar'); progress.setAttribute('aria-label',`Time until deadline for ${task.text}`); progress.setAttribute('aria-valuemin','0'); progress.setAttribute('aria-valuemax','100');
      let pct = 0;
      if (task.completed) pct = 100;
      else if (task.reminder) { const due = new Date(task.reminder).getTime(), start = new Date(task.createdAt || due - 86400000).getTime(); pct = Math.max(0, Math.min(100, ((Date.now() - start) / Math.max(1, due - start)) * 100)); }
      progress.setAttribute('aria-valuenow', String(Math.round(pct)));
      const fill = document.createElement('span'); fill.className = 'progress-fill'; fill.style.width = `${pct}%`; progress.append(fill);
      const progressLabel = document.createElement('span'); progressLabel.className = 'progress-label'; progressLabel.textContent = task.completed ? 'MISSION COMPLETE' : task.reminder ? `TIME ELAPSED ${Math.floor(pct)}%` : 'ADD A DEADLINE TO TRACK TIME';
      progressWrap.append(progress, progressLabel); content.append(progressWrap);
      if (task.completed) {
        const photoLabel = document.createElement('label'); photoLabel.className = 'photo-upload'; photoLabel.innerHTML = '<span>📸 ADD PROOF / PHOTOGRAPH</span>';
        const photoInput = document.createElement('input'); photoInput.type = 'file'; photoInput.accept = 'image/*'; photoInput.setAttribute('aria-label',`Add photograph for ${task.text}`);
        photoLabel.append(photoInput); content.append(photoLabel);
        if (task.photo) { const img = document.createElement('img'); img.className = 'task-photo'; img.src = task.photo; img.alt = `Photo for completed task: ${task.text}`; content.append(img); }
        photoInput.addEventListener('change', () => { const file = photoInput.files?.[0]; if (!file) return; if (file.size > 1200000) { hint.textContent = 'Please choose a photo under 1.2 MB so it can be saved locally.'; return; } const reader = new FileReader(); reader.onload = () => { task.photo = reader.result; save(); render(); }; reader.readAsDataURL(file); });
      }
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'delete-button'; remove.textContent = '×'; remove.title = 'Delete task'; remove.setAttribute('aria-label',`Delete ${task.text}`);
      remove.addEventListener('click', () => { tasks = tasks.filter(t => t.id !== task.id); save(); render(); });
      item.append(toggle, content, remove); list.append(item);
    });
    $('#task-count').textContent = tasks.length;
    const open = tasks.filter(t => !t.completed).length;
    $('#remaining-count').textContent = open ? `${open} ${open === 1 ? 'mission' : 'missions'} still in play` : tasks.length ? 'All missions complete. Iconic.' : 'You’ve got this.';
    $('#empty-state').hidden = tasks.length > 0;
    $('#clear-completed').hidden = !tasks.some(t => t.completed);
    $('#aura-score').textContent = profile.points;
    $('#aura-icon').textContent = profile.symbol || '🗿';
    $('#trend-label').textContent = recentTrend();
    $('#summary-total').textContent = `${tasks.length} ${tasks.length === 1 ? 'mission' : 'missions'} logged`;
    $('#summary-done').textContent = `${tasks.filter(t => t.completed).length} done / ${open} in progress`;
  }
  form.addEventListener('submit', e => {
    e.preventDefault(); const text = input.value.trim();
    if (!text) { hint.textContent = 'A mission needs a name. Type one first!'; input.focus(); return; }
    const dateValue = reminderDateInput.value, timeValue = reminderTimeInput.value;
    if (Boolean(dateValue) !== Boolean(timeValue)) { hint.textContent = 'Choose both a date and a time, or leave both blank.'; (dateValue ? reminderTimeInput : reminderDateInput).focus(); return; }
    const reminder = dateValue && timeValue ? `${dateValue}T${timeValue}` : '';
    const deadline = reminder ? new Date(reminder).getTime() : null;
    if (deadline && (!Number.isFinite(deadline) || deadline <= Date.now())) { hint.textContent = 'Pick a future date and time for this mission.'; reminderDateInput.focus(); return; }
    tasks.unshift({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, text, summary: text, reminder, createdAt: Date.now(), completed: false, missedCharged: false });
    save(); render(); input.value = ''; reminderDateInput.value = ''; reminderTimeInput.value = ''; hint.textContent = 'MISSION LOGGED. Go get it.'; input.focus();
  });
  $('#clear-completed').addEventListener('click', () => { tasks = tasks.filter(t => !t.completed); save(); render(); });
  symbolSelect.addEventListener('change', () => { profile.symbol = symbolSelect.value; save(); render(); });
  $('#settings-open').addEventListener('click', () => {
    draftSettings = { ...preferences };
    modeSelect.value = draftSettings.mode; themeSelect.value = draftSettings.theme;
    $('#background-color').value = draftSettings.bg; $('#accent-color').value = draftSettings.accent;
    $('#font-size-setting').value = draftSettings.fontSize; $('#font-size-output').value = `${draftSettings.fontSize}px`;
    $('#custom-colors').hidden = draftSettings.theme !== 'custom';
    $('#settings-status').textContent = 'Changes are not applied yet';
    dialog.showModal();
  });
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
  modeSelect.addEventListener('change', () => { draftSettings.mode = modeSelect.value; });
  themeSelect.addEventListener('change', () => { draftSettings.theme = themeSelect.value; if (presets[draftSettings.theme]) [draftSettings.bg, draftSettings.accent] = presets[draftSettings.theme]; $('#background-color').value = draftSettings.bg; $('#accent-color').value = draftSettings.accent; $('#custom-colors').hidden = draftSettings.theme !== 'custom'; });
  $('#background-color').addEventListener('input', e => { draftSettings.bg = e.target.value; });
  $('#accent-color').addEventListener('input', e => { draftSettings.accent = e.target.value; });
  $('#font-size-setting').addEventListener('input', e => { draftSettings.fontSize = Number(e.target.value); $('#font-size-output').value = `${draftSettings.fontSize}px`; });
  $('#settings-apply').addEventListener('click', () => { preferences = { ...draftSettings }; applySettings(); $('#settings-status').textContent = 'Settings applied ✓'; });
  render();
  setInterval(render, 30000);
})();
