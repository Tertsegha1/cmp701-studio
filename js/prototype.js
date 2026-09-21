// ─── Prototype Builder & LunchPoint Showcase ─────────────────────────
// Each Guild uses its approved practice company to design and build a small
// working system prototype (Section 4 "Guild system prototype", Section 5
// "in-platform prototype builder"), presented at the Week 12 LunchPoint
// event. Prototype data lives under guilds/{gid}/prototype/*; LunchPoint
// event config lives under config.lunchpoint — both already load with the
// existing appData.guilds / appData.config subscriptions.
const COMPONENT_TYPES = ['Heading', 'Text', 'Stat Card', 'Table', 'Chart', 'Form', 'Button', 'Navigation'];
const STAT_SOURCES = [
  { key: 'rowCount',     label: 'Dataset row count' },
  { key: 'colAvg',       label: 'Column average' },
  { key: 'colSum',       label: 'Column sum' },
  { key: 'colMax',       label: 'Column max' },
  { key: 'colMin',       label: 'Column min' },
  { key: 'evidenceCount',label: 'Evidence sources logged' },
  { key: 'revenue',      label: 'Est. revenue (Business Model)' },
  { key: 'margin',       label: 'Margin (Business Model)' }
];

// Real data behind Stat Card / Table / Chart components — pulled live from
// this Guild's own Studio Tools work (Data Workbench, Evidence Library,
// Business Model & Revenue), so the prototype reflects actual Guild data
// instead of placeholder numbers.
// getPrimaryDataset(gid) is defined in studio-tools.js (loaded before this
// file) and reads the Guild's chosen dataset from the Data Workbench's
// multi-dataset structure — the one the Guild marked "Use in Prototype
// Builder" (defaults to the first uploaded dataset).
function getDataColumns(gid) {
  const ds = getPrimaryDataset(gid);
  return (ds && ds.stats) || [];
}
function getNumericColumns(gid) {
  return getDataColumns(gid).filter(s => s.type === 'numeric');
}

function computeStatCardValue(gid, c) {
  const g = appData.guilds[gid] || {};
  const art = g.artefacts || {};
  const ds = getPrimaryDataset(gid);
  switch (c.source) {
    case 'rowCount': return (ds && ds.rowCount !== undefined) ? String(ds.rowCount) : '—';
    case 'colAvg': case 'colSum': case 'colMax': case 'colMin': {
      const col = getDataColumns(gid).find(s => s.name === c.column && s.type === 'numeric');
      if (!col) return '—';
      const map = { colAvg: 'mean', colSum: null, colMax: 'max', colMin: 'min' };
      if (c.source === 'colSum') return '—'; // sum isn't tracked by the Data Workbench's stats — use avg/max/min
      return col[map[c.source]] !== undefined ? String(col[map[c.source]]) : '—';
    }
    case 'evidenceCount': return String(((art.evidence && art.evidence.rows) || []).length);
    case 'revenue': case 'margin': {
      const inputs = (art.bmc && art.bmc.revenueInputs) || {};
      const computed = (typeof computeRevenue === 'function') ? computeRevenue(inputs) : { revenue: 0, margin: 0 };
      return '£' + (c.source === 'revenue' ? computed.revenue : computed.margin).toLocaleString();
    }
    default: return '—';
  }
}

// Parses a simple condition like ">100", "<=50", "==Approved" and compares
// against a value. Deliberately not a general expression evaluator — this
// only ever runs against the Guild's own Prototype Builder configuration.
function evaluateCondition(value, condStr) {
  if (!condStr) return null;
  const m = condStr.trim().match(/^(>=|<=|==|!=|>|<)\s*(.+)$/);
  if (!m) return null;
  const [, op, rawTarget] = m;
  const target = rawTarget.trim();
  const numValue = parseFloat(value), numTarget = parseFloat(target);
  const bothNumeric = !isNaN(numValue) && !isNaN(numTarget);
  const a = bothNumeric ? numValue : String(value);
  const b = bothNumeric ? numTarget : target;
  switch (op) {
    case '>': return a > b; case '>=': return a >= b;
    case '<': return a < b; case '<=': return a <= b;
    case '==': return String(a) === String(b); case '!=': return String(a) !== String(b);
    default: return null;
  }
}

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

