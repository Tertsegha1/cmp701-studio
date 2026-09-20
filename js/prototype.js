// ─── Prototype Builder & LunchPoint Showcase ─────────────────────────
// Each Guild uses its approved practice company to design and build a small
// working system prototype (Section 4 "Guild system prototype", Section 5
// "in-platform prototype builder"), presented at the Week 12 LunchPoint
// event. Prototype data lives under guilds/{gid}/prototype/*; LunchPoint
// event config lives under config.lunchpoint — both already load with the
// existing appData.guilds / appData.config subscriptions.
const COMPONENT_TYPES = ['Heading', 'Text', 'Stat Card', 'Table', 'Chart', 'Form', 'Button', 'Navigation'];

function protoData(gid) {
  const g = appData.guilds[gid];
  return (g && g.prototype) || {};
}

async function saveProtoField(gid, field, value) {
  await sRef(`guilds/${gid}/prototype/${field}`).set(value);
  toast('Saved', 'ok');
}

async function requestScopeApproval(gid) {
  await sRef(`guilds/${gid}/prototype/scopeStatus`).set('requested');
  toast('Scope submitted for tutor review', 'ok');
}

async function approveScope(gid) {
  await sRef(`guilds/${gid}/prototype/scopeStatus`).set('approved');
  await sRef(`guilds/${gid}/prototype/scopeApprovedAt`).set(Date.now());
  toast('Scope approved', 'ok');
}

// ─── Screens (each a name + ordered component list) ─────────────────
async function addScreen(gid) {
  const screens = protoData(gid).screens || [];
  screens.push({ id: 's' + Date.now(), name: 'New Screen', components: [] });
  await sRef(`guilds/${gid}/prototype/screens`).set(screens);
  renderPrototypesPage();
}
async function removeScreen(gid, idx) {
  const screens = protoData(gid).screens || [];
  screens.splice(idx, 1);
  await sRef(`guilds/${gid}/prototype/screens`).set(screens);
  renderPrototypesPage();
}
async function renameScreen(gid, idx, name) {
  const screens = protoData(gid).screens || [];
  if (!screens[idx]) return;
  screens[idx].name = name;
  await sRef(`guilds/${gid}/prototype/screens`).set(screens);
}
async function addComponent(gid, screenIdx) {
  const screens = protoData(gid).screens || [];
  if (!screens[screenIdx]) return;
  screens[screenIdx].components = screens[screenIdx].components || [];
  screens[screenIdx].components.push({ type: 'Text', label: 'New component' });
  await sRef(`guilds/${gid}/prototype/screens`).set(screens);
  renderPrototypesPage();
}
async function updateComponent(gid, screenIdx, compIdx, field, value) {
  const screens = protoData(gid).screens || [];
  if (!screens[screenIdx] || !screens[screenIdx].components[compIdx]) return;
  screens[screenIdx].components[compIdx][field] = value;
  await sRef(`guilds/${gid}/prototype/screens`).set(screens);
  if (field === 'type') renderPrototypesPage();
}
async function removeComponent(gid, screenIdx, compIdx) {
  const screens = protoData(gid).screens || [];
  if (!screens[screenIdx]) return;
  screens[screenIdx].components.splice(compIdx, 1);
  await sRef(`guilds/${gid}/prototype/screens`).set(screens);
  renderPrototypesPage();
}

function renderComponentPreview(c) {
  switch (c.type) {
    case 'Heading':    return `<h4 style="margin:6px 0">${c.label}</h4>`;
    case 'Stat Card':   return `<div class="kpi tl" style="max-width:140px"><div class="v">—</div><div class="l">${c.label}</div></div>`;
    case 'Table':       return `<div style="border:1px dashed #cbd5e1;border-radius:6px;padding:8px;font-size:11px;color:#64748b">📋 Table: ${c.label}</div>`;
    case 'Chart':       return `<div style="border:1px dashed #cbd5e1;border-radius:6px;padding:16px;font-size:11px;color:#64748b;text-align:center">📊 Chart: ${c.label}</div>`;
    case 'Form':        return `<div style="border:1px solid #e2e8f0;border-radius:6px;padding:8px"><label style="font-size:10px">${c.label}</label><input disabled style="width:100%"></div>`;
    case 'Button':      return `<button class="btn btn-primary btn-sm" disabled>${c.label}</button>`;
    case 'Navigation':  return `<div style="background:#1B3A6B;color:#fff;padding:6px 10px;border-radius:6px;font-size:11px">☰ ${c.label}</div>`;
    default:            return `<p style="font-size:12px">${c.label}</p>`;
  }
}

