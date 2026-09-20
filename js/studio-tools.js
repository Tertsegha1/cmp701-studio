// ─── Studio Tools (Section 5 artefact tools) ────────────────────────
// Guild-scoped, formative tools that generate the artefacts CW1/CW2 draw
// method from. Data lives under guilds/{gid}/artefacts/{toolKey} — already
// loaded into appData.guilds via the existing Firebase subscription, so no
// changes to the main app's data-loading code were needed.
let currentTool = 'evidence';

const TOOL_DEFS = [
  { key: 'evidence',  label: 'Evidence Library',            icon: '📚' },
  { key: 'maturity',  label: 'Current State & Maturity',    icon: '📊' },
  { key: 'strategy',  label: 'Industry Strategy Suite',     icon: '🧭' },
  { key: 'platform',  label: 'Platform & Customer Networks',icon: '🔗' },
  { key: 'data',      label: 'Data Workbench',              icon: '🗃' },
  { key: 'model',     label: 'Model Lab',                   icon: '🤖' },
  { key: 'bmc',       label: 'Business Model & Revenue',    icon: '💡' },
  { key: 'process',   label: 'Process & Implementation',    icon: '⚙' },
  { key: 'innovation',label: 'Innovation & Knowledge',      icon: '🚀' }
];

function myGuildId() {
  if (!currentStudent || !appData.students[currentStudent]) return null;
  return appData.students[currentStudent].guildId || null;
}

function toolData(gid, key) {
  const g = appData.guilds[gid];
  return (g && g.artefacts && g.artefacts[key]) || {};
}

async function saveToolField(gid, key, field, value) {
  await sRef(`guilds/${gid}/artefacts/${key}/${field}`).set(value);
  await sRef(`guilds/${gid}/artefacts/${key}/updatedAt`).set(Date.now());
  toast('Saved', 'ok');
}

async function saveSnapshotVersion(gid, key, label) {
  const data = toolData(gid, key);
  const versions = data.versions || [];
  const { versions: _v, ...snapshot } = data;
  versions.push({ id: 'v' + (versions.length + 1), label: label || ('Version ' + (versions.length + 1)), ts: Date.now(), snapshot });
  await sRef(`guilds/${gid}/artefacts/${key}/versions`).set(versions);
  toast('Version saved', 'ok');
}

function exportHeader(gid) {
  const g = appData.guilds[gid] || {};
  const c = g.company || {};
  return `<div style="font-size:10px;color:#94a3b8;margin-bottom:10px">
    Organisation: <strong>${c.name || 'Not set'}</strong> · Guild scope · Formative practice artefact ·
    Author(s): ${g.members ? Object.values(g.members).map(m=>m.name).join(', ') : '—'} ·
    ${new Date().toLocaleDateString('en-GB')}
  </div>`;
}

// ─── Generic: fixed-section text tool (PESTLE/Five Forces/SWOT/MOST/Ansoff/Platform/BMC blocks) ─
function renderTextSections(gid, key, sections, values) {
  return sections.map(sec => `
    <div class="form-group" style="margin-bottom:10px">
      <label>${sec.label}</label>
      <textarea rows="3" data-field="${sec.key}" onblur="saveToolField('${gid}','${key}','${sec.key}',this.value)">${(values && values[sec.key]) || ''}</textarea>
    </div>`).join('');
}