// ctx = {gid, si, ci, screens} — real, interactive rendering: Stat Card/Table/
// Chart read live Guild data; Form/Button/Navigation actually respond to clicks.
function renderComponentPreview(c, ctx) {
  const { gid, si, ci, screens } = ctx || {};
  switch (c.type) {
    case 'Heading': return `<h4 style="margin:6px 0">${c.label}</h4>`;
    case 'Text':    return `<p style="font-size:12px">${c.label}</p>`;

    case 'Stat Card': {
      const value = computeStatCardValue(gid, c);
      return `<div class="kpi tl" style="max-width:160px"><div class="v">${value}</div><div class="l">${c.label}</div></div>`;
    }

    case 'Table': {
      const ds = getPrimaryDataset(gid);
      if (!ds || !ds.csvText) return `<div class="alert alert-info" style="margin:0">${c.label}: no dataset yet — add one in the Data Workbench tool.</div>`;
      const parsed = parseCSVText(ds.csvText);
      const rows = parsed.rows.slice(0, 5);
      return `<div style="font-size:10px;font-weight:700;color:#94a3b8;margin-bottom:4px">${c.label} (${ds.name})</div>
        <table style="font-size:10px"><thead><tr>${parsed.headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r => `<tr>${r.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    }

    case 'Chart': {
      const ds = getPrimaryDataset(gid);
      const col = ds && ds.stats && ds.stats.find(s => s.name === c.column);
      if (!col) return `<div class="alert alert-info" style="margin:0">${c.label}: choose a column bound to the Data Workbench dataset.</div>`;
      if (col.type === 'numeric') {
        return `<div style="font-size:10px;font-weight:700;color:#94a3b8;margin-bottom:4px">${c.label} — ${col.name}</div>
          <div style="font-size:11px">min ${col.min} · max ${col.max} · mean ${col.mean}</div>`;
      }
      const bars = col.top.map(([v, n]) => {
        const pct = Math.round(n / (ds.rowCount || 1) * 100);
        return `<div style="display:flex;align-items:center;gap:6px;font-size:10px;margin-bottom:2px"><span style="width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${v}</span><div class="xp-bar-wrap" style="flex:1;height:6px;margin:0"><div class="xp-bar-fill" style="width:${pct}%;background:#7C3AED"></div></div><span>${n}</span></div>`;
      }).join('');
      return `<div style="font-size:10px;font-weight:700;color:#94a3b8;margin-bottom:4px">${c.label} — ${col.name}</div>${bars}`;
    }

    case 'Form': {
      const type = c.fieldType === 'text' ? 'text' : 'number';
      return `<div style="border:1px solid #e2e8f0;border-radius:6px;padding:8px">
        <label style="font-size:10px;font-weight:700;color:#475569">${c.label}</label>
        <input type="${type}" value="${c.value||''}" onchange="updateComponent('${gid}',${si},${ci},'value',this.value)" style="width:100%;margin-top:4px">
      </div>`;
    }

    case 'Button': {
      const resultId = `btnResult-${gid}-${si}-${ci}`;
      return `<button class="btn btn-primary btn-sm" onclick="runPrototypeButton('${gid}',${si},${ci})">${c.label}</button>
        <div id="${resultId}" style="margin-top:6px;font-size:12px;font-weight:700"></div>`;
    }

    case 'Navigation': {
      const targetIdx = (screens || []).findIndex(s => s.id === c.targetScreenId);
      const targetName = targetIdx >= 0 ? screens[targetIdx].name : '(pick a screen)';
      return `<button class="btn btn-sm" style="background:#1B3A6B;color:#fff;border:none" onclick="setPreviewScreen('${gid}','${c.targetScreenId||''}')">☰ ${c.label} → ${targetName}</button>`;
    }

    default: return `<p style="font-size:12px">${c.label}</p>`;
  }
}

// Finds the first Form component with a value on the given screen, evaluates
// the Button's condition against it, and shows the result inline — instant,
// client-side, no Firebase write (this is a live demo interaction, not data).
function runPrototypeButton(gid, si, ci) {
  const screens = protoData(gid).screens || [];
  const screen = screens[si];
  const button = screen && screen.components[ci];
  const resultEl = document.getElementById(`btnResult-${gid}-${si}-${ci}`);
  if (!button || !resultEl) return;
  const form = (screen.components || []).find(c => c.type === 'Form' && c.value !== undefined && c.value !== '');
  if (!form) { resultEl.innerHTML = '<span style="color:#B45309">Fill in a Form field on this screen first.</span>'; return; }
  if (!button.condition) { resultEl.innerHTML = '<span style="color:#B45309">This Button has no condition set — edit it above.</span>'; return; }
  const passed = evaluateCondition(form.value, button.condition);
  if (passed === null) { resultEl.innerHTML = '<span style="color:#B45309">Condition format not recognised — try e.g. &gt;100</span>'; return; }
  const message = passed ? (button.resultTrue || 'Condition met') : (button.resultFalse || 'Condition not met');
  resultEl.innerHTML = `<span style="color:${passed?'#15803D':'#B91C1C'}">${message}</span>`;
}

// Which screen the Live Preview panel is currently showing, per Guild —
// transient UI state, not persisted (navigating the demo isn't Guild data).
let previewActiveScreen = {};
function setPreviewScreen(gid, screenId) {
  if (!screenId) return;
  previewActiveScreen[gid] = screenId;
  renderPrototypesPage();
}

// A single-screen, phone/app-style runner: pick a screen (via the tab strip
// or a Navigation component's own click), see it rendered full-width with
// real data and real interactions — this is the "press play" view of the
// system the Guild is building, separate from the structural editor above.
function renderLivePreviewPanel(gid, p) {
  const screens = p.screens || [];
  if (!screens.length) {
    return `<div class="card"><div class="card-hdr green">▶ Run Preview</div>
      <div class="card-body"><p style="color:#94a3b8;font-size:12px">Add a screen above to see it running here.</p></div></div>`;
  }
  let activeId = previewActiveScreen[gid];
  if (!activeId || !screens.some(s => s.id === activeId)) activeId = screens[0].id;
  const activeIdx = screens.findIndex(s => s.id === activeId);
  const active = screens[activeIdx];

  const tabs = screens.map(s => `<button class="btn ${s.id===activeId?'btn-primary':'btn-ghost'} btn-sm" onclick="setPreviewScreen('${gid}','${s.id}')">${s.name}</button>`).join(' ');

  return `<div class="card">
    <div class="card-hdr green">▶ Run Preview</div>
    <div class="card-body">
      <div style="margin-bottom:10px;display:flex;flex-wrap:wrap;gap:4px">${tabs}</div>
      <div style="border:2px solid #1B3A6B;border-radius:10px;padding:16px;background:#fff;max-width:420px;margin:0 auto">
        ${(active.components||[]).map((c, ci) => renderComponentPreview(c, {gid, si: activeIdx, ci, screens})).join('') || '<p style="color:#cbd5e1;font-size:11px;text-align:center">This screen has no components yet</p>'}
      </div>
    </div>
  </div>`;
}

// Extra config controls shown per component type, beyond type + label —
// this is what makes each component bind to real Guild data or real logic
// instead of being a static label.
function renderComponentConfig(gid, si, ci, c) {
  const set = (field, value) => `updateComponent('${gid}',${si},${ci},'${field}',${value})`;
  if (c.type === 'Stat Card') {
    const needsColumn = ['colAvg','colMax','colMin'].includes(c.source);
    const numericCols = getNumericColumns(gid);
    return `<div style="display:flex;gap:4px;margin:2px 0 4px">
      <select onchange="${set('source','this.value')}" style="font-size:10px;flex:1">
        <option value="">— data source —</option>
        ${STAT_SOURCES.map(s => `<option value="${s.key}" ${c.source===s.key?'selected':''}>${s.label}</option>`).join('')}
      </select>
      ${needsColumn ? `<select onchange="${set('column','this.value')}" style="font-size:10px;flex:1">
        <option value="">— column —</option>
        ${numericCols.map(col => `<option value="${col.name}" ${c.column===col.name?'selected':''}>${col.name}</option>`).join('')}
      </select>` : ''}
    </div>`;
  }
  if (c.type === 'Chart') {
    const cols = getDataColumns(gid);
    return `<div style="margin:2px 0 4px"><select onchange="${set('column','this.value')}" style="font-size:10px;width:100%">
      <option value="">— column to chart —</option>
      ${cols.map(col => `<option value="${col.name}" ${c.column===col.name?'selected':''}>${col.name} (${col.type})</option>`).join('')}
    </select></div>`;
  }
  if (c.type === 'Form') {
    return `<div style="margin:2px 0 4px"><select onchange="${set('fieldType','this.value')}" style="font-size:10px;width:100%">
      <option value="number" ${c.fieldType!=='text'?'selected':''}>Number input</option>
      <option value="text" ${c.fieldType==='text'?'selected':''}>Text input</option>
    </select></div>`;
  }
  if (c.type === 'Button') {
    return `<div style="display:flex;gap:4px;margin:2px 0 4px">
      <input placeholder="Condition e.g. >100" value="${c.condition||''}" onblur="${set('condition','this.value')}" style="font-size:10px;flex:1">
      <input placeholder="If true…" value="${c.resultTrue||''}" onblur="${set('resultTrue','this.value')}" style="font-size:10px;flex:1">
      <input placeholder="If false…" value="${c.resultFalse||''}" onblur="${set('resultFalse','this.value')}" style="font-size:10px;flex:1">
    </div>`;
  }
  if (c.type === 'Navigation') {
    return '';  // screen options rendered by caller, which has the full screens list
  }
  return '';
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
            <div style="border:1px solid #f1f5f9;border-radius:6px;padding:5px;margin-bottom:6px">
              <div style="display:flex;gap:4px">
                <select onchange="updateComponent('${gid}',${si},${ci},'type',this.value)" style="font-size:10px">
                  ${COMPONENT_TYPES.map(t => `<option ${c.type===t?'selected':''}>${t}</option>`).join('')}
                </select>
                <input value="${c.label}" onblur="updateComponent('${gid}',${si},${ci},'label',this.value)" style="flex:1;font-size:10px">
                <button class="btn btn-danger btn-sm" onclick="removeComponent('${gid}',${si},${ci})">✕</button>
              </div>
              ${c.type === 'Navigation'
                ? `<div style="margin:2px 0 4px"><select onchange="updateComponent('${gid}',${si},${ci},'targetScreenId',this.value)" style="font-size:10px;width:100%">
                    <option value="">— target screen —</option>
                    ${screens.filter((s,i)=>i!==si).map(s => `<option value="${s.id}" ${c.targetScreenId===s.id?'selected':''}>${s.name}</option>`).join('')}
                  </select></div>`
                : renderComponentConfig(gid, si, ci, c)}
            </div>`).join('') || '<p style="color:#94a3b8;font-size:11px">No components yet</p>'}
          <button class="btn btn-ghost btn-sm" onclick="addComponent('${gid}',${si})">+ Add Component</button>
        </div>
        <div>
          <p style="font-size:10px;font-weight:700;color:#94a3b8;margin-bottom:6px">LIVE PREVIEW</p>
          <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px;background:#f8fafc;min-height:120px">
            ${(screen.components||[]).map((c, ci) => renderComponentPreview(c, {gid, si, ci, screens})).join('') || '<p style="color:#cbd5e1;font-size:11px">Preview appears here</p>'}
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
        <div class="alert alert-info">Stat Card, Table and Chart bind to your Guild's own Data Workbench / Evidence Library / Business Model data — fill those in first for real numbers here instead of dashes. Form + Button pairs actually run: type a value, click the Button, and it evaluates the condition you set.</div>
        ${renderScreensEditor(gid, p.screens || [])}
        <button class="btn btn-ghost btn-sm" onclick="addScreen('${gid}')">+ Add Screen</button>
      </div>
    </div>

    ${renderLivePreviewPanel(gid, p)}

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