function renderScreensEditor(gid, screens) {
  return screens.map((screen, si) => `
    <div class="card" style="margin-bottom:10px">
      <div class="card-hdr slate" style="display:flex;justify-content:space-between">
        <input value="${screen.name}" onblur="renameScreen('${gid}',${si},this.value)" style="background:transparent;border:none;color:#fff;font-weight:700;font-size:12px;flex:1">
        <button class="btn btn-danger btn-sm" onclick="removeScreen('${gid}',${si})">✕</button>
      </div>
      <div class="card-body" style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div>
          <p style="font-size:10px;font-weight:700;color:#94a3b8;margin-bottom:6px">COMPONENTS</p>
          ${(screen.components||[]).map((c, ci) => `
            <div style="display:flex;gap:4px;margin-bottom:4px">
              <select onchange="updateComponent('${gid}',${si},${ci},'type',this.value)" style="font-size:10px">
                ${COMPONENT_TYPES.map(t => `<option ${c.type===t?'selected':''}>${t}</option>`).join('')}
              </select>
              <input value="${c.label}" onblur="updateComponent('${gid}',${si},${ci},'label',this.value)" style="flex:1;font-size:10px">
              <button class="btn btn-danger btn-sm" onclick="removeComponent('${gid}',${si},${ci})">✕</button>
            </div>`).join('') || '<p style="color:#94a3b8;font-size:11px">No components yet</p>'}
          <button class="btn btn-ghost btn-sm" onclick="addComponent('${gid}',${si})">+ Add Component</button>
        </div>
        <div>
          <p style="font-size:10px;font-weight:700;color:#94a3b8;margin-bottom:6px">LIVE PREVIEW</p>
          <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px;background:#f8fafc;min-height:120px">
            ${(screen.components||[]).map(renderComponentPreview).join('') || '<p style="color:#cbd5e1;font-size:11px">Preview appears here</p>'}
          </div>
        </div>
      </div>
    </div>`).join('');
}

