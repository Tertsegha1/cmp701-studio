// ═══════════════════════════════════════════════════════════════════════
// STUDENT FEEDBACK SURVEY
//
// Students rate the Studio overall and each tool, say how it supported their
// learning, and suggest improvements. Responses are ANONYMOUS: they are stored at
// __feedback/{cohort}/{random id} with no student id, name or Guild, and students can
// never read them back (database rules, security/build_rules.py). A separate content-free
// "done" flag per student makes it one response per student. The Module Leader opens and
// closes the survey (config/feedbackOpen) and reads the results here.
//
// Each response records whether the student agreed to research use; the exports can be
// limited to consenting responses so only those are used in publications.
// ═══════════════════════════════════════════════════════════════════════

// Fill this in once the institution's research-ethics determination/reference is confirmed;
// it is then shown to students on the form.
const FEEDBACK_ETHICS_REF = '';

const FB_TOOLS = [
  { id: 'evidence',    label: 'Evidence Library',                group: 'Studio Tools' },
  { id: 'maturity',    label: 'Current State & Maturity',        group: 'Studio Tools' },
  { id: 'strategy',    label: 'Industry Strategy Suite',         group: 'Studio Tools' },
  { id: 'platform',    label: 'Platform & Customer Networks',    group: 'Studio Tools' },
  { id: 'data',        label: 'Data Workbench',                  group: 'Studio Tools' },
  { id: 'model',       label: 'Model Lab',                       group: 'Studio Tools' },
  { id: 'bmc',         label: 'Business Model & Revenue',        group: 'Studio Tools' },
  { id: 'process',     label: 'Process & Implementation',        group: 'Studio Tools' },
  { id: 'innovation',  label: 'Innovation & Knowledge',          group: 'Studio Tools' },
  { id: 'quest',       label: "Weekly Quest briefs",             group: 'Other features' },
  { id: 'submit',      label: 'Submit Artefact',                 group: 'Other features' },
  { id: 'peer',        label: 'Peer Review',                     group: 'Other features' },
  { id: 'ai',          label: 'AI Feedback',                     group: 'Other features' },
  { id: 'prototype',   label: 'Prototype Builder & LunchPoint',  group: 'Other features' },
  { id: 'gamification',label: 'XP, badges & leaderboard',        group: 'Other features' },
  { id: 'progress',    label: 'My Progress & certificate',       group: 'Other features' }
];

const FB_LIKERT = [
  { id: 'ease',        label: 'The Studio was easy to use.' },
  { id: 'reliable',    label: 'The Studio worked reliably (saving, loading, uploading).' },
  { id: 'apply',       label: "The Studio helped me apply the module's concepts to a real organisation." },
  { id: 'prepare',     label: 'The Studio helped me prepare for my CW1 and CW2.' },
  { id: 'collaborate', label: 'The Studio helped me work effectively with my Guild.' },
  { id: 'ontrack',     label: 'The weekly Quests helped me keep on track with the module.' },
  { id: 'peer',        label: "Peer review gave me useful perspectives on my Guild's work." },
  { id: 'analytic',    label: 'The data tools (Data Workbench and Model Lab) developed my analytical skills.' },
  { id: 'recommend',   label: 'I would recommend the Studio to students on a future cohort.' }
];

const FB_PROBLEMS = [
  { id: 'slow',     label: 'Pages were slow to load' },
  { id: 'errors',   label: 'Error messages or things not working' },
  { id: 'lostwork', label: 'I lost or could not save work' },
  { id: 'nav',      label: 'Hard to find my way around' },
  { id: 'upload',   label: 'Problems uploading files' },
  { id: 'signin',   label: 'Problems signing in' },
  { id: 'mobile',   label: 'Hard to use on a phone or tablet' },
  { id: 'none',     label: 'No problems' }
];

