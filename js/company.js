// ─── Company Selection & Conflict Registry ─────────────────────────
// Framework rule: each Guild picks ONE shared "practice company" for formative
// Guild quests. No member of that Guild may use the same company for their own
// individual CW1/CW2 (student.business). This file adds that layer on top of
// the existing guilds/{gid} and students/{sid}.business data without touching
// the fields the rest of the app already relies on.
const GUILD_MAX_MEMBERS = 4;

function normCompanyName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/\b(ltd|limited|plc|inc|incorporated|llc|corp|corporation|co|company|group|the)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function guildCompanyOf(gid) {
  const g = appData.guilds[gid];
  return g && g.company ? g.company : null;
}

// Does this student's individual company clash with their own Guild's company?
function studentCompanyConflict(sid) {
  const s = appData.students[sid];
  if (!s || !s.guildId || !s.business) return null;
  const gc = guildCompanyOf(s.guildId);
  if (!gc || !gc.name) return null;
  if (normCompanyName(gc.name) === normCompanyName(s.business)) {
    return { guildName: appData.guilds[s.guildId].name, companyName: gc.name };
  }
  return null;
}

function companyConflictBadgeHTML(sid) {
  const c = studentCompanyConflict(sid);
  if (!c) return '';
  return `<span class="b b-red" title="Same company as ${c.guildName}'s Guild practice company — must be changed before submission" style="margin-left:5px">⚠ Conflict</span>`;
}

// ─── Guild company card (used inside the leader Guilds grid) ───────
function renderGuildCompanySection(gid, g) {
  const c = g.company;
  if (!c || !c.name) {
    return `<div class="company-box empty">
      <span style="color:#94a3b8;font-size:11px">No practice company chosen yet</span>
      <button class="btn btn-ghost btn-sm" onclick="openCompanyModal('${gid}')">+ Set Company</button>
    </div>`;
  }
  const statusBadge = c.status === 'approved'
    ? '<span class="b b-green">Approved</span>'
    : '<span class="b b-amber">Pending Approval</span>';
  return `<div class="company-box">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px">
      <div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;font-weight:700">Guild Practice Company</div>
        <div style="font-weight:800;color:#1B3A6B">${c.name}</div>
        <div style="font-size:10px;color:#64748b">${c.sector || ''}${c.sector && c.geography ? ' · ' : ''}${c.geography || ''}</div>
      </div>
      ${statusBadge}
    </div>
    <div style="display:flex;gap:6px;margin-top:8px">
      <button class="btn btn-ghost btn-sm" onclick="openCompanyModal('${gid}')">Edit</button>
      ${c.status !== 'approved' && (isLeader || isLecturer) ? `<button class="btn btn-primary btn-sm" onclick="approveGuildCompany('${gid}')">Approve</button>` : ''}
    </div>
  </div>`;
}

function openCompanyModal(gid) {
  const g = appData.guilds[gid];
  if (!g) return;
  document.getElementById('companyGuildId').value = gid;
  document.getElementById('companyGuildLabel').textContent = g.name;
  const c = g.company || {};
  document.getElementById('companyName').value = c.name || '';
  document.getElementById('companyWebsite').value = c.website || '';
  document.getElementById('companySector').value = c.sector || '';
  document.getElementById('companyGeography').value = c.geography || '';
  document.getElementById('companyRationale').value = c.rationale || '';
  openModal('companyModal');
}

async function saveGuildCompany() {
  const gid = document.getElementById('companyGuildId').value;
  const name = document.getElementById('companyName').value.trim();
  if (!name) { toast('Company name is required', 'err'); return; }
  const existing = (appData.guilds[gid] || {}).company || {};
  await sRef('guilds/' + gid + '/company').set({
    name,
    website: document.getElementById('companyWebsite').value.trim(),
    sector: document.getElementById('companySector').value.trim(),
    geography: document.getElementById('companyGeography').value.trim(),
    rationale: document.getElementById('companyRationale').value.trim(),
    status: existing.name === name ? (existing.status || 'pending') : 'pending',
    proposedAt: existing.proposedAt || Date.now(),
    updatedAt: Date.now()
  });
  closeModal('companyModal');
  toast('Guild company saved — pending tutor approval', 'ok');
}

async function approveGuildCompany(gid) {
  await sRef('guilds/' + gid + '/company').update({ status: 'approved', approvedAt: Date.now() });
  toast('Company approved', 'ok');
}

