// ═══════════════════════════════════════════════════════════════════════
// ACCESS CONTROL (GDPR data minimisation)
//
// Students may only see members of their own Guild. This is enforced by the
// Realtime Database rules (security/build_rules.py), not by hiding things in the
// UI. Every browser gets an anonymous Firebase identity; it then "claims" a role
// by writing /__access/{uid}, and the rules validate the claim server-side:
//   student  → typed full name must exist in the private /nameIndex (sid + gid)
//   lecturer → tutor PIN must match /__teachingTeam/{id}/pin
//   leader   → code must match /__secrets/leaderCode
// A student's data scope is then exactly their Guild (plus guild-level summaries
// for the leaderboard, and the single Guild they are assigned to peer-review).
// ═══════════════════════════════════════════════════════════════════════

let _accessOk = false;          // true once this session holds a valid claim for its role
let _scopeUnsubs = [];          // student scoped listeners

// Order-insensitive, accent/punctuation-insensitive key for a person's name.
function nameKey(name) {
  const tokens = String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
  return tokens.sort().join('-');
}

function accessRef(uid) { return db.ref(DB_ROOT + '/__access/' + uid); }

async function claimAccess(claim) {
  const user = await authReady;
  try {
    await accessRef(user.uid).set({ ...claim, ts: Date.now() });
    return true;
  } catch (e) {
    return false;   // rules rejected the claim (wrong name / PIN / code)
  }
}

async function currentClaim() {
  try {
    const user = await authReady;
    return (await accessRef(user.uid).once('value')).val();
  } catch (e) { return null; }
}

// ── Student ───────────────────────────────────────────────────────────
async function studentSignIn(typedName) {
  await authReady;
  const key = nameKey(typedName);
  if (!key) return { ok: false, msg: 'Please type your full name.' };
  const cohort = 'c_' + COHORT_ID;
  let entry = null;
  try { entry = (await db.ref(`${DB_ROOT}/${cohort}/nameIndex/${key}`).once('value')).val(); }
  catch (e) { return { ok: false, msg: 'Could not reach the service. Check your connection and try again.' }; }
  if (!entry || !entry.sid) return { ok: false, msg: 'That name was not found on this module. Type your full name as it appears on your university record.' };
  const ok = await claimAccess({ role: 'student', cohort, name: key, sid: entry.sid, gid: entry.gid || 'none' });
  if (!ok) return { ok: false, msg: 'Access could not be granted. Please try again or contact your tutor.' };
  safeStore.setItem('cmp701_student_name', typedName.trim());
  return { ok: true, sid: entry.sid, gid: entry.gid || 'none' };
}

async function studentGateSubmit() {
  const input = document.getElementById('studentGateName');
  const err = document.getElementById('studentGateErr');
  const btn = document.getElementById('studentGateBtn');
  btn.disabled = true; err.style.display = 'none';
  const r = await studentSignIn(input.value);
  btn.disabled = false;
  if (!r.ok) { err.textContent = r.msg; err.style.display = 'block'; return; }
  document.getElementById('studentAccessScreen').style.display = 'none';
  startStudentSession(r.sid, r.gid);
}

function showStudentGate() {
  document.getElementById('studentAccessScreen').style.display = 'flex';
  setTimeout(() => { const f = document.getElementById('studentGateName'); if (f) f.focus(); }, 100);
}

async function studentSignOut() {
  scopeOff();
  safeStore.removeItem('cmp701_student_name');
  safeStore.removeItem('cmp701_student_id');
  try { const u = await authReady; await accessRef(u.uid).remove(); } catch (e) {}
  currentStudent = null; _accessOk = false;
  appData.guilds = {}; appData.students = {}; appData.peerReviews = {};
  refreshAllSafe();
  showStudentGate();
}

function startStudentSession(sid, gid) {
  _accessOk = true;
  currentStudent = sid;
  preloadApiKey();
  const banner = document.getElementById('studentIdentityBanner');
  if (banner) banner.style.display = 'flex';
  subscribeStudentScope(COHORT_ID, sid, gid);
}

// ── Staff ─────────────────────────────────────────────────────────────
async function leaderSignIn(code) {
  const ok = await claimAccess({ role: 'leader', proof: String(code || '') });
  _accessOk = ok;
  return ok;
}
async function lecturerSignIn(id, pin) {
  const ok = await claimAccess({ role: 'lecturer', id, proof: String(pin || '').trim().toUpperCase() });
  _accessOk = ok;
  return ok;
}

// ── Student scoped data subscription ──────────────────────────────────
function scopeOff() { _scopeUnsubs.forEach(f => f()); _scopeUnsubs = []; }
function scopeOn(ref, cb) {
  const handler = snap => cb(snap);
  ref.on('value', handler, () => { /* a denied listener just stays empty */ });
  _scopeUnsubs.push(() => ref.off('value', handler));
}