const FB_TEXT = [
  { id: 'supportText', label: 'In what ways has the Studio supported your learning on this module?' },
  { id: 'bestText',    label: 'What worked best for you?' },
  { id: 'improveText', label: 'What would you most like us to improve or change?' },
  { id: 'otherText',   label: 'Anything else you would like to tell us?' }
];

const FB_CAMPUSES = ['London', 'Birmingham', 'Manchester'];

function fbEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function fbCohortKey() { return 'c_' + COHORT_ID; }
function fbRandomId() {
  const b = new Uint8Array(16);
  (window.crypto || window.msCrypto).getRandomValues(b);
  return Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
}
function fbInjectStyle() {
  if (document.getElementById('fbStyle')) return;
  const st = document.createElement('style');
  st.id = 'fbStyle';
  st.textContent = `
  .fb-q{margin:0 0 14px}.fb-q label.fb-lab{display:block;font-size:12px;font-weight:700;color:#1e293b;margin-bottom:5px}
  .fb-scale{display:flex;flex-wrap:wrap;gap:6px}
  .fb-opt{display:inline-flex;align-items:center;gap:4px;border:1.5px solid #cbd5e1;border-radius:6px;padding:4px 9px;font-size:12px;cursor:pointer;background:#fff}
  .fb-opt:has(input:checked){border-color:#0D7377;background:#e6f4f1;font-weight:700}
  .fb-opt input{accent-color:#0D7377}
  .fb-tbl{width:100%;border-collapse:collapse;font-size:12px}.fb-tbl th,.fb-tbl td{border-bottom:1px solid #e2e8f0;padding:6px 5px;text-align:left;vertical-align:middle}
  .fb-tbl th{font-size:10px;color:#64748b;text-transform:uppercase}.fb-tbl td.c,.fb-tbl th.c{text-align:center}
  .fb-note{font-size:11px;color:#64748b;line-height:1.5}
  .fb-txt{width:100%;min-height:70px;padding:8px;border:1.5px solid #cbd5e1;border-radius:6px;font:inherit;font-size:12px}
  .fb-quote{border-left:3px solid #cbd5e1;padding:4px 10px;margin:6px 0;font-size:12px;white-space:pre-wrap;color:#334155}`;
  document.head.appendChild(st);
}

// ─── Student side ───────────────────────────────────────────────────────
let _fbDone = false, _fbDoneRef = null, _fbDoneHandler = null, _fbRenderKey = '';

function startFeedbackWatch(sid) {
  stopFeedbackWatch();
  _fbDoneRef = db.ref(`${DB_ROOT}/__feedbackDone/${fbCohortKey()}/${sid}`);
  _fbDoneHandler = s => { _fbDone = s.val() === true; _fbRenderKey = ''; renderStudentFeedback(); };
  _fbDoneRef.on('value', _fbDoneHandler, () => {});
}
function stopFeedbackWatch() {
  if (_fbDoneRef && _fbDoneHandler) _fbDoneRef.off('value', _fbDoneHandler);
  _fbDoneRef = null; _fbDoneHandler = null; _fbDone = false; _fbRenderKey = '';
}

function renderStudentFeedback() {
  const body = document.getElementById('sFeedbackBody');
  const nudge = document.getElementById('feedbackNudge');
  if (!body) return;
  fbInjectStyle();
  const open = !!(appData.config && appData.config.feedbackOpen === true);
  const real = isRealStudentSession();
  const key = [open, real, _fbDone].join('|');

  if (nudge) nudge.style.display = (open && real && !_fbDone) ? 'block' : 'none';
  if (key === _fbRenderKey) return;          // never rebuild the form while someone is typing in it
  _fbRenderKey = key;

  if (!real) {
    body.innerHTML = '<div class="alert alert-info">Student feedback form (preview). Responses can only be submitted from a student sign-in.</div>' + (open ? fbFormHTML(true) : '<p style="font-size:12px;color:#64748b">The survey is currently closed to students.</p>');
    return;
  }
  if (_fbDone) {
    body.innerHTML = '<div class="alert alert-success">✓ Thank you — your feedback has been submitted. You can only submit once, and your response cannot be linked back to you.</div>';
    return;
  }
  if (!open) {
    body.innerHTML = '<div class="alert alert-info">The feedback survey is not open yet. Your Module Leader will open it near the end of the module — look out for an announcement.</div>';
    return;
  }
  body.innerHTML = fbFormHTML(false);
}

