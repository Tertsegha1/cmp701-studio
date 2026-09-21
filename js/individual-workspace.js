// ─── Individual Workspace (private, per-student) ────────────────────
// Both CW1 and CW2 are INDIVIDUAL submissions (official brief) — but this
// Studio is for Guild practical learning and artefact-building only. CW1
// and CW2 themselves are authored, tracked and submitted entirely through
// Blackboard. This tab exists only so a student can privately declare
// which company they are using for their own CW1/CW2, so it can be
// checked against their Guild's practice company (see js/company.js).
const APPROVED_COMPANIES = [
  'Zara', 'Mayo Clinic', 'JPMorgan Chase', 'General Electric', 'Tesla',
  'Verizon', 'Netflix', 'Marriott International', 'Coursera', 'FedEx'
];

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

// ─── Render ─────────────────────────────────────────────────────────
function renderIndividualWorkspace() {
  const body = document.getElementById('individualWorkspaceBody');
  if (!body) return;

  if (!currentStudent || !appData.students[currentStudent]) {
    body.innerHTML = '<p style="color:#94a3b8;font-size:12px">Select your name at the top of the page first.</p>';
    return;
  }

  const s = appData.students[currentStudent];
  const conflict = studentCompanyConflict(currentStudent);
  const guildCompany = s.guildId ? guildCompanyOf(s.guildId) : null;

  const companyOptions = APPROVED_COMPANIES.map(c =>
    `<option value="${c}" ${s.business === c ? 'selected' : ''}>${c}</option>`
  ).join('') + `<option value="__other__" ${s.business && !APPROVED_COMPANIES.includes(s.business) ? 'selected' : ''}>Other (needs Module Coordinator approval)</option>`;

  body.innerHTML = `
    <div class="alert" style="background:#fee2e2;color:#B91C1C;border:1px solid #fca5a5">
      <strong>CW1 and CW2 are not completed here.</strong> This Studio is for Guild practical learning and building your Guild's digital transformation artefacts only. Your CW1 video and CW2 report are authored, tracked and submitted entirely through your CMP701 Blackboard module page.
    </div>

    <div class="card">
      <div class="card-hdr blue">Your Individual Company (for CW1 &amp; CW2, submitted via Blackboard)</div>
      <div class="card-body">
        <p style="font-size:11px;color:#64748b;margin-bottom:10px">This only records which company you're using so it can be checked against your Guild's practice company below — it does not submit or store any part of your CW1/CW2 work.</p>
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
    </div>`;
}
