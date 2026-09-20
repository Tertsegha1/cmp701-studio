// ─── Individual Workspace (private, per-student) ────────────────────
// Both CW1 and CW2 are INDIVIDUAL submissions (official brief). This tab is
// where a student declares their own assessed company (must differ from
// their Guild's practice company — see js/company.js) and works through
// the CW1/CW2 planning checklists. Nothing here is visible to other
// students; it lives under students/{sid}/individual, alongside the
// existing student record.
const APPROVED_COMPANIES = [
  'Zara', 'Mayo Clinic', 'JPMorgan Chase', 'General Electric', 'Tesla',
  'Verizon', 'Netflix', 'Marriott International', 'Coursera', 'FedEx'
];

const CW1_CHECKLIST = [
  { k: 'intro',      label: 'Introduction to your chosen business and its current digital-transformation state' },
  { k: 'outline',    label: 'Projected CW2 report outline / structure' },
  { k: 'lit',        label: 'High-level literature you plan to draw on' },
  { k: 'data',       label: 'Datasets and technologies you intend to use' },
  { k: 'prototype',  label: 'Any prototype work or preliminary analysis to show' },
  { k: 'artefacts',  label: 'Other supporting artefacts (charts, canvases, evidence)' }
];

const CW2_CHECKLIST = [
  { k: 'overview',   label: 'Business overview and current-state digital-maturity analysis' },
  { k: 'interface',  label: 'Business management / digital technologies interface — impact and strategy linkage' },
  { k: 'industry',   label: 'Industry analysis and case studies — structure and convergence' },
  { k: 'strategy',   label: 'Digital transformation strategy: technology solutions, customer networks, new business/revenue models, platforms, data-as-asset, social media' },
  { k: 'process',    label: 'Business process transformation' },
  { k: 'innovation', label: 'Innovation and knowledge management' },
  { k: 'reflection', label: 'Reflection on CW1 feedback received' }
];

function myIndividual() {
  if (!currentStudent || !appData.students[currentStudent]) return null;
  const s = appData.students[currentStudent];
  return s.individual || {};
}

async function saveIndividualField(path, value) {
  if (!currentStudent) return;
  await sRef('students/' + currentStudent + '/individual/' + path).set(value);
}

async function toggleCwChecklist(cw, key, checked) {
  await saveIndividualField(cw + 'Checklist/' + key, checked);
  toast('Saved', 'ok');
}

async function submitIndividualCompanyForm() {
  const sel = document.getElementById('indivCompanySelect').value;
  const other = document.getElementById('indivCompanyOther').value.trim();
  const rationale = document.getElementById('indivCompanyRationale').value.trim();
  const name = sel === '__other__' ? other : sel;
  const result = await declareIndividualCompany(currentStudent, name, rationale);
  if (!result.ok) { toast(result.msg, 'err'); return; }
  toast('Individual company saved' + (sel === '__other__' ? ' — flagged for Module Coordinator approval' : ''), 'ok');
  renderIndividualWorkspace();
}

// ─── Rehearsal timer for CW1 (7–8 min target) ──────────────────────
let _timerStart = null, _timerInterval = null;

function toggleRehearsalTimer() {
  const btn = document.getElementById('timerBtn');
  if (_timerInterval) {
    clearInterval(_timerInterval);
    _timerInterval = null;
    const elapsed = Date.now() - _timerStart;
    logRehearsal(elapsed);
    btn.textContent = '▶ Start Rehearsal';
    btn.classList.remove('btn-danger');
    btn.classList.add('btn-primary');
    return;
  }
  _timerStart = Date.now();
  btn.textContent = '■ Stop Rehearsal';
  btn.classList.remove('btn-primary');
  btn.classList.add('btn-danger');
  _timerInterval = setInterval(() => {
    const secs = Math.floor((Date.now() - _timerStart) / 1000);
    const m = Math.floor(secs / 60), s = secs % 60;
    document.getElementById('timerDisplay').textContent = `${m}:${String(s).padStart(2,'0')}`;
  }, 250);
}

async function logRehearsal(ms) {
  const mins = +(ms / 60000).toFixed(2);
  const log = (myIndividual().cw1TimerLog) || [];
  log.push({ mins, ts: Date.now() });
  await saveIndividualField('cw1TimerLog', log);
  renderIndividualWorkspace();
}