function fbScale(name, values, labels) {
  return '<div class="fb-scale">' + values.map((v, i) =>
    `<label class="fb-opt"><input type="radio" name="${name}" value="${v}">${labels ? labels[i] : v}</label>`).join('') + '</div>';
}

function fbFormHTML(preview) {
  const ref = FEEDBACK_ETHICS_REF ? ` Ethics reference: ${fbEsc(FEEDBACK_ETHICS_REF)}.` : '';
  const toolRows = group => FB_TOOLS.filter(t => t.group === group).map(t => `
    <tr><td>${fbEsc(t.label)}</td><td>${fbScale('fb_t_' + t.id, [1, 2, 3, 4, 5, 0], ['1', '2', '3', '4', '5', 'Not used'])}</td></tr>`).join('');
  const likertRows = FB_LIKERT.map(q => `
    <tr><td style="width:55%">${fbEsc(q.label)}</td><td>${fbScale('fb_l_' + q.id, [1, 2, 3, 4, 5], ['1', '2', '3', '4', '5'])}</td></tr>`).join('');
  return `
  <div class="card" style="margin-bottom:12px"><div class="card-body">
    <p style="font-size:13px;font-weight:700;color:#1B3A6B;margin-bottom:6px">Tell us about your experience of the Studio</p>
    <p class="fb-note">This survey takes about 5 minutes. It is <b>voluntary and anonymous</b>: your answers are saved without your name, student ID or Guild, and nobody can see who submitted which response. Your feedback will be used to improve the module. If you tick the box at the end, your anonymous answers may also be used in research and publications about the Studio, reported only as combined results and short unattributed quotes. Not taking part, or not ticking the box, has no effect on your grades.${ref}</p>
    <p class="fb-note" style="margin-top:4px"><b>Please do not include names or other personal information in your comments.</b></p>
  </div></div>

  <div class="card" style="margin-bottom:12px"><div class="card-hdr blue">1. Overall</div><div class="card-body">
    <div class="fb-q"><label class="fb-lab">How would you rate the Studio overall? (1 = poor, 5 = excellent) *</label>${fbScale('fb_overall', [1, 2, 3, 4, 5], ['1 · Poor', '2', '3', '4', '5 · Excellent'])}</div>
    <p class="fb-note" style="margin-bottom:6px">How far do you agree? (1 = strongly disagree, 5 = strongly agree)</p>
    <table class="fb-tbl"><tbody>${likertRows}</tbody></table>
  </div></div>

  <div class="card" style="margin-bottom:12px"><div class="card-hdr blue">2. Rate each part of the Studio</div><div class="card-body">
    <p class="fb-note" style="margin-bottom:6px">1 = not useful, 5 = very useful. Choose <b>Not used</b> for anything you did not use.</p>
    <p style="font-size:11px;font-weight:700;color:#475569;margin:6px 0 2px">STUDIO TOOLS</p>
    <table class="fb-tbl"><tbody>${toolRows('Studio Tools')}</tbody></table>
    <p style="font-size:11px;font-weight:700;color:#475569;margin:12px 0 2px">OTHER FEATURES</p>
    <table class="fb-tbl"><tbody>${toolRows('Other features')}</tbody></table>
  </div></div>

  <div class="card" style="margin-bottom:12px"><div class="card-hdr blue">3. In your own words</div><div class="card-body">
    ${FB_TEXT.map(q => `<div class="fb-q"><label class="fb-lab" for="fb_${q.id}">${fbEsc(q.label)}</label><textarea class="fb-txt" id="fb_${q.id}" maxlength="2500"></textarea></div>`).join('')}
    <div class="fb-q"><label class="fb-lab">Did you run into any problems? (tick any that apply)</label>
      <div class="fb-scale">${FB_PROBLEMS.map(p => `<label class="fb-opt"><input type="checkbox" name="fb_problem" value="${p.id}">${fbEsc(p.label)}</label>`).join('')}</div></div>
  </div></div>

  <div class="card" style="margin-bottom:12px"><div class="card-hdr blue">4. About you (optional) and consent</div><div class="card-body">
    <div class="fb-q"><label class="fb-lab" for="fb_campus">Your campus (optional — used only to compare campuses once at least 5 students answer)</label>
      <select id="fb_campus" style="padding:6px 10px;border:1.5px solid #cbd5e1;border-radius:6px;font-size:12px"><option value="">Prefer not to say</option>${FB_CAMPUSES.map(c => `<option>${c}</option>`).join('')}</select></div>
    <label style="display:flex;gap:8px;align-items:flex-start;font-size:12px;cursor:pointer;margin:6px 0 12px">
      <input type="checkbox" id="fb_consent" style="margin-top:2px">
      <span>I agree that my anonymous responses may also be used in research and publications about the Studio (combined results and short unattributed quotes). <i>Optional — leave unticked to use my feedback for improving the module only.</i></span></label>
    <button class="btn btn-primary" id="fbSubmitBtn" onclick="submitFeedback()" ${preview ? 'disabled title="Preview only"' : ''}>Submit feedback</button>
    <span id="fbSubmitMsg" style="font-size:12px;margin-left:10px"></span>
  </div></div>`;
}