// ─── Generic: add/remove row list tool ──────────────────────────────
function renderListTool(gid, key, columns, rows, extraNote) {
  rows = rows || [];
  const head = columns.map(c => `<th>${c.label}</th>`).join('') + '<th class="C">—</th>';
  const body = rows.map((row, i) => `<tr>
    ${columns.map(c => `<td><input type="${c.type||'text'}" value="${(row[c.key]??'').toString().replace(/"/g,'&quot;')}" onblur="updateListRow('${gid}','${key}',${i},'${c.key}',this.value)" style="width:100%;border:1px solid #e2e8f0;border-radius:4px;padding:3px 5px;font-size:11px"></td>`).join('')}
    <td class="C"><button class="btn btn-danger btn-sm" onclick="removeListRow('${gid}','${key}',${i})">✕</button></td>
  </tr>`).join('');
  return `
    ${extraNote || ''}
    <table style="margin-bottom:8px"><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${columns.length+1}" style="text-align:center;color:#94a3b8;padding:10px">No entries yet</td></tr>`}</tbody></table>
    <button class="btn btn-ghost btn-sm" onclick="addListRow('${gid}','${key}',${JSON.stringify(columns.map(c=>c.key))})">+ Add Row</button>`;
}

async function addListRow(gid, key, columnKeysJSON) {
  const columnKeys = typeof columnKeysJSON === 'string' ? JSON.parse(columnKeysJSON) : columnKeysJSON;
  const rows = toolData(gid, key).rows || [];
  const blank = {}; columnKeys.forEach(k => blank[k] = '');
  rows.push(blank);
  await sRef(`guilds/${gid}/artefacts/${key}/rows`).set(rows);
}
async function updateListRow(gid, key, idx, field, value) {
  const rows = toolData(gid, key).rows || [];
  if (!rows[idx]) return;
  rows[idx][field] = value;
  await sRef(`guilds/${gid}/artefacts/${key}/rows`).set(rows);
  await sRef(`guilds/${gid}/artefacts/${key}/updatedAt`).set(Date.now());
}
async function removeListRow(gid, key, idx) {
  const rows = toolData(gid, key).rows || [];
  rows.splice(idx, 1);
  await sRef(`guilds/${gid}/artefacts/${key}/rows`).set(rows);
}

// ─── Evidence Library ────────────────────────────────────────────────
function renderEvidenceTool(gid) {
  const data = toolData(gid, 'evidence');
  const rows = data.rows || [];
  const flags = [];
  rows.forEach((r, i) => {
    if (!r.date) flags.push(`Row ${i+1}: missing publication date`);
    if (r.reliability && +r.reliability < 3) flags.push(`Row ${i+1}: low reliability source (${r.reliability}/5) — check before citing`);
    if (r.url && !/^https?:\/\//i.test(r.url)) flags.push(`Row ${i+1}: link may not be reachable (no http/https)`);
  });
  const cols = [
    { key:'title', label:'Title/Claim' }, { key:'url', label:'URL' }, { key:'publisher', label:'Publisher' },
    { key:'date', label:'Date', type:'date' }, { key:'reliability', label:'Reliability (1-5)' }, { key:'relevance', label:'Relevance (1-5)' }
  ];
  return `<h4>Evidence Library</h4>${exportHeader(gid)}
    ${renderListTool(gid, 'evidence', cols, rows)}
    ${flags.length ? `<div class="alert" style="background:#fef9c3;color:#854d0e;border:1px solid #fde68a">⚠ ${flags.join(' · ')}</div>` : ''}`;
}

// ─── Current State & Maturity ────────────────────────────────────────
function renderMaturityTool(gid) {
  const data = toolData(gid, 'maturity');
  const dims = ['Technology', 'Process', 'People', 'Data'];
  const rows = dims.map(d => {
    const key = d.toLowerCase();
    const dim = (data[key]) || {};
    const score = dim.score || 0;
    return `<div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <strong style="font-size:12px">${d}</strong>
        <select onchange="saveToolField('${gid}','maturity','${key}',{score:+this.value, evidence: appData.guilds['${gid}'].artefacts.maturity.${key}?.evidence||''})">
          ${[0,1,2,3,4,5].map(n => `<option value="${n}" ${score==n?'selected':''}>${n===0?'— Score —':n}</option>`).join('')}
        </select>
      </div>
      <div class="xp-bar-wrap" style="height:8px;margin-bottom:6px"><div class="xp-bar-fill" style="width:${score*20}%;background:#0D7377"></div></div>
      <textarea rows="2" placeholder="Evidence / justification for this score…" onblur="saveToolField('${gid}','maturity','${key}',{score:${score}, evidence:this.value})">${dim.evidence || ''}</textarea>
    </div>`;
  }).join('');
  return `<h4>Current State & Maturity</h4>${exportHeader(gid)}
    <div class="alert alert-info">Scores are student judgements, not certified maturity ratings — always pair a score with evidence.</div>
    ${rows}`;
}

// ─── Industry Strategy Suite (PESTLE / Five Forces / SWOT / MOST / Ansoff / Stakeholders) ─
let strategySubTab = 'pestle';
function setStrategySubTab(tab) { strategySubTab = tab; renderStudioToolPanel(); }

const STRATEGY_FRAMEWORKS = {
  pestle: { toolKey: 'strategy_pestle', kind: 'text', sections: [
    {key:'political',label:'Political'}, {key:'economic',label:'Economic'}, {key:'social',label:'Social'},
    {key:'technological',label:'Technological'}, {key:'legal',label:'Legal'}, {key:'environmental',label:'Environmental'}
  ]},
  fiveForces: { toolKey: 'strategy_fiveforces', kind: 'text', sections: [
    {key:'rivalry',label:'Rivalry Among Competitors'}, {key:'newEntrants',label:'Threat of New Entrants'},
    {key:'substitutes',label:'Threat of Substitutes'}, {key:'buyerPower',label:'Buyer Power'}, {key:'supplierPower',label:'Supplier Power'}
  ]},
  swot: { toolKey: 'strategy_swot', kind: 'text', sections: [
    {key:'strengths',label:'Strengths'}, {key:'weaknesses',label:'Weaknesses'},
    {key:'opportunities',label:'Opportunities'}, {key:'threats',label:'Threats'}
  ]},
  most: { toolKey: 'strategy_most', kind: 'text', sections: [
    {key:'mission',label:'Mission'}, {key:'objectives',label:'Objectives'},
    {key:'strategy',label:'Strategy'}, {key:'tactics',label:'Tactics'}
  ]},
  ansoff: { toolKey: 'strategy_ansoff', kind: 'text', sections: [
    {key:'marketPenetration',label:'Market Penetration (existing product, existing market)'},
    {key:'marketDevelopment',label:'Market Development (existing product, new market)'},
    {key:'productDevelopment',label:'Product Development (new product, existing market)'},
    {key:'diversification',label:'Diversification (new product, new market)'}
  ]},
  stakeholders: { toolKey: 'strategy_stakeholders', kind: 'list', columns: [
    {key:'name',label:'Stakeholder'}, {key:'power',label:'Power (1-5)'}, {key:'interest',label:'Interest (1-5)'}, {key:'strategy',label:'Engagement strategy'}
  ]}
};

function renderStrategyTool(gid) {
  const tabs = [['pestle','PESTLE'], ['fiveForces','Five Forces'], ['swot','SWOT'], ['most','MOST'], ['ansoff','Ansoff'], ['stakeholders','Stakeholder Grid']];
  const tabBar = tabs.map(([k,l]) => `<button class="btn ${strategySubTab===k?'btn-primary':'btn-ghost'} btn-sm" onclick="setStrategySubTab('${k}')">${l}</button>`).join(' ');

  const fw = STRATEGY_FRAMEWORKS[strategySubTab];
  const data = toolData(gid, fw.toolKey);
  const content = fw.kind === 'text'
    ? renderTextSections(gid, fw.toolKey, fw.sections, data)
    : renderListTool(gid, fw.toolKey, fw.columns, data.rows);

  return `<h4>Industry Strategy Suite</h4>${exportHeader(gid)}
    <div style="margin-bottom:12px;display:flex;flex-wrap:wrap;gap:4px">${tabBar}</div>
    ${content}`;
}

// ─── Platform & Customer Networks ────────────────────────────────────
function renderPlatformTool(gid) {
  const data = toolData(gid, 'platform');
  return `<h4>Platform & Customer Networks</h4>${exportHeader(gid)}
    ${renderTextSections(gid, 'platform', [
      {key:'sides',label:'Participant sides (who trades/interacts on the platform?)'},
      {key:'interactions',label:'Core interactions'},
      {key:'incentives',label:'Incentives to participate'},
      {key:'acquisition',label:'Acquisition strategy (chicken-and-egg problem)'},
      {key:'networkEffects',label:'Network effects (same-side / cross-side)'},
      {key:'trustGovernance',label:'Trust, quality control and governance'},
      {key:'disintermediation',label:'Disintermediation and platform risks'},
      {key:'suitability',label:'Is this actually a platform, or just online sales? Justify.'}
    ], data)}`;
}

// ─── Data Workbench ───────────────────────────────────────────────────
function parseCSVText(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(l => l.split(',').map(c => c.trim()));
  return { headers, rows };
}

function computeColumnStats(headers, rows) {
  return headers.map((h, i) => {
    const col = rows.map(r => r[i]).filter(v => v !== undefined && v !== '');
    const missing = rows.length - col.length;
    const numeric = col.filter(v => v !== '' && !isNaN(+v)).map(Number);
    const isNumeric = numeric.length === col.length && col.length > 0;
    if (isNumeric) {
      const mean = numeric.reduce((a,b)=>a+b,0) / numeric.length;
      return { name: h, type: 'numeric', missing, min: Math.min(...numeric), max: Math.max(...numeric), mean: +mean.toFixed(2) };
    }
    const counts = {};
    col.forEach(v => counts[v] = (counts[v]||0) + 1);
    return { name: h, type: 'categorical', missing, distinct: Object.keys(counts).length, top: Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5) };
  });
}

async function analyseDataset() {
  const gid = myGuildId();
  if (!gid) return;
  const text = document.getElementById('dwCsvInput').value;
  const parsed = parseCSVText(text);
  if (!parsed.headers.length) { toast('Paste some CSV data first', 'err'); return; }
  const stats = computeColumnStats(parsed.headers, parsed.rows);
  await sRef(`guilds/${gid}/artefacts/data`).update({ csvText: text, rowCount: parsed.rows.length, stats, updatedAt: Date.now() });
  renderStudioToolPanel();
}

function renderDataTool(gid) {
  const data = toolData(gid, 'data');
  const statsHTML = (data.stats || []).map(s => {
    if (s.type === 'numeric') {
      return `<tr><td>${s.name}</td><td>numeric</td><td class="C">${s.missing}</td><td colspan="2">min ${s.min} · max ${s.max} · mean ${s.mean}</td></tr>`;
    }
    const bars = s.top.map(entry => {
      const v = entry[0], c = entry[1];
      const pct = Math.round(c / (data.rowCount || 1) * 100);
      return `<div style="display:flex;align-items:center;gap:6px;font-size:10px;margin-bottom:2px"><span style="width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${v}</span><div class="xp-bar-wrap" style="flex:1;height:6px;margin:0"><div class="xp-bar-fill" style="width:${pct}%;background:#7C3AED"></div></div><span>${c}</span></div>`;
    }).join('');
    return `<tr><td>${s.name}</td><td>categorical</td><td class="C">${s.missing}</td><td colspan="2">${s.distinct} distinct<br>${bars}</td></tr>`;
  }).join('');
  return `<h4>Data Workbench</h4>${exportHeader(gid)}
    <div class="alert alert-info">Paste CSV text (first row = headers). No live customer/patient data — use public, synthetic, or anonymised datasets only.</div>
    <textarea id="dwCsvInput" rows="6" placeholder="date,region,units_sold">${data.csvText || ''}</textarea>
    <div style="margin:8px 0"><button class="btn btn-primary btn-sm" onclick="analyseDataset()">Analyse Dataset</button>
      ${data.rowCount !== undefined ? `<span style="margin-left:8px;font-size:11px;color:#64748b">${data.rowCount} rows loaded</span>` : ''}</div>
    ${data.stats ? `<table><thead><tr><th>Column</th><th>Type</th><th class="C">Missing</th><th colspan="2">Summary</th></tr></thead><tbody>${statsHTML}</tbody></table>` : ''}
    <div class="form-group" style="margin-top:10px"><label>Interpretation and caveats</label>
      <textarea rows="3" onblur="saveToolField('${gid}','data','interpretation',this.value)">${data.interpretation || ''}</textarea></div>`;
}