function cw2WordCount() {
  const text = document.getElementById('cw2DraftText') ? document.getElementById('cw2DraftText').value : '';
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function updateCw2WordCount() {
  const n = cw2WordCount();
  const el = document.getElementById('cw2WordCountLabel');
  if (!el) return;
  const limit = 3000, margin = limit * 1.1;
  let cls = 'b-green', msg = 'within limit';
  if (n > limit && n <= margin) { cls = 'b-amber'; msg = 'within +10% margin'; }
  else if (n > margin) { cls = 'b-red'; msg = 'over the +10% margin — marking stops at the limit point'; }
  el.innerHTML = `<span class="b ${cls}">${n} / 3000 words — ${msg}</span>`;
}

async function saveCw2Draft() {
  await saveIndividualField('cw2Draft', document.getElementById('cw2DraftText').value);
  toast('Draft saved', 'ok');
}

async function saveCw1Outline() {
  await saveIndividualField('cw1Outline', document.getElementById('cw1OutlineText').value);
  toast('Outline saved', 'ok');
}

async function saveCw1Feedback() {
  await saveIndividualField('cw1FeedbackNotes', document.getElementById('cw1FeedbackText').value);
  toast('Saved', 'ok');
}

async function saveCw2Reflection() {
  await saveIndividualField('cw2ReflectionText', document.getElementById('cw2ReflectionInput').value);
  toast('Reflection saved', 'ok');
}

// ─── Render ─────────────────────────────────────────────────────────
function renderIndividualWorkspace() {
  const body = document.getElementById('individualWorkspaceBody');
  if (!body) return;

  if (!currentStudent || !appData.students[currentStudent]) {
    body.innerHTML = '<p style="color:#94a3b8;font-size:12px">Select your name at the top of the page first.</p>';
    return;
  }

  const s = appData.students[currentStudent];
  const ind = s.individual || {};
  const conflict = studentCompanyConflict(currentStudent);
  const guildCompany = s.guildId ? guildCompanyOf(s.guildId) : null;

  const companyOptions = APPROVED_COMPANIES.map(c =>
    `<option value="${c}" ${s.business === c ? 'selected' : ''}>${c}</option>`
  ).join('') + `<option value="__other__" ${s.business && !APPROVED_COMPANIES.includes(s.business) ? 'selected' : ''}>Other (needs Module Coordinator approval)</option>`;

  const cw1Log = (ind.cw1TimerLog || []).slice(-5).reverse();
  const cw1LogHTML = cw1Log.length
    ? cw1Log.map(l => `<span class="b ${l.mins >= 7 && l.mins <= 8 ? 'b-green' : 'b-amber'}">${l.mins} min</span>`).join(' ')
    : '<span style="color:#94a3b8;font-size:11px">No rehearsals logged yet</span>';

  const cw1Items = CW1_CHECKLIST.map(item => `
    <label style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:12px">
      <input type="checkbox" ${ind.cw1Checklist && ind.cw1Checklist[item.k] ? 'checked' : ''}
        onchange="toggleCwChecklist('cw1','${item.k}',this.checked)">
      ${item.label}
    </label>`).join('');

  const cw2Items = CW2_CHECKLIST.map(item => `
    <label style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:12px">
      <input type="checkbox" ${ind.cw2Checklist && ind.cw2Checklist[item.k] ? 'checked' : ''}
        onchange="toggleCwChecklist('cw2','${item.k}',this.checked)">
      ${item.label}
    </label>`).join('');

  body.innerHTML = `
    <div class="alert alert-info"><strong>This is your private workspace.</strong> Guild quests are shared, formative exemplars using your Guild's practice company. CW1 and CW2 are individual — build fresh analysis here for your own chosen organisation.</div>

    <div class="card">
      <div class="card-hdr blue">Your Individual Company (CW1 &amp; CW2)</div>
      <div class="card-body">
        ${guildCompany && guildCompany.name ? `<div style="font-size:11px;color:#64748b;margin-bottom:10px">Your Guild's practice company is <strong>${guildCompany.name}</strong> — your individual company must be different.</div>` : ''}
        ${conflict ? `<div class="alert" style="background:#fee2e2;color:#B91C1C;border:1px solid #fca5a5">⚠ Conflict: "${s.business}" matches your Guild's practice company. Choose a different organisation below.</div>` : ''}
        <div class="form-row">
          <div class="form-group">
            <label>Choose your company</label>
            <select id="indivCompanySelect" onchange="document.getElementById('indivCompanyOtherWrap').style.display = this.value==='__other__' ? 'block' : 'none'">
              <option value="">— Select —</option>${companyOptions}
            </select>
          </div>
        </div>
        <div id="indivCompanyOtherWrap" style="display:${s.business && !APPROVED_COMPANIES.includes(s.business) ? 'block' : 'none'}">
          <div class="form-group" style="margin-bottom:10px"><label>Company name (pending MC approval)</label>
            <input type="text" id="indivCompanyOther" value="${s.business && !APPROVED_COMPANIES.includes(s.business) ? s.business : ''}"></div>
        </div>
        <div class="form-group" style="margin-bottom:10px">
          <label>Why this company / any notes</label>
          <textarea id="indivCompanyRationale" rows="2">${(s.individualCompanyDetail && s.individualCompanyDetail.rationale) || ''}</textarea>
        </div>
        <button class="btn btn-primary btn-sm" onclick="submitIndividualCompanyForm()">Save My Company</button>
        ${s.business ? `<span style="margin-left:10px;font-size:11px;color:#64748b">Currently: <strong>${s.business}</strong></span>` : ''}
      </div>
    </div>

    <div class="card">
      <div class="card-hdr teal">CW1 Planner — 7–8 min Video (25%)</div>
      <div class="card-body">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-bottom:6px">Content checklist</p>
        ${cw1Items}
        <div class="form-group" style="margin:12px 0"><label>Outline / script notes</label>
          <textarea id="cw1OutlineText" rows="4">${ind.cw1Outline || ''}</textarea></div>
        <button class="btn btn-ghost btn-sm" onclick="saveCw1Outline()">Save Outline</button>
        <hr style="margin:14px 0;border:none;border-top:1px solid #e2e8f0">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-bottom:6px">Timed rehearsal (target 7–8 min)</p>
        <div style="display:flex;align-items:center;gap:12px">
          <button class="btn btn-primary btn-sm" id="timerBtn" onclick="toggleRehearsalTimer()">▶ Start Rehearsal</button>
          <span id="timerDisplay" style="font-size:20px;font-weight:800;color:#1B3A6B">0:00</span>
        </div>
        <div style="margin-top:8px">Recent: ${cw1LogHTML}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-hdr purple">CW2 Planner — 3,000-word Report (75%)</div>
      <div class="card-body">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-bottom:6px">Content checklist</p>
        ${cw2Items}
        <div class="form-group" style="margin:12px 0">
          <label>Draft text (paste here to track word count — not submitted anywhere)</label>
          <textarea id="cw2DraftText" rows="6" oninput="updateCw2WordCount()">${ind.cw2Draft || ''}</textarea>
        </div>
        <div id="cw2WordCountLabel" style="margin-bottom:8px"></div>
        <button class="btn btn-ghost btn-sm" onclick="saveCw2Draft()">Save Draft</button>
      </div>
    </div>

    <div class="card">
      <div class="card-hdr amber">CW1 Feedback → CW2 Reflection</div>
      <div class="card-body">
        <div class="form-group" style="margin-bottom:10px"><label>Paste your CW1 written feedback here for reference</label>
          <textarea id="cw1FeedbackText" rows="3">${ind.cw1FeedbackNotes || ''}</textarea></div>
        <button class="btn btn-ghost btn-sm" onclick="saveCw1Feedback()">Save</button>
        <div class="form-group" style="margin:12px 0 10px"><label>How you responded to that feedback in CW2 (required CW2 section)</label>
          <textarea id="cw2ReflectionInput" rows="3">${ind.cw2ReflectionText || ''}</textarea></div>
        <button class="btn btn-ghost btn-sm" onclick="saveCw2Reflection()">Save Reflection</button>
      </div>
    </div>`;

  setTimeout(updateCw2WordCount, 0);
}