async function submitFeedback() {
  const msg = document.getElementById('fbSubmitMsg');
  const say = (t, bad) => { msg.textContent = t; msg.style.color = bad ? '#B91C1C' : '#15803D'; };
  if (!isRealStudentSession() || !currentStudent) { say('Sign in as a student to submit.', true); return; }
  if (!(appData.config && appData.config.feedbackOpen === true)) { say('The survey is closed.', true); return; }
  const val = name => { const el = document.querySelector(`input[name="${name}"]:checked`); return el ? +el.value : null; };
  const overall = val('fb_overall');
  if (!overall) { say('Please give an overall rating (section 1).', true); return; }

  const resp = { v: 1, overall, researchConsent: !!document.getElementById('fb_consent').checked };
  const wk = parseInt(appData.config.currentWeek || computeCurrentWeek()) || 0;
  if (wk >= 1 && wk <= 12) resp.week = wk;
  const campus = document.getElementById('fb_campus').value;
  if (campus) resp.campus = campus;
  const likert = {}; FB_LIKERT.forEach(q => { const v = val('fb_l_' + q.id); if (v) likert[q.id] = v; });
  if (Object.keys(likert).length) resp.likert = likert;
  const tools = {}; FB_TOOLS.forEach(t => { const v = val('fb_t_' + t.id); if (v !== null) tools[t.id] = v; });
  if (Object.keys(tools).length) resp.tools = tools;
  const problems = Array.from(document.querySelectorAll('input[name="fb_problem"]:checked')).map(el => el.value);
  if (problems.length) resp.problems = problems;
  FB_TEXT.forEach(q => { const t = document.getElementById('fb_' + q.id).value.trim(); if (t) resp[q.id] = t.slice(0, 2900); });

  const btn = document.getElementById('fbSubmitBtn');
  btn.disabled = true; say('Submitting…');
  const ck = fbCohortKey(), rid = fbRandomId();
  try {
    // One atomic write: the anonymous response and this student's content-free "done" flag.
    await db.ref(DB_ROOT).update({
      [`__feedback/${ck}/${rid}`]: resp,
      [`__feedbackDone/${ck}/${currentStudent}`]: true
    });
    toast('Thank you — feedback submitted', 'ok');
  } catch (e) {
    btn.disabled = false;
    say('Could not submit (' + (e.code || e.message) + '). If the survey has just closed or you have already submitted, you cannot send it again.', true);
  }
}