// ─── Model Lab ─────────────────────────────────────────────────────────
function renderModelTool(gid) {
  const data = toolData(gid, 'model');
  const taskType = data.taskType || '';
  const taskOptions = ['Descriptive','Forecasting','Classification','Clustering','Association']
    .map(t => `<option ${taskType===t?'selected':''}>${t}</option>`).join('');
  return `<h4>Model Lab</h4>${exportHeader(gid)}
    <div class="form-group" style="margin-bottom:10px"><label>Task type</label>
      <select onchange="saveToolField('${gid}','model','taskType',this.value)">
        <option value="">— Select —</option>${taskOptions}
      </select></div>
    ${renderTextSections(gid, 'model', [
      {key:'method',label:'Method and tool used (e.g. RapidMiner ARIMA, k-means, association rules)'},
      {key:'validation',label:'Validation approach (train/test split, or chronological order for forecasting)'},
      {key:'metrics',label:'Performance metrics, or support/confidence for association rules'},
      {key:'limitations',label:'Limitations and risk of leakage'},
      {key:'decision',label:'Business decision implication'},
      {key:'rapidMinerLink',label:'Link to RapidMiner result export (optional)'}
    ], data)}`;
}

// ─── Business Model & Revenue ────────────────────────────────────────
function computeRevenue(inputs) {
  const units = +inputs.units || 0, price = +inputs.price || 0, volume = +inputs.volume || 0,
        conv = (+inputs.conversion || 0) / 100, churn = (+inputs.churn || 0) / 100, costs = +inputs.costs || 0;
  const customers = volume * conv;
  const revenue = units > 0 ? units * price : customers * price;
  const retained = customers * (1 - churn);
  const margin = revenue - costs;
  return { revenue: +revenue.toFixed(2), retainedCustomers: +retained.toFixed(1), margin: +margin.toFixed(2) };
}