// ─── Data model / workflow rules / test cases (simple text-row lists) ─
async function addProtoRow(gid, listKey, blank) {
  const rows = protoData(gid)[listKey] || [];
  rows.push(blank);
  await sRef(`guilds/${gid}/prototype/${listKey}`).set(rows);
  renderPrototypesPage();
}
async function updateProtoRow(gid, listKey, idx, field, value) {
  const rows = protoData(gid)[listKey] || [];
  if (!rows[idx]) return;
  rows[idx][field] = value;
  await sRef(`guilds/${gid}/prototype/${listKey}`).set(rows);
}
async function removeProtoRow(gid, listKey, idx) {
  const rows = protoData(gid)[listKey] || [];
  rows.splice(idx, 1);
  await sRef(`guilds/${gid}/prototype/${listKey}`).set(rows);
  renderPrototypesPage();
}
function renderProtoRowTable(gid, listKey, columns, rows) {
  rows = rows || [];
  const head = columns.map(c => `<th>${c.label}</th>`).join('') + '<th class="C">—</th>';
  const body = rows.map((row, i) => `<tr>
    ${columns.map(c => `<td><input value="${(row[c.key]??'').toString().replace(/"/g,'&quot;')}" onblur="updateProtoRow('${gid}','${listKey}',${i},'${c.key}',this.value)" style="width:100%;border:1px solid #e2e8f0;border-radius:4px;padding:3px 5px;font-size:11px"></td>`).join('')}
    <td class="C"><button class="btn btn-danger btn-sm" onclick="removeProtoRow('${gid}','${listKey}',${i})">✕</button></td>
  </tr>`).join('');
  const blank = {}; columns.forEach(c => blank[c.key] = '');
  return `<table style="margin-bottom:6px"><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${columns.length+1}" style="text-align:center;color:#94a3b8;padding:8px">None yet</td></tr>`}</tbody></table>
    <button class="btn btn-ghost btn-sm" onclick='addProtoRow("${gid}","${listKey}",${JSON.stringify(blank)})'>+ Add Row</button>`;
}

// ─── Version freeze (for LunchPoint demo stability) ──────────────────
async function saveProtoVersion(gid) {
  const data = protoData(gid);
  const versions = data.versions || [];
  const { versions: _v, ...snapshot } = data;
  const id = 'v' + (versions.length + 1);
  versions.push({ id, label: 'Version ' + (versions.length + 1), ts: Date.now(), snapshot });
  await sRef(`guilds/${gid}/prototype/versions`).set(versions);
  toast('Version saved', 'ok');
  renderPrototypesPage();
}
async function freezeProtoVersion(gid, versionId) {
  await sRef(`guilds/${gid}/prototype/frozenVersionId`).set(versionId);
  toast('Version frozen for LunchPoint — keep editing freely, the frozen copy stays for the demo', 'ok');
  renderPrototypesPage();
}

// ─── LunchPoint event config & running order (leader) ────────────────
async function saveLunchpointConfig() {
  const config = {
    date: document.getElementById('lpDate').value,
    venue: document.getElementById('lpVenue').value,
    slotMinutes: +document.getElementById('lpSlotMinutes').value || 10,
    rehearsalAt: document.getElementById('lpRehearsal').value,
    freezeAt: document.getElementById('lpFreeze').value
  };
  await sRef('config/lunchpoint').update(config);
  toast('LunchPoint details saved', 'ok');
}

async function generateRunningOrder() {
  const lp = appData.config.lunchpoint || {};
  if (!lp.date) { toast('Set the LunchPoint date first', 'err'); return; }
  const guilds = Object.entries(appData.guilds || {});
  if (!guilds.length) { toast('No guilds to schedule', 'err'); return; }
  const slot = lp.slotMinutes || 10;
  let t = 0;
  const order = guilds
    .sort((a, b) => (a[1].campus || '').localeCompare(b[1].campus || ''))
    .map(([gid, g]) => {
      const row = { guildId: gid, guildName: g.name, campus: g.campus || '', minutesFromStart: t };
      t += slot;
      return row;
    });
  await sRef('config/lunchpoint/runningOrder').set(order);
  toast('Running order generated', 'ok');
  renderPrototypesPage();
}

function formatSlotTime(dateStr, minutesFromStart) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  d.setMinutes(d.getMinutes() + minutesFromStart);
  return d.toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
}

// ─── Render ────────────────────────────────────────────────────────
function goToStudioToolsForGuild(gid) {
  viewingGuildId = gid;
  const tc = isLeader ? document.getElementById('leaderTabs') : document.getElementById('lecturerTabs');
  const btn = Array.from(tc.querySelectorAll('.tab')).find(b => b.textContent.trim() === 'Studio Tools');
  showTab('studio-tools', btn);
}

function renderPrototypesPage() {
  const body = document.getElementById('prototypesBody');
  if (!body) return;

  if (isLeader || isLecturer) {
    body.innerHTML = renderPrototypesStaffView();
  } else {
    body.innerHTML = renderPrototypesStudentView();
  }
}

function renderPrototypesStaffView() {
  const lp = appData.config.lunchpoint || {};
  const guildRows = Object.entries(appData.guilds || {}).map(([gid, g]) => {
    const p = g.prototype || {};
    const statusBadge = p.scopeStatus === 'approved' ? '<span class="b b-green">Scope approved</span>'
      : p.scopeStatus === 'requested' ? '<span class="b b-amber">Awaiting approval</span>'
      : '<span class="b b-slate">Not submitted</span>';
    const frozen = p.frozenVersionId ? `<span class="b b-green">Frozen: ${p.frozenVersionId}</span>` : '<span class="b b-amber">Not frozen</span>';
    return `<tr>
      <td style="font-weight:700">${g.name}</td><td>${g.campus||'—'}</td>
      <td class="C">${statusBadge}</td><td class="C">${frozen}</td>
      <td class="C">${p.scopeStatus === 'requested' ? `<button class="btn btn-primary btn-sm" onclick="approveScope('${gid}')">Approve Scope</button>` : ''}
        <button class="btn btn-ghost btn-sm" onclick="goToStudioToolsForGuild('${gid}')">View Tools</button></td>
    </tr>`;
  }).join('');

  const orderRows = (lp.runningOrder || []).map(r =>
    `<tr><td>${formatSlotTime(lp.date, r.minutesFromStart)}</td><td style="font-weight:700">${r.guildName}</td><td>${r.campus}</td></tr>`
  ).join('');

  return `
    <div class="card">
      <div class="card-hdr blue">LunchPoint Event Configuration</div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group"><label>Date & time</label><input type="datetime-local" id="lpDate" value="${lp.date||''}"></div>
          <div class="form-group"><label>Venue / meeting link</label><input type="text" id="lpVenue" value="${lp.venue||''}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Slot length (minutes)</label><input type="number" id="lpSlotMinutes" value="${lp.slotMinutes||10}"></div>
          <div class="form-group"><label>Rehearsal time</label><input type="datetime-local" id="lpRehearsal" value="${lp.rehearsalAt||''}"></div>
          <div class="form-group"><label>Prototype freeze deadline</label><input type="datetime-local" id="lpFreeze" value="${lp.freezeAt||''}"></div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="saveLunchpointConfig()">Save LunchPoint Details</button>
        <button class="btn btn-ghost btn-sm" onclick="generateRunningOrder()">⚡ Generate Running Order</button>
        ${orderRows ? `<table style="margin-top:12px"><thead><tr><th>Time</th><th>Guild</th><th>Campus</th></tr></thead><tbody>${orderRows}</tbody></table>` : ''}
      </div>
    </div>
    <div class="card">
      <div class="card-hdr teal">Guild Prototype Status</div>
      <div class="card-body" style="padding:0"><table><thead><tr><th>Guild</th><th>Campus</th><th class="C">Scope</th><th class="C">Freeze</th><th class="C">Actions</th></tr></thead>
      <tbody>${guildRows || '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:16px">No guilds yet</td></tr>'}</tbody></table></div>
    </div>`;
}

function renderPrototypesStudentView() {
  const gid = myGuildId ? myGuildId() : null;
  if (!gid) return '<p style="color:#94a3b8;font-size:12px">Join a Guild first (see My Guild tab).</p>';
  const p = protoData(gid);
  const lp = appData.config.lunchpoint || {};
  const myOrder = (lp.runningOrder || []).find(r => r.guildId === gid);

  const scopeFields = ['users','problem','valueProp','process','dataNote','successMeasures','risks'];
  const scopeLabels = { users:'Who are the users?', problem:'What operational/customer problem?', valueProp:'Value proposition',
    process:'Process this affects', dataNote:'Data you will use (synthetic/public only)', successMeasures:'Success measures', risks:'Risks' };
  const scopeHTML = scopeFields.map(k => `<div class="form-group" style="margin-bottom:8px"><label>${scopeLabels[k]}</label>
    <textarea rows="2" onblur="saveProtoField('${gid}','${k}',this.value)">${p[k]||''}</textarea></div>`).join('');

  const versions = p.versions || [];
  const versionsHTML = versions.map(v => `<span class="b ${p.frozenVersionId===v.id?'b-green':'b-slate'}" style="margin-right:6px">
    ${v.label}${p.frozenVersionId===v.id?' 🔒':''}
    ${p.frozenVersionId!==v.id?` <a href="#" onclick="freezeProtoVersion('${gid}','${v.id}');return false" style="margin-left:4px">freeze</a>`:''}
  </span>`).join('') || '<span style="color:#94a3b8;font-size:11px">No versions saved yet</span>';

  return `
    <div class="alert alert-info">Design and build a small working system for your Guild's practice company here — it doesn't replace your CW1/CW2 report, it's what you demo at the Week 12 LunchPoint event.</div>
    ${myOrder ? `<div class="alert" style="background:#dcfce7;color:#15803D;border:1px solid #86efac">🎤 Your LunchPoint slot: <strong>${formatSlotTime(lp.date, myOrder.minutesFromStart)}</strong>${lp.venue?` at ${lp.venue}`:''}</div>` : ''}

    <div class="card">
      <div class="card-hdr blue">1. Scope</div>
      <div class="card-body">
        ${scopeHTML}
        ${p.scopeStatus === 'approved' ? '<span class="b b-green">Scope approved by tutor</span>'
          : p.scopeStatus === 'requested' ? '<span class="b b-amber">Awaiting tutor approval</span>'
          : `<button class="btn btn-primary btn-sm" onclick="requestScopeApproval('${gid}')">Submit Scope for Approval</button>`}
      </div>
    </div>

    <div class="card">
      <div class="card-hdr teal">2. Screens & Components (visual builder)</div>
      <div class="card-body">
        ${renderScreensEditor(gid, p.screens || [])}
        <button class="btn btn-ghost btn-sm" onclick="addScreen('${gid}')">+ Add Screen</button>
      </div>
    </div>

    <div class="card">
      <div class="card-hdr purple">3. Data Model</div>
      <div class="card-body">${renderProtoRowTable(gid, 'dataModel', [
        {key:'entity',label:'Entity'}, {key:'fields',label:'Fields'}
      ], p.dataModel)}</div>
    </div>

    <div class="card">
      <div class="card-hdr amber">4. Workflow Rules (input → validation → decision → result)</div>
      <div class="card-body">${renderProtoRowTable(gid, 'workflowRules', [
        {key:'trigger',label:'Trigger/Input'}, {key:'condition',label:'Validation/Condition'}, {key:'action',label:'Decision/Result'}
      ], p.workflowRules)}</div>
    </div>

    <div class="card">
      <div class="card-hdr slate">5. Test Cases (normal / edge / error)</div>
      <div class="card-body">${renderProtoRowTable(gid, 'testCases', [
        {key:'type',label:'Type'}, {key:'desc',label:'Scenario'}, {key:'expected',label:'Expected'}, {key:'actual',label:'Actual'}, {key:'fixed',label:'Fixed?'}
      ], p.testCases)}</div>
    </div>

    <div class="card">
      <div class="card-hdr green">6. Freeze for LunchPoint</div>
      <div class="card-body">
        <p style="font-size:11px;color:#64748b;margin-bottom:8px">Save a version snapshot, then freeze one for the showcase. You can keep editing after freezing — later edits go into a new draft, the frozen copy stays stable for the demo.</p>
        <button class="btn btn-primary btn-sm" onclick="saveProtoVersion('${gid}')">💾 Save Version</button>
        <div style="margin-top:8px">${versionsHTML}</div>
      </div>
    </div>`;
}