// Horizontal bars with full labels (the shared bar chart truncates long names).
function fbDrawHBar(canvas, labels, values, opts) {
  opts = opts || {};
  const ctx = setupCanvas(canvas), w = canvas.width, h = canvas.height;
  const left = 210, right = 44, top = 26, rowH = (h - top - 12) / Math.max(labels.length, 1);
  const max = opts.max || 5;
  ctx.fillStyle = '#1e293b'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'left';
  if (opts.title) ctx.fillText(opts.title, 8, 15);
  ctx.strokeStyle = '#e2e8f0';
  for (let g = 0; g <= max; g++) {
    const x = left + (w - left - right) * g / max;
    ctx.beginPath(); ctx.moveTo(x, top - 4); ctx.lineTo(x, h - 10); ctx.stroke();
    ctx.fillStyle = '#94a3b8'; ctx.font = '9px Arial'; ctx.textAlign = 'center'; ctx.fillText(String(g), x, h - 1);
  }
  labels.forEach((lab, i) => {
    const y = top + i * rowH, bh = Math.min(16, rowH * 0.62), bw = (w - left - right) * values[i] / max;
    ctx.fillStyle = '#1e293b'; ctx.font = '10px Arial'; ctx.textAlign = 'right'; ctx.fillText(lab, left - 8, y + rowH / 2 + 3);
    ctx.fillStyle = opts.color || '#7C3AED'; ctx.fillRect(left, y + (rowH - bh) / 2, bw, bh);
    ctx.fillStyle = '#1e293b'; ctx.textAlign = 'left'; ctx.fillText(String(values[i]), left + bw + 5, y + rowH / 2 + 3);
  });
}

// ─── Module Leader: results ───────────────────────────────────────────────
let _fbResponses = {}, _fbDoneMap = {}, _fbOffs = [], _fbFilter = 'all';

function startFeedbackResults(cohortId) {
  _fbOffs.forEach(f => f()); _fbOffs = [];
  _fbResponses = {}; _fbDoneMap = {};
  if (!isLeader || !_leaderClaimed) return;
  const ck = 'c_' + cohortId;
  const on = (path, cb) => {
    const ref = db.ref(`${DB_ROOT}/${path}/${ck}`);
    const h = s => { cb(s.val() || {}); renderFeedbackResults(); };
    ref.on('value', h, () => {});
    _fbOffs.push(() => ref.off('value', h));
  };
  on('__feedback', v => { _fbResponses = v; });
  on('__feedbackDone', v => { _fbDoneMap = v; });
}

async function toggleFeedbackOpen(open) {
  try { await sRef('config/feedbackOpen').set(open); toast(open ? 'Student feedback survey is now OPEN' : 'Student feedback survey closed', 'ok'); }
  catch (e) { toast('Could not change the survey status: ' + (e.code || e.message), 'err'); }
}
function setFeedbackFilter(v) { _fbFilter = v; renderFeedbackResults(); }