async function saveRevenueInputs() {
  const gid = myGuildId();
  const inputs = {
    units: document.getElementById('revUnits').value, price: document.getElementById('revPrice').value,
    volume: document.getElementById('revVolume').value, conversion: document.getElementById('revConversion').value,
    churn: document.getElementById('revChurn').value, costs: document.getElementById('revCosts').value
  };
  await sRef(`guilds/${gid}/artefacts/bmc/revenueInputs`).set(inputs);
  renderStudioToolPanel();
}

function renderBmcTool(gid) {
  const data = toolData(gid, 'bmc');
  const blocks = [
    {key:'partners',label:'Key Partners'}, {key:'activities',label:'Key Activities'}, {key:'resources',label:'Key Resources'},
    {key:'value',label:'Value Propositions'}, {key:'relationships',label:'Customer Relationships'}, {key:'channels',label:'Channels'},
    {key:'segments',label:'Customer Segments'}, {key:'costs',label:'Cost Structure'}, {key:'revenueStreams',label:'Revenue Streams'}
  ];
  const blocksHTML = blocks.map(b =>
    `<div class="form-group"><label style="font-size:10px">${b.label}</label>
      <textarea rows="3" onblur="saveToolField('${gid}','bmc','${b.key}',this.value)">${data[b.key] || ''}</textarea></div>`
  ).join('');
  const inputs = data.revenueInputs || {};
  const computed = computeRevenue(inputs);
  return `<h4>Business Model &amp; Revenue</h4>${exportHeader(gid)}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${blocksHTML}</div>
    <hr style="margin:14px 0;border:none;border-top:1px solid #e2e8f0">
    <h4 style="font-size:12px">Revenue Scenario Calculator</h4>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px">
      <div class="form-group"><label>Units sold (blank if subscription)</label><input type="number" id="revUnits" value="${inputs.units||''}"></div>
      <div class="form-group"><label>Price per unit/period</label><input type="number" id="revPrice" value="${inputs.price||''}"></div>
      <div class="form-group"><label>Addressable volume</label><input type="number" id="revVolume" value="${inputs.volume||''}"></div>
      <div class="form-group"><label>Conversion %</label><input type="number" id="revConversion" value="${inputs.conversion||''}"></div>
      <div class="form-group"><label>Churn %</label><input type="number" id="revChurn" value="${inputs.churn||''}"></div>
      <div class="form-group"><label>Costs (period)</label><input type="number" id="revCosts" value="${inputs.costs||''}"></div>
    </div>
    <button class="btn btn-primary btn-sm" onclick="saveRevenueInputs()">Calculate &amp; Save</button>
    <div class="krow" style="margin-top:12px">
      <div class="kpi tl"><div class="v">£${computed.revenue.toLocaleString()}</div><div class="l">Est. Revenue / period</div></div>
      <div class="kpi gr"><div class="v">${computed.retainedCustomers}</div><div class="l">Retained customers</div></div>
      <div class="kpi ${computed.margin>=0?'gr':'am'}"><div class="v">£${computed.margin.toLocaleString()}</div><div class="l">Margin</div></div>
    </div>
    <div class="alert" style="background:#fef9c3;color:#854d0e;border:1px solid #fde68a">Illustrative scenario only, based on your assumptions — never present as a factual forecast.</div>`;
}