function subscribeStudentScope(cohortId, sid, gid) {
  scopeOff();
  COHORT_ID = cohortId;
  COHORT_PATH = DB_ROOT + '/c_' + cohortId;
  const base = COHORT_PATH;
  const st = { config: {}, quests: {}, ann: {}, summary: {}, guild: null, students: {}, prs: {}, targetMs: {} };
  const attached = {};     // sid / targetKey → true
  let timer = null;
  const schedule = () => { clearTimeout(timer); timer = setTimeout(apply, 60); };

  function attachStudent(s) {
    if (!s || attached['s' + s]) return;
    attached['s' + s] = true;
    scopeOn(db.ref(`${base}/students/${s}`), snap => { if (snap.exists()) st.students[s] = snap.val(); else delete st.students[s]; schedule(); });
  }
  function attachTarget(wk, tg) {
    const key = 't' + wk + tg;
    if (!tg || attached[key]) return;
    attached[key] = true;
    scopeOn(db.ref(`${base}/guilds/${tg}/milestones/${wk}`), snap => { st.targetMs[wk + '|' + tg] = snap.val(); schedule(); });
  }

  function apply() {
    // Own guild in full, every other guild as a name/campus/XP stub for the leaderboard.
    const guilds = {};
    Object.entries(st.summary).forEach(([g, s]) => {
      guilds[g] = { name: s.name || g, campus: s.campus || '', members: {}, milestones: {}, _xp: s.xp || 0, _memberCount: s.memberCount || 0 };
    });
    if (st.guild && gid && gid !== 'none') guilds[gid] = st.guild;
    const wk = 'week-' + (computeCurrentWeek() || 1);
    const mine = st.prs[wk];
    if (mine && mine.targetGuildId && guilds[mine.targetGuildId] && mine.targetGuildId !== gid) {
      attachTarget(wk, mine.targetGuildId);
      const ms = st.targetMs[wk + '|' + mine.targetGuildId];
      if (ms) guilds[mine.targetGuildId].milestones = { [wk]: ms };
    }
    if (st.guild && st.guild.members) Object.keys(st.guild.members).forEach(attachStudent);
    attachStudent(sid);
    const prs = {};
    Object.entries(st.prs).forEach(([w, v]) => { if (v) prs[w] = { [gid]: v }; });

    appData.config = st.config;
    appData.quests = st.quests;
    appData.announcements = st.ann;
    appData.guildSummary = st.summary;
    appData.guilds = guilds;
    appData.students = st.students;
    appData.peerReviews = prs;
    onCohortDataUpdated();
    renderAnnouncements();
    renderStudentPeerReview();
    publishGuildSummaries();
  }

  scopeOn(db.ref(`${base}/config`), s => { st.config = s.val() || {}; schedule(); });
  scopeOn(db.ref(`${base}/quests`), s => { st.quests = s.val() || {}; schedule(); });
  scopeOn(db.ref(`${base}/announcements`), s => { st.ann = s.val() || {}; schedule(); });
  scopeOn(db.ref(`${base}/guildSummary`), s => { st.summary = s.val() || {}; schedule(); });
  if (gid && gid !== 'none') {
    scopeOn(db.ref(`${base}/guilds/${gid}`), s => { st.guild = s.val(); schedule(); });
    for (let w = 1; w <= 13; w++) {
      scopeOn(db.ref(`${base}/peerReviews/week-${w}/${gid}`), s => { st.prs['week-' + w] = s.val(); schedule(); });
    }
  }
  attachStudent(sid);
  // Re-evaluate the peer-review target if the week rolls over while the tab is open.
  const weekTimer = setInterval(schedule, 5 * 60 * 1000);
  _scopeUnsubs.push(() => clearInterval(weekTimer));
}

// ── Guild summaries (leaderboard data that contains no personal data) ─────
function guildSummaryFor(gid) {
  const g = appData.guilds[gid];
  return { name: g.name || '', campus: g.campus || '', xp: computeGuildXP(gid), memberCount: g.members ? Object.keys(g.members).length : 0 };
}
let _summaryBusy = false;
async function publishGuildSummaries() {
  if (_summaryBusy || !_accessOk) return;
  const staff = isLeader || isLecturer;
  const real = isRealStudentSession();
  if (!staff && !real) return;
  const own = appData.students[currentStudent];
  const gids = staff ? Object.keys(appData.guilds || {}) : (own && own.guildId ? [own.guildId] : []);
  _summaryBusy = true;
  try {
    for (const gid of gids) {
      const g = appData.guilds[gid];
      if (!g || g._xp !== undefined) continue;                   // stubs are never published
      const next = guildSummaryFor(gid);
      const cur = (appData.guildSummary || {})[gid];
      if (cur && cur.name === next.name && cur.campus === next.campus && cur.xp === next.xp && cur.memberCount === next.memberCount) continue;
      await sRef('guildSummary/' + gid).set(next).catch(() => {});
    }
  } finally { _summaryBusy = false; }
}

// ── Private name index (staff only) ───────────────────────────────────
// Rules verify a student's typed name against /nameIndex without ever exposing the
// roster. Kept in step with the student list by the Module Leader's session.
let _nameIndexCollisionWarned = false;
async function syncNameIndex(rawIndex) {
  if (!isLeader || !_accessOk) return;
  const want = {}, collisions = [];
  Object.entries(appData.students || {}).forEach(([sid, s]) => {
    const key = nameKey(s.name);
    if (!key) return;
    if (want[key] && want[key].sid !== sid) { collisions.push(s.name); return; }
    want[key] = { sid, gid: s.guildId || 'none' };
  });
  const cur = rawIndex || {};
  const updates = {};
  Object.entries(want).forEach(([k, v]) => { const c = cur[k]; if (!c || c.sid !== v.sid || c.gid !== v.gid) updates['nameIndex/' + k] = v; });
  Object.keys(cur).forEach(k => { if (!want[k]) updates['nameIndex/' + k] = null; });
  if (collisions.length && !_nameIndexCollisionWarned) {
    _nameIndexCollisionWarned = true;
    toast('Two students share the same name key (' + collisions.join(', ') + ') — only the first can sign in. Make their names distinct.', 'err');
  }
  if (Object.keys(updates).length) { try { await sRef('').update(updates); } catch (e) { console.warn('nameIndex sync failed', e); } }
}