function fbStats(values) {
  const n = values.length;
  if (!n) return { n: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const sd = n > 1 ? Math.sqrt(values.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1)) : 0;
  const dist = [1, 2, 3, 4, 5].map(k => values.filter(v => v === k).length);
  return { n, mean: +mean.toFixed(2), sd: +sd.toFixed(2), agree: +(values.filter(v => v >= 4).length / n * 100).toFixed(0), dist };
}
function fbList() {
  const all = Object.values(_fbResponses || {});
  return _fbFilter === 'research' ? all.filter(r => r.researchConsent) : all;
}
function fbSummary() {
  const rs = fbList();
  const overall = fbStats(rs.map(r => r.overall).filter(Number.isFinite));
  const likert = FB_LIKERT.map(q => ({ ...q, ...fbStats(rs.map(r => r.likert && r.likert[q.id]).filter(v => Number.isFinite(v))) }));
  const tools = FB_TOOLS.map(t => {
    const raw = rs.map(r => r.tools && r.tools[t.id]).filter(v => v !== undefined && v !== null);
    const used = raw.filter(v => v >= 1);
    return { ...t, answered: raw.length, notUsed: raw.length - used.length, ...fbStats(used) };
  });
  const problems = FB_PROBLEMS.map(p => ({ ...p, count: rs.filter(r => r.problems && Object.values(r.problems).includes(p.id)).length }));
  const campuses = FB_CAMPUSES.map(c => ({ campus: c, ...fbStats(rs.filter(r => r.campus === c).map(r => r.overall)) }));
  return { n: rs.length, overall, likert, tools, problems, campuses };
}