// ─── Process & Implementation ────────────────────────────────────────
function renderProcessTool(gid) {
  const data = toolData(gid, 'process');
  const cols = [
    {key:'step',label:'Process Step'}, {key:'actor',label:'Actor'}, {key:'bottleneck',label:'Bottleneck'},
    {key:'automation',label:'Proposed Automation'}, {key:'owner',label:'Owner'}, {key:'costBand',label:'Cost Band'},
    {key:'risk',label:'Risk'}, {key:'kpi',label:'KPI'}
  ];
  return `<h4>Process & Implementation</h4>${exportHeader(gid)}
    <p style="font-size:11px;font-weight:700;color:#475569;margin-bottom:6px">Before → After Process Map</p>
    ${renderListTool(gid, 'process', cols, data.rows)}
    <div class="form-group" style="margin-top:10px"><label>Implementation roadmap (phases)</label>
      <textarea rows="3" onblur="saveToolField('${gid}','process','roadmap',this.value)">${data.roadmap || ''}</textarea></div>`;
}

// ─── Innovation & Knowledge ───────────────────────────────────────────
function renderInnovationTool(gid) {
  const data = toolData(gid, 'innovation');
  const cols = [
    {key:'hypothesis',label:'Hypothesis'}, {key:'experiment',label:'Experiment'}, {key:'successCriterion',label:'Success Criterion'},
    {key:'ethics',label:'Ethical Consideration'}, {key:'knowledgeCapture',label:'Knowledge Capture/Sharing'}, {key:'roles',label:'Roles'}
  ];
  return `<h4>Innovation & Knowledge</h4>${exportHeader(gid)}
    ${renderListTool(gid, 'innovation', cols, data.rows)}`;
}