// ─── Individual company declaration (student self-service) ─────────
async function declareIndividualCompany(sid, name, rationale) {
  const student = appData.students[sid];
  if (!student) return { ok: false, msg: 'Select your name first.' };
  if (!name || !name.trim()) return { ok: false, msg: 'Enter a company name.' };
  const gc = student.guildId ? guildCompanyOf(student.guildId) : null;
  if (gc && gc.name && normCompanyName(gc.name) === normCompanyName(name)) {
    return { ok: false, msg: `"${name}" is your Guild's practice company. Individual CW1/CW2 must use a DIFFERENT organisation.` };
  }
  await sRef('students/' + sid).update({ business: name.trim() });
  await sRef('students/' + sid + '/individualCompanyDetail').set({
    name: name.trim(),
    rationale: (rationale || '').trim(),
    declaredAt: Date.now(),
    status: 'declared'
  });
  return { ok: true };
}

// ─── Company Conflict Registry (leader / lecturer tab) ──────────────
function renderCompanies() {
  const body = document.getElementById('companiesBody');
  if (!body) return;

  const guildRows = Object.entries(appData.guilds || {}).map(([gid, g]) => {
    const c = g.company || {};
    const members = g.members ? Object.values(g.members) : [];
    const conflicts = members.filter(m => studentCompanyConflict(m.id));
    return `<tr>
      <td style="font-weight:700">${g.name}</td>
      <td>${g.campus || '—'}</td>
      <td>${c.name || '<span style="color:#94a3b8">Not set</span>'}</td>
      <td class="C">${c.status === 'approved' ? '<span class="b b-green">Approved</span>' : c.name ? '<span class="b b-amber">Pending</span>' : '—'}</td>
      <td class="C">${conflicts.length ? `<span class="b b-red">${conflicts.length} conflict${conflicts.length>1?'s':''}</span>` : '<span class="b b-green">Clear</span>'}</td>
      <td class="C">
        <button class="btn btn-ghost btn-sm" onclick="openCompanyModal('${gid}')">Edit</button>
        ${c.name && c.status !== 'approved' ? `<button class="btn btn-primary btn-sm" onclick="approveGuildCompany('${gid}')">Approve</button>` : ''}
      </td>
    </tr>`;
  }).join('');

  const studentRows = Object.entries(appData.students || {}).map(([sid, s]) => {
    const conflict = studentCompanyConflict(sid);
    const guildName = s.guildId && appData.guilds[s.guildId] ? appData.guilds[s.guildId].name : '—';
    return `<tr${conflict ? ' style="background:#fef2f2"' : ''}>
      <td style="font-weight:700">${s.name}</td>
      <td>${guildName}</td>
      <td>${s.business || '<span style="color:#94a3b8">Not chosen</span>'}</td>
      <td class="C">${conflict ? `<span class="b b-red">⚠ Same as Guild company</span>` : (s.business ? '<span class="b b-green">Clear</span>' : '—')}</td>
    </tr>`;
  }).join('');

  body.innerHTML = `
    <div class="card">
      <div class="card-hdr blue">Guild Practice Companies</div>
      <div class="card-body" style="padding:0">
        <table><thead><tr><th>Guild</th><th>Campus</th><th>Company</th><th class="C">Approval</th><th class="C">Member Conflicts</th><th class="C">Actions</th></tr></thead>
        <tbody>${guildRows || '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:16px">No guilds yet</td></tr>'}</tbody></table>
      </div>
    </div>
    <div class="card">
      <div class="card-hdr amber">Individual Company Declarations</div>
      <div class="card-body" style="padding:0">
        <table><thead><tr><th>Student</th><th>Guild</th><th>Individual Company (CW1/CW2)</th><th class="C">Status</th></tr></thead>
        <tbody>${studentRows || '<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:16px">No students yet</td></tr>'}</tbody></table>
      </div>
    </div>
    <div class="alert alert-info">
      <strong>Rule:</strong> a Guild's practice company is a shared, formative exemplar. Each student's CW1 and CW2 must analyse a <em>different</em> organisation that no one in their Guild is using here. Conflicts are flagged in red and must be resolved before submission — the system cannot detect use of the same company outside this platform, so declarations and tutor review remain the safeguard.
    </div>`;
}