function renderFeedbackResults() {
  const el = document.getElementById('fbResultsBody');
  if (!el) return;
  fbInjectStyle();
  const open = !!(appData.config && appData.config.feedbackOpen === true);
  const total = Object.keys(appData.students || {}).length;
  const doneN = Object.keys(_fbDoneMap || {}).length;
  const everyone = Object.values(_fbResponses || {});
  const consentN = everyone.filter(r => r.researchConsent).length;
  const S = fbSummary();
  const f1 = x => (x === undefined || x === null || isNaN(x)) ? '—' : x;
  const dist = d => d ? d.join(' · ') : '—';

  const likertRows = S.likert.map(q => `<tr><td>${fbEsc(q.label)}</td><td class="c">${q.n}</td><td class="c"><b>${f1(q.mean)}</b></td><td class="c">${f1(q.sd)}</td><td class="c">${q.n ? q.agree + '%' : '—'}</td><td class="c" style="font-size:11px;color:#64748b">${dist(q.dist)}</td></tr>`).join('');
  const toolRows = group => S.tools.filter(t => t.group === group).map(t => `<tr><td>${fbEsc(t.label)}</td><td class="c">${t.n}</td><td class="c">${t.answered ? Math.round(t.n / t.answered * 100) + '%' : '—'}</td><td class="c"><b>${f1(t.mean)}</b></td><td class="c">${f1(t.sd)}</td><td class="c">${t.n ? t.agree + '%' : '—'}</td><td class="c" style="font-size:11px;color:#64748b">${dist(t.dist)}</td></tr>`).join('');
  const probRows = S.problems.map(p => `<tr><td>${fbEsc(p.label)}</td><td class="c">${p.count}</td><td class="c">${S.n ? Math.round(p.count / S.n * 100) + '%' : '—'}</td></tr>`).join('');
  const campRows = S.campuses.map(c => `<tr><td>${c.campus}</td><td class="c">${c.n >= 5 ? c.n : (c.n ? '<5' : 0)}</td><td class="c">${c.n >= 5 ? '<b>' + c.mean + '</b>' : '—'}</td></tr>`).join('');
  const texts = FB_TEXT.map(q => {
    const items = fbList().map(r => r[q.id]).filter(Boolean);
    return `<div style="margin-bottom:14px"><div style="font-size:12px;font-weight:700;color:#1B3A6B">${fbEsc(q.label)} <span style="color:#94a3b8;font-weight:400">(${items.length})</span></div>${items.map(t => `<div class="fb-quote">${fbEsc(t)}</div>`).join('') || '<p class="fb-note">No comments yet.</p>'}</div>`;
  }).join('');

  queueChart('fbOverallChart', c => drawBarChart(c, ['1', '2', '3', '4', '5'], S.overall.dist || [0, 0, 0, 0, 0], { title: 'Overall rating (count)', color: '#0D7377' }));
  const toolsRated = S.tools.filter(t => t.n);
  queueChart('fbToolsChart', c => fbDrawHBar(c, toolsRated.map(t => t.label), toolsRated.map(t => t.mean), { title: 'Mean rating by tool and feature (1–5, "Not used" excluded)', color: '#7C3AED' }));

  el.innerHTML = `
  <div class="alert ${open ? 'alert-success' : 'alert-info'}" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
    <span><b>Survey is ${open ? 'OPEN' : 'CLOSED'}</b> ${open ? '— students see the Feedback tab and a reminder on their landing page.' : '— students cannot submit.'}</span>
    <button class="btn ${open ? 'btn-danger' : 'btn-primary'} btn-sm" onclick="toggleFeedbackOpen(${!open})">${open ? 'Close survey' : 'Open survey'}</button>
  </div>
  <div class="krow">
    <div class="kpi bl"><div class="v">${everyone.length}</div><div class="l">Responses</div></div>
    <div class="kpi gr"><div class="v">${total ? Math.round(doneN / total * 100) + '%' : '—'}</div><div class="l">Response rate (${doneN} of ${total})</div></div>
    <div class="kpi pu"><div class="v">${consentN}</div><div class="l">Agreed to research use</div></div>
    <div class="kpi tl"><div class="v">${f1(S.overall.mean)}</div><div class="l">Overall rating (${S.overall.n || 0})</div></div>
  </div>
  <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:10px 0">
    <label style="font-size:12px;font-weight:700;color:#475569">Show results for</label>
    <select onchange="setFeedbackFilter(this.value)" style="padding:6px 10px;border:1.5px solid #cbd5e1;border-radius:6px;font-size:12px">
      <option value="all" ${_fbFilter === 'all' ? 'selected' : ''}>All responses (module improvement)</option>
      <option value="research" ${_fbFilter === 'research' ? 'selected' : ''}>Research-consenting responses only (use this for the paper)</option>
    </select>
    <button class="btn btn-ghost btn-sm" onclick="downloadFeedbackResponses()">⬇ Responses (CSV)</button>
    <button class="btn btn-ghost btn-sm" onclick="downloadFeedbackSummary()">⬇ Summary tables (CSV)</button>
  </div>
  ${S.n && S.n < 10 ? '<div class="alert" style="background:#fef9c3;color:#854d0e;border:1px solid #fde68a">Fewer than 10 responses — treat averages as indicative only, and do not report subgroup figures.</div>' : ''}
  <div class="alert alert-info">Responses are anonymous and contain no student identifier. Free-text comments can still identify someone by what they describe; read them before sharing, and quote only responses from students who agreed to research use. Student comments are never sent to the AI service.</div>

  <div class="card" style="margin-bottom:12px"><div class="card-hdr blue">Overall rating and learning-support statements (1–5)</div><div class="card-body">
    <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start">
      <div>${chartCanvasHTML('fbOverallChart', 260, 170)}${downloadChartButton('fbOverallChart', 'feedback_overall_rating.png')}</div>
      <div style="flex:1;min-width:300px"><table class="fb-tbl"><thead><tr><th>Statement</th><th class="c">n</th><th class="c">Mean</th><th class="c">SD</th><th class="c">% agree (4–5)</th><th class="c">1·2·3·4·5</th></tr></thead><tbody>${likertRows}</tbody></table></div>
    </div>
  </div></div>

  <div class="card" style="margin-bottom:12px"><div class="card-hdr blue">Ratings of each tool and feature (1 = not useful, 5 = very useful; "Not used" excluded from the mean)</div><div class="card-body">
    <table class="fb-tbl"><thead><tr><th>Studio Tools</th><th class="c">n rated</th><th class="c">% used</th><th class="c">Mean</th><th class="c">SD</th><th class="c">% rated 4–5</th><th class="c">1·2·3·4·5</th></tr></thead><tbody>${toolRows('Studio Tools')}</tbody></table>
    <table class="fb-tbl" style="margin-top:10px"><thead><tr><th>Other features</th><th class="c">n rated</th><th class="c">% used</th><th class="c">Mean</th><th class="c">SD</th><th class="c">% rated 4–5</th><th class="c">1·2·3·4·5</th></tr></thead><tbody>${toolRows('Other features')}</tbody></table>
    <div style="margin-top:10px">${chartCanvasHTML('fbToolsChart', 640, Math.max(160, 44 + 24 * Math.max(toolsRated.length, 1)))}${downloadChartButton('fbToolsChart', 'feedback_tool_ratings.png')}</div>
  </div></div>

  <div style="display:flex;gap:12px;flex-wrap:wrap">
    <div class="card" style="flex:1;min-width:280px"><div class="card-hdr blue">Problems reported</div><div class="card-body"><table class="fb-tbl"><thead><tr><th>Problem</th><th class="c">n</th><th class="c">%</th></tr></thead><tbody>${probRows}</tbody></table></div></div>
    <div class="card" style="flex:1;min-width:280px"><div class="card-hdr blue">Overall rating by campus (groups under 5 hidden)</div><div class="card-body"><table class="fb-tbl"><thead><tr><th>Campus</th><th class="c">n</th><th class="c">Mean</th></tr></thead><tbody>${campRows}</tbody></table></div></div>
  </div>

  <div class="card" style="margin-top:12px"><div class="card-hdr blue">Comments</div><div class="card-body">${texts}</div></div>`;
  drawPendingCharts();
}