// ─── Dispatcher ──────────────────────────────────────────────────────
const TOOL_RENDERERS = {
  evidence: renderEvidenceTool, maturity: renderMaturityTool, strategy: renderStrategyTool,
  platform: renderPlatformTool, data: renderDataTool, model: renderModelTool,
  bmc: renderBmcTool, process: renderProcessTool, innovation: renderInnovationTool
};

function openTool(key) { currentTool = key; renderStudioToolPanel(); }

function renderStudioToolPanel() {
  const panel = document.getElementById('studioToolPanel');
  if (!panel) return;
  const gid = myGuildId();
  if (!gid) { panel.innerHTML = '<p style="color:#94a3b8;font-size:12px">Join a Guild first (see My Guild tab).</p>'; return; }
  const renderer = TOOL_RENDERERS[currentTool];
  panel.innerHTML = renderer ? renderer(gid) : '<p>Tool not found.</p>';
}

function renderStudioTools() {
  const nav = document.getElementById('studioToolNav');
  if (!nav) return;
  if (typeof populateStudioToolGuildPicker === 'function') populateStudioToolGuildPicker();
  nav.innerHTML = TOOL_DEFS.map(t =>
    `<button class="btn ${currentTool===t.key?'btn-primary':'btn-ghost'} btn-sm" onclick="openTool('${t.key}')">${t.icon} ${t.label}</button>`
  ).join('');
  renderStudioToolPanel();
}

// Capability badges tied to Studio Tools completion (extends milestone badges)
const _origComputeStudentBadges = computeStudentBadges;
computeStudentBadges = function(studentId, submCount, prCount) {
  const badges = _origComputeStudentBadges(studentId, submCount, prCount);
  const student = appData.students[studentId];
  const gid = student ? student.guildId : null;
  const art = (gid && appData.guilds[gid] && appData.guilds[gid].artefacts) || {};
  const hasText = obj => obj && Object.keys(obj).some(k => k !== 'updatedAt' && obj[k]);

  if (((art.evidence && art.evidence.rows) || []).length >= 3)
    badges.push({ id: 'evidenceScout', icon: '🔍', label: 'Evidence Scout', desc: 'Guild logged 3+ evidence sources', bonus: 20 });
  if ((art.data && art.data.stats) && (art.model && art.model.method))
    badges.push({ id: 'dataInterpreter', icon: '📈', label: 'Data Interpreter', desc: 'Completed Data Workbench + Model Lab', bonus: 30 });
  if (hasText(art.strategy_pestle) && hasText(art.strategy_swot) && hasText(art.bmc))
    badges.push({ id: 'strategyArchitect', icon: '🧭', label: 'Strategy Architect', desc: 'Completed PESTLE, SWOT and Business Model Canvas', bonus: 30 });
  if (art.process && art.process.roadmap)
    badges.push({ id: 'changeDesigner', icon: '🛠', label: 'Change Designer', desc: 'Defined a process implementation roadmap', bonus: 25 });
  return badges;
};

// Staff Guild picker for the shared Studio Tools tab
let viewingGuildId = null;
const _origMyGuildId = myGuildId;
myGuildId = function() {
  if ((isLeader || isLecturer) && viewingGuildId) return viewingGuildId;
  return _origMyGuildId();
};

function populateStudioToolGuildPicker() {
  const picker = document.getElementById('studioToolStaffPicker');
  const sel = document.getElementById('studioToolGuildPicker');
  if (!picker || !sel) return;
  if (!isLeader && !isLecturer) { picker.style.display = 'none'; return; }
  picker.style.display = 'block';
  const guilds = Object.entries(appData.guilds || {});
  const options = guilds.map(([gid, g]) => {
    const selected = gid === viewingGuildId ? 'selected' : '';
    return '<option value="' + gid + '" ' + selected + '>' + g.name + '</option>';
  }).join('');
  sel.innerHTML = '<option value="">— Select a Guild —</option>' + options;
}