function downloadFeedbackResponses() {
  const rs = fbList();
  if (!rs.length) { toast('No responses to export yet', 'err'); return; }
  const head = ['week', 'campus', 'overall', 'research_consent']
    .concat(FB_LIKERT.map(q => 'likert_' + q.id), FB_TOOLS.map(t => 'tool_' + t.id + '_0notused'), FB_PROBLEMS.map(p => 'problem_' + p.id), FB_TEXT.map(q => q.id));
  const rows = [head].concat(rs.map(r => [r.week || '', r.campus || '', r.overall, r.researchConsent ? 1 : 0]
    .concat(FB_LIKERT.map(q => (r.likert && r.likert[q.id]) || ''), FB_TOOLS.map(t => (r.tools && r.tools[t.id] !== undefined) ? r.tools[t.id] : ''),
      FB_PROBLEMS.map(p => (r.problems && Object.values(r.problems).includes(p.id)) ? 1 : 0), FB_TEXT.map(q => r[q.id] || ''))));
  downloadCSV(rows, `CMP701_Studio_feedback_${_fbFilter === 'research' ? 'research_consenting' : 'all'}_${COHORT_ID}.csv`);
}

function downloadFeedbackSummary() {
  const S = fbSummary();
  if (!S.n) { toast('No responses to summarise yet', 'err'); return; }
  const rows = [['Section', 'Item', 'n', 'Mean', 'SD', '% 4-5', 'Count 1', 'Count 2', 'Count 3', 'Count 4', 'Count 5', 'Not used']];
  rows.push(['Overall', 'Overall rating', S.overall.n, S.overall.mean, S.overall.sd, S.overall.agree, ...(S.overall.dist || [])]);
  S.likert.forEach(q => rows.push(['Statement', q.label, q.n, q.mean ?? '', q.sd ?? '', q.agree ?? '', ...(q.dist || ['', '', '', '', ''])]));
  S.tools.forEach(t => rows.push([t.group, t.label, t.n, t.mean ?? '', t.sd ?? '', t.agree ?? '', ...(t.dist || ['', '', '', '', '']), t.notUsed]));
  rows.push([]); rows.push(['Responses', S.n, '', '', '', '', '', '', '', '', '', ''], ['Filter', _fbFilter === 'research' ? 'research-consenting only' : 'all responses']);
  downloadCSV(rows, `CMP701_Studio_feedback_summary_${_fbFilter === 'research' ? 'research_consenting' : 'all'}_${COHORT_ID}.csv`);
}
