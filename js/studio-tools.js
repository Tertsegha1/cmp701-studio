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

// ─── Lightweight canvas charts (no external library) ────────────────
// Every chart drawn here can be saved as a real PNG artefact, not just a
// CSV of the numbers behind it. Render functions build HTML containing a
// <canvas id="..."> placeholder and call queueChart(id, drawFn); once that
// HTML is actually in the DOM, renderStudioToolPanel() calls
// drawPendingCharts() to paint them.
let pendingCharts = [];
function queueChart(id, drawFn) { pendingCharts.push({ id, drawFn }); }
function drawPendingCharts() {
  const queue = pendingCharts; pendingCharts = [];
  queue.forEach(({ id, drawFn }) => { const c = document.getElementById(id); if (c) { try { drawFn(c); } catch (e) { /* leave canvas blank on bad data */ } } });
}
function downloadCanvasPNG(canvasId, filename) {
  const c = document.getElementById(canvasId);
  if (!c) return;
  const a = document.createElement('a');
  a.href = c.toDataURL('image/png');
  a.download = filename;
  a.click();
}
function chartCanvasHTML(id, w, h) { return `<canvas id="${id}" width="${w}" height="${h}" style="max-width:100%;border:1px solid #e2e8f0;border-radius:6px;background:#fff"></canvas>`; }
function downloadChartButton(id, filename) { return `<button class="btn btn-ghost btn-sm" style="margin-top:4px" onclick="downloadCanvasPNG('${id}','${filename}')">⬇ Download Chart (PNG)</button>`; }

const CHART_MARGIN = { top: 22, right: 16, bottom: 40, left: 46 };
function setupCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  return ctx;
}
function drawAxes(ctx, w, h, m) {
  ctx.strokeStyle = '#cbd5e1'; ctx.beginPath();
  ctx.moveTo(m.left, m.top); ctx.lineTo(m.left, h - m.bottom); ctx.lineTo(w - m.right, h - m.bottom);
  ctx.stroke();
}

function drawBarChart(canvas, categories, values, opts) {
  opts = opts || {};
  const ctx = setupCanvas(canvas), w = canvas.width, h = canvas.height, m = CHART_MARGIN;
  const plotW = w - m.left - m.right, plotH = h - m.top - m.bottom;
  const maxV = Math.max(...values, 1);
  const gap = plotW / values.length, barW = gap * 0.7;
  drawAxes(ctx, w, h, m);
  values.forEach((v, i) => {
    const barH = plotH * (v / maxV);
    const x = m.left + gap * i + (gap - barW) / 2, y = h - m.bottom - barH;
    ctx.fillStyle = opts.color || '#7C3AED';
    ctx.fillRect(x, y, barW, barH);
    ctx.fillStyle = '#1e293b'; ctx.font = '9px Arial'; ctx.textAlign = 'center';
    ctx.fillText(String(v), x + barW / 2, y - 3);
    ctx.fillText(String(categories[i]).slice(0, 9), x + barW / 2, h - m.bottom + 12);
  });
  if (opts.title) { ctx.fillStyle = '#1e293b'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'left'; ctx.fillText(opts.title, m.left, 14); }
}

function drawScatterChart(canvas, points, opts) {
  opts = opts || {};
  const ctx = setupCanvas(canvas), w = canvas.width, h = canvas.height, m = CHART_MARGIN;
  const plotW = w - m.left - m.right, plotH = h - m.top - m.bottom;
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs), yMin = Math.min(...ys), yMax = Math.max(...ys);
  const xr = (xMax - xMin) || 1, yr = (yMax - yMin) || 1;
  const sx = x => m.left + (x - xMin) / xr * plotW, sy = y => h - m.bottom - (y - yMin) / yr * plotH;
  drawAxes(ctx, w, h, m);
  const colors = ['#7C3AED', '#0D7377', '#B45309', '#1D4ED8'];
  const groups = [...new Set(points.map(p => p.group ?? 0))];
  points.forEach(p => {
    ctx.fillStyle = colors[groups.indexOf(p.group ?? 0) % colors.length];
    ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), 4, 0, Math.PI * 2); ctx.fill();
  });
  if (opts.vLine !== undefined) {
    ctx.strokeStyle = '#B91C1C'; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(sx(opts.vLine), m.top); ctx.lineTo(sx(opts.vLine), h - m.bottom); ctx.stroke();
    ctx.setLineDash([]);
  }
  (opts.marks || []).forEach(mk => {
    const cx = sx(mk.x), cy = sy(mk.y);
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 6, cy - 6); ctx.lineTo(cx + 6, cy + 6); ctx.moveTo(cx + 6, cy - 6); ctx.lineTo(cx - 6, cy + 6); ctx.stroke();
    ctx.lineWidth = 1;
  });
  ctx.fillStyle = '#1e293b'; ctx.font = '10px Arial'; ctx.textAlign = 'center';
  ctx.fillText(opts.xLabel || '', m.left + plotW / 2, h - 6);
  ctx.save(); ctx.translate(11, m.top + plotH / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(opts.yLabel || '', 0, 0); ctx.restore();
  if (opts.title) { ctx.font = 'bold 11px Arial'; ctx.textAlign = 'left'; ctx.fillText(opts.title, m.left, 14); }
}

function drawLineChart(canvas, values, splitIndex, opts) {
  opts = opts || {};
  const ctx = setupCanvas(canvas), w = canvas.width, h = canvas.height, m = CHART_MARGIN;
  const plotW = w - m.left - m.right, plotH = h - m.top - m.bottom;
  const yMin = Math.min(...values), yMax = Math.max(...values), yr = (yMax - yMin) || 1;
  const sx = i => m.left + i / ((values.length - 1) || 1) * plotW, sy = v => h - m.bottom - (v - yMin) / yr * plotH;
  drawAxes(ctx, w, h, m);
  ctx.beginPath();
  values.forEach((v, i) => { const x = sx(i), y = sy(v); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
  ctx.strokeStyle = '#1B3A6B'; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1;
  values.forEach((v, i) => {
    ctx.fillStyle = i >= splitIndex ? '#B45309' : '#0D7377';
    ctx.beginPath(); ctx.arc(sx(i), sy(v), 3, 0, Math.PI * 2); ctx.fill();
  });
  if (splitIndex > 0 && splitIndex < values.length) {
    ctx.strokeStyle = '#94a3b8'; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(sx(splitIndex - 0.5), m.top); ctx.lineTo(sx(splitIndex - 0.5), h - m.bottom); ctx.stroke();
    ctx.setLineDash([]);
  }
  if (opts.title) { ctx.fillStyle = '#1e293b'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'left'; ctx.fillText(opts.title, m.left, 14); }
}

// Diverging red(-1)–white(0)–blue(+1) colour scale for a correlation matrix.
function correlationColour(v) {
  const t = Math.max(-1, Math.min(1, v));
  if (t >= 0) { const g = Math.round(255 * (1 - t)); return `rgb(${g},${g},255)`; }
  const g = Math.round(255 * (1 + t));
  return `rgb(255,${g},${g})`;
}

function drawHeatmap(canvas, labels, matrix, opts) {
  opts = opts || {};
  const ctx = setupCanvas(canvas), w = canvas.width, h = canvas.height;
  const m = { top: 26, right: 10, bottom: 10, left: Math.max(60, ...labels.map(l => l.length * 5)) };
  const n = labels.length;
  const size = Math.min((w - m.left - m.right) / n, (h - m.top - m.bottom) / n);
  labels.forEach((label, i) => {
    ctx.fillStyle = '#1e293b'; ctx.font = '9px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(label.slice(0, 12), m.left - 4, m.top + i * size + size / 2 + 3);
    ctx.save(); ctx.translate(m.left + i * size + size / 2, m.top - 4); ctx.rotate(-Math.PI / 4);
    ctx.textAlign = 'right'; ctx.fillText(label.slice(0, 12), 0, 0); ctx.restore();
  });
  matrix.forEach((row, i) => {
    row.forEach((v, j) => {
      const x = m.left + j * size, y = m.top + i * size;
      ctx.fillStyle = correlationColour(v);
      ctx.fillRect(x, y, size, size);
      ctx.strokeStyle = '#fff'; ctx.strokeRect(x, y, size, size);
      ctx.fillStyle = Math.abs(v) > 0.6 ? '#fff' : '#1e293b';
      ctx.font = '9px Arial'; ctx.textAlign = 'center';
      ctx.fillText(v.toFixed(2), x + size / 2, y + size / 2 + 3);
    });
  });
  if (opts.title) { ctx.fillStyle = '#1e293b'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'left'; ctx.fillText(opts.title, 4, 12); }
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
    <button class="btn btn-ghost btn-sm" onclick='addListRow("${gid}","${key}",${JSON.stringify(columns.map(c=>c.key))})'>+ Add Row</button>`;
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
  const lines = text.replace(/^﻿/, '').trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { headers: [], rows: [] };
  const headers = splitCSVLine(lines[0]);
  const rows = lines.slice(1).map(splitCSVLine);
  return { headers, rows };
}

// Quote-aware split so categorical text such as "Smith, John" or "Retail, Online"
// stays in one cell instead of shifting every later column.
function splitCSVLine(line) {
  const out = []; let cur = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else quoted = false; }
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out;
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

// ─── Multiple datasets ─────────────────────────────────────────────
function newId(prefix) { return prefix + Date.now() + Math.floor(Math.random() * 1000); }

function getPrimaryDataset(gid) {
  const data = toolData(gid, 'data');
  const datasets = data.datasets || {};
  const id = (data.primaryDatasetId && datasets[data.primaryDatasetId]) ? data.primaryDatasetId : Object.keys(datasets)[0];
  return id ? { id, ...datasets[id] } : null;
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

async function addDatasetFromText(gid, name, csvText) {
  const parsed = parseCSVText(csvText);
  if (!parsed.headers.length) { toast('That file/text has no readable rows', 'err'); return; }
  const stats = computeColumnStats(parsed.headers, parsed.rows);
  const did = newId('d');
  const dataset = { name: name || 'Dataset', headers: parsed.headers, csvText, rowCount: parsed.rows.length, stats, uploadedAt: Date.now() };
  await sRef(`guilds/${gid}/artefacts/data/datasets/${did}`).set(dataset);
  const existing = toolData(gid, 'data');
  if (!existing.primaryDatasetId) await sRef(`guilds/${gid}/artefacts/data/primaryDatasetId`).set(did);
  toast('Dataset added', 'ok');
  renderStudioToolPanel();
}

async function handlePasteDataset(gid) {
  const name = document.getElementById('dwNewName').value.trim() || 'Pasted dataset';
  const text = document.getElementById('dwCsvInput').value;
  if (!text.trim()) { toast('Paste some CSV data first', 'err'); return; }
  await addDatasetFromText(gid, name, text);
  document.getElementById('dwCsvInput').value = '';
  document.getElementById('dwNewName').value = '';
}

async function handleFileUpload(gid, input) {
  const file = input.files[0];
  if (!file) return;
  const text = await readFileAsText(file);
  await addDatasetFromText(gid, file.name.replace(/\.csv$/i, ''), text);
  input.value = '';
}

async function renameDataset(gid, did, name) {
  await sRef(`guilds/${gid}/artefacts/data/datasets/${did}/name`).set(name || 'Dataset');
}

async function setPrimaryDataset(gid, did) {
  await sRef(`guilds/${gid}/artefacts/data/primaryDatasetId`).set(did);
  toast('Set as the dataset Prototype Builder uses', 'ok');
  renderStudioToolPanel();
}

async function removeDataset(gid, did) {
  if (!confirm('Remove this dataset and any analyses built on it?')) return;
  const data = toolData(gid, 'data');
  const analyses = data.analyses || {};
  const keepAnalyses = {};
  Object.entries(analyses).forEach(([aid, a]) => { if (a.datasetId !== did) keepAnalyses[aid] = a; });
  await sRef(`guilds/${gid}/artefacts/data/datasets/${did}`).remove();
  await sRef(`guilds/${gid}/artefacts/data/analyses`).set(keepAnalyses);
  if (data.primaryDatasetId === did) await sRef(`guilds/${gid}/artefacts/data/primaryDatasetId`).remove();
  renderStudioToolPanel();
}

function downloadDatasetStats(gid, did) {
  const data = toolData(gid, 'data');
  const ds = data.datasets && data.datasets[did];
  if (!ds) return;
  const rows = [['Column', 'Type', 'Missing', 'Min/Max/Mean or Top Values']];
  (ds.stats || []).forEach(s => {
    rows.push([s.name, s.type, s.missing,
      s.type === 'numeric' ? `min ${s.min}; max ${s.max}; mean ${s.mean}` : s.top.map(([v,c])=>`${v} (${c})`).join('; ')]);
  });
  downloadCSV(rows, `${ds.name.replace(/\s+/g,'_')}_descriptive_stats.csv`);
}

// ─── Analysis engine: descriptive / diagnostic / predictive / prescriptive ─
function linearRegression(ys) {
  const n = ys.length;
  const xs = ys.map((_, i) => i + 1);
  const meanX = xs.reduce((a,b)=>a+b,0) / n, meanY = ys.reduce((a,b)=>a+b,0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i]-meanX) * (ys[i]-meanY); den += (xs[i]-meanX) ** 2; }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;
  return { slope: +slope.toFixed(4), intercept: +intercept.toFixed(4) };
}

function binNumeric(values, bins) {
  bins = bins || 8;
  const min = Math.min(...values), max = Math.max(...values);
  const width = (max - min) / bins || 1;
  const counts = new Array(bins).fill(0);
  values.forEach(v => { const i = Math.min(bins - 1, Math.floor((v - min) / width)); counts[i]++; });
  const labels = counts.map((_, i) => (min + i * width).toFixed(1));
  return { labels, counts };
}

function renderDatasetCard(gid, ds, isPrimary) {
  const statsHTML = (ds.stats || []).map(s => {
    if (s.type === 'numeric') {
      return `<tr><td>${s.name}</td><td>numeric</td><td class="C">${s.missing}</td><td colspan="2">min ${s.min} · max ${s.max} · mean ${s.mean}</td></tr>`;
    }
    const bars = s.top.map(([v, c]) => {
      const pct = Math.round(c / (ds.rowCount || 1) * 100);
      return `<div style="display:flex;align-items:center;gap:6px;font-size:10px;margin-bottom:2px"><span style="width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${v}</span><div class="xp-bar-wrap" style="flex:1;height:6px;margin:0"><div class="xp-bar-fill" style="width:${pct}%;background:#7C3AED"></div></div><span>${c}</span></div>`;
    }).join('');
    return `<tr><td>${s.name}</td><td>categorical</td><td class="C">${s.missing}</td><td colspan="2">${s.distinct} distinct<br>${bars}</td></tr>`;
  }).join('');

  // One small chart per column — numeric gets a histogram (parsed live from
  // the stored CSV since only summary stats are kept), categorical gets a
  // bar chart of its top values. Each is a real PNG a student can save.
  const parsedForCharts = parseCSVText(ds.csvText);
  const chartsHTML = (ds.stats || []).map((s, colIdx) => {
    const canvasId = `chart-ds-${ds.id}-${colIdx}`;
    if (s.type === 'numeric') {
      const values = parsedForCharts.rows.map(r => +r[colIdx]).filter(v => !isNaN(v));
      queueChart(canvasId, canvas => {
        const { labels, counts } = binNumeric(values, 8);
        drawBarChart(canvas, labels, counts, { title: s.name, color: '#0D7377' });
      });
    } else {
      queueChart(canvasId, canvas => drawBarChart(canvas, s.top.map(t=>t[0]), s.top.map(t=>t[1]), { title: s.name, color: '#7C3AED' }));
    }
    return `<div style="display:inline-block;margin:4px 8px 4px 0;text-align:center">
      ${chartCanvasHTML(canvasId, 220, 140)}
      ${downloadChartButton(canvasId, `${ds.name.replace(/\s+/g,'_')}_${s.name.replace(/\s+/g,'_')}.png`)}
    </div>`;
  }).join('');

  return `<div class="card" style="margin-bottom:12px">
    <div class="card-hdr ${isPrimary ? 'teal' : 'slate'}" style="display:flex;justify-content:space-between;align-items:center">
      <input value="${ds.name}" onblur="renameDataset('${gid}','${ds.id}',this.value)" style="background:transparent;border:none;color:#fff;font-weight:700;font-size:12px;flex:1">
      <span style="display:flex;gap:6px;align-items:center">
        ${isPrimary ? '<span class="b b-green">★ Used in Prototype Builder</span>' : `<button class="btn btn-ghost btn-sm" onclick="setPrimaryDataset('${gid}','${ds.id}')">Use in Prototype Builder</button>`}
        <button class="btn btn-danger btn-sm" onclick="removeDataset('${gid}','${ds.id}')">✕</button>
      </span>
    </div>
    <div class="card-body">
      <div style="font-size:11px;color:#64748b;margin-bottom:6px">${ds.rowCount} rows · ${ds.headers.length} columns · uploaded ${new Date(ds.uploadedAt).toLocaleDateString('en-GB')}</div>
      <table><thead><tr><th>Column</th><th>Type</th><th class="C">Missing</th><th colspan="2">Summary</th></tr></thead><tbody>${statsHTML}</tbody></table>
      <button class="btn btn-ghost btn-sm" style="margin-top:6px" onclick="downloadDatasetStats('${gid}','${ds.id}')">⬇ Download Descriptive Stats (CSV)</button>
      <div style="margin-top:10px">${chartsHTML}</div>
    </div>
  </div>`;
}

function renderDataTool(gid) {
  const data = toolData(gid, 'data');
  const datasets = Object.entries(data.datasets || {});

  const datasetCards = datasets.map(([did, ds]) =>
    renderDatasetCard(gid, { id: did, ...ds }, did === data.primaryDatasetId)
  ).join('');

  return `<h4>Data Workbench</h4>${exportHeader(gid)}
    <div class="alert alert-info">Upload one or more full datasets (CSV file, or paste text — first row = headers) and get an automatic column profile. To run Descriptive, Forecasting, Classification, Clustering or Association analysis on a dataset, use the <strong>Model Lab</strong> tool. No live customer/patient data — public, synthetic, or anonymised only.</div>
    <div class="card" style="margin-bottom:12px">
      <div class="card-hdr blue">Add a Dataset</div>
      <div class="card-body">
        <div class="form-group" style="margin-bottom:8px"><label>Upload a CSV file</label>
          <input type="file" accept=".csv,text/csv" onchange="handleFileUpload('${gid}',this)"></div>
        <div class="form-group" style="margin-bottom:8px"><label>Dataset name (for pasted text)</label>
          <input type="text" id="dwNewName" placeholder="e.g. Q1 Sales"></div>
        <div class="form-group" style="margin-bottom:8px"><label>…or paste CSV text</label>
          <textarea id="dwCsvInput" rows="5" placeholder="date,region,units_sold"></textarea></div>
        <button class="btn btn-primary btn-sm" onclick="handlePasteDataset('${gid}')">Add Pasted Dataset</button>
      </div>
    </div>
    ${datasetCards || '<p style="color:#94a3b8;font-size:12px">No datasets yet — upload or paste one above.</p>'}
    <div class="form-group" style="margin-top:10px"><label>Interpretation and caveats (overall)</label>
      <textarea rows="3" onblur="saveToolField('${gid}','data','interpretation',this.value)">${data.interpretation || ''}</textarea></div>`;
}

// ─── Model Lab ─────────────────────────────────────────────────────────
// ═══ Model Lab: guided sandbox — pick a task, pick a dataset already in the
// Data Workbench, the system suggests cleaning, confirms the columns that
// matter, then runs the analysis and saves a result card. ═══
const MODEL_TASKS = ['Descriptive', 'Forecasting', 'Classification', 'Clustering', 'Association'];
let modelLabState = {};
function mlState(gid) { return modelLabState[gid] || (modelLabState[gid] = { datasetId: null, taskType: 'Descriptive', autoClean: true }); }
function setModelLabDataset(gid, did) { mlState(gid).datasetId = did || null; renderStudioToolPanel(); }
function setModelLabTaskType(gid, type) { mlState(gid).taskType = type; renderStudioToolPanel(); }
function toggleModelLabClean(gid, checked) { mlState(gid).autoClean = checked; }

// Step 1 of the pipeline every task shares: drop rows missing any column the
// chosen task actually needs — "takes them through the data cleaning process."
function cleanRowsForColumns(headers, rows, cols) {
  const idxs = cols.map(c => headers.indexOf(c));
  const cleaned = rows.filter(r => idxs.every(i => r[i] !== undefined && r[i] !== ''));
  return { cleaned, droppedCount: rows.length - cleaned.length };
}

function pearsonCorrelation(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((a,b)=>a+b,0)/n, my = ys.reduce((a,b)=>a+b,0)/n;
  let num=0, dx=0, dy=0;
  for (let i=0;i<n;i++){ num += (xs[i]-mx)*(ys[i]-my); dx += (xs[i]-mx)**2; dy += (ys[i]-my)**2; }
  return (dx===0||dy===0) ? 0 : +(num/Math.sqrt(dx*dy)).toFixed(3);
}

function euclideanDist(a, b) { return Math.sqrt(a.reduce((s,v,i)=>s+(v-b[i])**2,0)); }

function kMeans(points, k, iterations) {
  const dim = points[0].length;
  const sorted = [...points].sort((a,b)=>a[0]-b[0]);
  let centroids = Array.from({length:k}, (_,i) => sorted[Math.round(i*(sorted.length-1)/Math.max(k-1,1))]);
  let assignments = new Array(points.length).fill(0);
  for (let iter=0; iter<iterations; iter++) {
    assignments = points.map(p => {
      let best=0, bestDist=Infinity;
      centroids.forEach((c,ci)=>{ const d=euclideanDist(p,c); if(d<bestDist){bestDist=d;best=ci;} });
      return best;
    });
    const sums = Array.from({length:k},()=>({sum:new Array(dim).fill(0),count:0}));
    points.forEach((p,i)=>{ const c=assignments[i]; sums[c].count++; p.forEach((v,d)=>sums[c].sum[d]+=v); });
    centroids = sums.map((s,ci)=> s.count ? s.sum.map(v=>+(v/s.count).toFixed(2)) : centroids[ci]);
  }
  return { centroids, assignments };
}

// Simple one-rule (decision stump) classifier: the single threshold on one
// numeric feature that best separates the two most common classes.
function decisionStump(featureVals, labels, classes) {
  const uniq = [...new Set(featureVals)].sort((a,b)=>a-b);
  let best = { threshold: uniq[0], flip: false, acc: -1 };
  for (let i=0;i<uniq.length-1;i++){
    const t = (uniq[i]+uniq[i+1])/2;
    for (const flip of [false,true]) {
      let correct=0;
      for (let j=0;j<featureVals.length;j++){
        const pred = (featureVals[j] > t) !== flip ? classes[1] : classes[0];
        if (pred === labels[j]) correct++;
      }
      const acc = correct/featureVals.length;
      if (acc>best.acc) best = { threshold:t, flip, acc };
    }
  }
  return best;
}
function stumpPredict(stump, classes, value) {
  return (value > stump.threshold) !== stump.flip ? classes[1] : classes[0];
}

// Correlation across every numeric column in the cleaned rows — the basis
// for the heatmap/correlation matrix, independent of which two columns
// (colA/colB) the student picked for the detailed scatter view.
function correlationMatrix(headers, rows) {
  const numericCols = headers.filter((h, i) => rows.every(r => r[i] !== '' && !isNaN(+r[i])));
  const idxByCol = {};
  numericCols.forEach(c => { idxByCol[c] = headers.indexOf(c); });
  const colValues = {};
  numericCols.forEach(c => { colValues[c] = rows.map(r => +r[idxByCol[c]]); });
  const matrix = numericCols.map(a => numericCols.map(b => a === b ? 1 : pearsonCorrelation(colValues[a], colValues[b])));
  return { columns: numericCols, matrix };
}

// ── Categorical support helpers ───────────────────────────────────────
// A column dropdown value is either a plain column name (use its natural type)
// or '~cat~' + name (a numeric-looking column such as 0/1 or a 1–5 rating that
// should be treated as categories).
const ML_CAT_PREFIX = '~cat~';
function mlEsc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function decodeColChoice(value) {
  return value && value.startsWith(ML_CAT_PREFIX) ? { col: value.slice(ML_CAT_PREFIX.length), cat: true } : { col: value, cat: false };
}
function mlIsNumeric(headers, rows, col) {
  const i = headers.indexOf(col);
  const vals = rows.map(r => r[i]).filter(v => v !== undefined && v !== '');
  return vals.length > 0 && vals.every(v => !isNaN(+v));
}
function mlKind(headers, rows, col, forceCat) { return !forceCat && mlIsNumeric(headers, rows, col) ? 'numeric' : 'categorical'; }
function catValue(row, idx) { return row[idx] === undefined || row[idx] === '' ? '(missing)' : String(row[idx]); }
// Keep the most frequent categories and lump the rest into "Other" so tables
// and charts stay readable for high-cardinality columns.
function collapseCategories(values, max) {
  max = max || 8;
  const counts = {};
  values.forEach(v => counts[v] = (counts[v] || 0) + 1);
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (ranked.length <= max) return { labels: ranked.map(e => e[0]), map: v => v, freq: ranked };
  const keep = new Set(ranked.slice(0, max - 1).map(e => e[0]));
  const otherCount = ranked.slice(max - 1).reduce((s, e) => s + e[1], 0);
  return { labels: [...keep, 'Other'], map: v => keep.has(v) ? v : 'Other', freq: [...ranked.slice(0, max - 1), ['Other', otherCount]] };
}
function lnGamma(z) {
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  z -= 1; let x = c[0];
  for (let i = 1; i < 9; i++) x += c[i] / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
// Upper regularised incomplete gamma Q(a,x); chi-square p-value = Q(df/2, chi2/2).
function gammaQ(a, x) {
  if (x <= 0) return 1;
  const gln = lnGamma(a);
  if (x < a + 1) {
    let ap = a, sum = 1 / a, del = sum;
    for (let n = 0; n < 300; n++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-12) break; }
    return 1 - sum * Math.exp(-x + a * Math.log(x) - gln);
  }
  let b = x + 1 - a, c = 1 / 1e-30, d = 1 / b, h = d;
  for (let i = 1; i < 300; i++) {
    const an = -i * (i - a); b += 2;
    d = an * d + b; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }
  return Math.exp(-x + a * Math.log(x) - gln) * h;
}
function chiSquareP(chi2, df) { return df > 0 ? +Math.min(1, Math.max(0, gammaQ(df / 2, chi2 / 2))).toFixed(4) : 1; }

// Categorical × categorical: contingency table, chi-square test of independence
// and Cramér's V (effect size, 0 = independent, 1 = perfectly associated).
function runCategoricalPairTask(headers, rows, colA, colB) {
  const ai = headers.indexOf(colA), bi = headers.indexOf(colB);
  const av = rows.map(r => catValue(r, ai)), bv = rows.map(r => catValue(r, bi));
  const ca = collapseCategories(av), cb = collapseCategories(bv);
  const rl = ca.labels, cl = cb.labels;
  const counts = rl.map(() => cl.map(() => 0));
  rows.forEach((_, k) => { counts[rl.indexOf(ca.map(av[k]))][cl.indexOf(cb.map(bv[k]))]++; });
  const n = rows.length;
  const rowTot = counts.map(r => r.reduce((a, b) => a + b, 0));
  const colTot = cl.map((_, j) => counts.reduce((s, r) => s + r[j], 0));
  let chi2 = 0, lowCells = 0;
  counts.forEach((r, i) => r.forEach((o, j) => {
    const e = rowTot[i] * colTot[j] / n;
    if (e > 0) chi2 += (o - e) ** 2 / e;
    if (e < 5) lowCells++;
  }));
  const df = (rl.length - 1) * (cl.length - 1);
  const minDim = Math.min(rl.length, cl.length) - 1;
  const v = minDim > 0 && n > 0 ? +Math.sqrt(chi2 / (n * minDim)).toFixed(3) : 0;
  return { mode: 'category-category', colA, colB, n, rowLabels: rl, colLabels: cl, counts,
    chi2: +chi2.toFixed(2), df, pValue: chiSquareP(chi2, df), cramersV: v,
    strength: v >= 0.5 ? 'strong' : v >= 0.3 ? 'moderate' : v >= 0.1 ? 'weak' : 'negligible',
    lowExpected: lowCells / (rl.length * cl.length) > 0.2,
    freqA: ca.freq, freqB: cb.freq };
}

// Categorical × numeric: summary of the numeric column inside each category,
// plus eta-squared (share of the numeric variation explained by the category).
function runCategoryNumericTask(headers, rows, catCol, numCol) {
  const ci = headers.indexOf(catCol), ni = headers.indexOf(numCol);
  const cats = rows.map(r => catValue(r, ci)), nums = rows.map(r => +r[ni]);
  const cc = collapseCategories(cats, 10);
  const byCat = {};
  cats.forEach((c, k) => { (byCat[cc.map(c)] = byCat[cc.map(c)] || []).push(nums[k]); });
  const grand = nums.reduce((a, b) => a + b, 0) / nums.length;
  let ssb = 0, sst = 0;
  nums.forEach(x => sst += (x - grand) ** 2);
  const groups = cc.labels.map(name => {
    const vals = byCat[name] || [];
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    ssb += vals.length * (mean - grand) ** 2;
    const sd = vals.length > 1 ? Math.sqrt(vals.reduce((s, x) => s + (x - mean) ** 2, 0) / (vals.length - 1)) : 0;
    return { name, n: vals.length, mean: +mean.toFixed(2), sd: +sd.toFixed(2), min: Math.min(...vals), max: Math.max(...vals) };
  });
  const eta2 = sst === 0 ? 0 : +(ssb / sst).toFixed(3);
  return { mode: 'category-numeric', catCol, numCol, n: rows.length, groups, eta2,
    strength: eta2 >= 0.14 ? 'large' : eta2 >= 0.06 ? 'medium' : eta2 >= 0.01 ? 'small' : 'negligible',
    grandMean: +grand.toFixed(2) };
}

function runDescriptiveTask(headers, rows, colA, colB, forceCat) {
  forceCat = forceCat || [];
  const kA = mlKind(headers, rows, colA, forceCat.includes(colA)), kB = mlKind(headers, rows, colB, forceCat.includes(colB));
  if (kA === 'categorical' && kB === 'categorical') return runCategoricalPairTask(headers, rows, colA, colB);
  if (kA === 'categorical') return runCategoryNumericTask(headers, rows, colA, colB);
  if (kB === 'categorical') return runCategoryNumericTask(headers, rows, colB, colA);
  return runNumericPairTask(headers, rows, colA, colB);
}

function runNumericPairTask(headers, rows, colA, colB) {
  const ai = headers.indexOf(colA), bi = headers.indexOf(colB);
  const xs = rows.map(r=>+r[ai]), ys = rows.map(r=>+r[bi]);
  const r = pearsonCorrelation(xs, ys);
  const strength = Math.abs(r) >= 0.7 ? 'strong' : Math.abs(r) >= 0.3 ? 'moderate' : 'weak';
  const direction = r > 0 ? 'positive' : r < 0 ? 'negative' : 'no';
  return { colA, colB, n: rows.length, correlation: r, strength, direction,
    points: xs.map((x,i)=>({x, y: ys[i]})),
    xValues: xs, yValues: ys,
    colAStats: { mean: +(xs.reduce((a,b)=>a+b,0)/xs.length).toFixed(2), min: Math.min(...xs), max: Math.max(...xs) },
    colBStats: { mean: +(ys.reduce((a,b)=>a+b,0)/ys.length).toFixed(2), min: Math.min(...ys), max: Math.max(...ys) },
    matrix: correlationMatrix(headers, rows) };
}

function runForecastingTask(headers, rows, valueCol, periods) {
  const vi = headers.indexOf(valueCol);
  const ys = rows.map(r=>+r[vi]);
  const { slope, intercept } = linearRegression(ys);
  const fitted = ys.map((_,i) => slope*(i+1)+intercept);
  const mean = ys.reduce((a,b)=>a+b,0)/ys.length;
  const modelMSE = ys.reduce((s,y,i)=>s+(y-fitted[i])**2,0)/ys.length;
  const baselineMSE = ys.reduce((s,y)=>s+(y-mean)**2,0)/ys.length;
  const projections = Array.from({length:periods},(_,i)=>+(slope*(ys.length+i+1)+intercept).toFixed(2));
  return { valueCol, n: ys.length, slope, intercept, trend: slope>0?'upward':slope<0?'downward':'flat',
    modelMSE: +modelMSE.toFixed(2), baselineMSE: +baselineMSE.toFixed(2),
    improvedOnBaseline: modelMSE < baselineMSE, historical: ys, projections };
}

function confusionMatrix(labels, actual, predicted) {
  const matrix = labels.map(() => labels.map(() => 0));
  actual.forEach((a, i) => { const r = labels.indexOf(a), c = labels.indexOf(predicted[i]); if (r >= 0 && c >= 0) matrix[r][c]++; });
  return { labels, matrix };
}

// Categorical feature: one rule per category — predict the class most common
// among training rows with that category (a one-level decision tree). Works
// with any number of target classes; unseen categories fall back to the overall
// training majority.
function runCategoricalClassificationTask(headers, rows, targetCol, featureCol) {
  const ti = headers.indexOf(targetCol), fi = headers.indexOf(featureCol);
  const usable = rows.map(r => ({ t: catValue(r, ti), f: catValue(r, fi) }));
  const classCounts = {};
  usable.forEach(u => classCounts[u.t] = (classCounts[u.t] || 0) + 1);
  const classes = Object.entries(classCounts).sort((a, b) => b[1] - a[1]).map(e => e[0]);
  if (classes.length < 2) return null;
  const splitAt = Math.max(1, Math.floor(usable.length * 0.8));
  const train = usable.slice(0, splitAt), test = usable.slice(splitAt).length ? usable.slice(splitAt) : usable.slice(0, splitAt);
  const trainClass = {};
  train.forEach(u => trainClass[u.t] = (trainClass[u.t] || 0) + 1);
  const trainMajority = Object.entries(trainClass).sort((a, b) => b[1] - a[1])[0][0];
  const perCat = {};
  train.forEach(u => { const c = perCat[u.f] = perCat[u.f] || {}; c[u.t] = (c[u.t] || 0) + 1; });
  const ruleFor = {};
  const rules = Object.entries(perCat).map(([cat, cnts]) => {
    const total = Object.values(cnts).reduce((a, b) => a + b, 0);
    const [pred, pc] = Object.entries(cnts).sort((a, b) => b[1] - a[1])[0];
    ruleFor[cat] = pred;
    return { category: cat, predicted: pred, n: total, share: +(pc / total * 100).toFixed(1) };
  }).sort((a, b) => b.n - a.n).slice(0, 12);
  const predict = u => ruleFor[u.f] !== undefined ? ruleFor[u.f] : trainMajority;
  const acc = set => set.length ? +(set.filter(u => predict(u) === u.t).length / set.length * 100).toFixed(1) : 0;
  const base = set => set.length ? +(set.filter(u => u.t === trainMajority).length / set.length * 100).toFixed(1) : 0;
  const shown = classes.slice(0, 6);
  return { featureKind: 'categorical', targetCol, featureCol, classes: shown, n: usable.length, trainN: train.length, testN: test.length,
    categoryCount: Object.keys(perCat).length, rules,
    trainAcc: acc(train), testAcc: acc(test), baselineTrainAcc: base(train), baselineTestAcc: base(test),
    confusion: confusionMatrix(shown, test.map(u => u.t), test.map(predict)) };
}

function runClassificationTask(headers, rows, targetCol, featureCol, featureAsCat) {
  if (featureAsCat || mlKind(headers, rows, featureCol, false) === 'categorical') return runCategoricalClassificationTask(headers, rows, targetCol, featureCol);
  const ti = headers.indexOf(targetCol), fi = headers.indexOf(featureCol);
  const counts = {};
  rows.forEach(r => counts[r[ti]] = (counts[r[ti]]||0)+1);
  const classes = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  if (classes.length < 2) return null;
  const usable = rows.filter(r => classes.includes(r[ti]));
  const splitAt = Math.max(1, Math.floor(usable.length * 0.8));
  const train = usable.slice(0, splitAt), test = usable.slice(splitAt).length ? usable.slice(splitAt) : usable.slice(0, splitAt);
  const trainFeature = train.map(r=>+r[fi]), trainLabels = train.map(r=>r[ti]);
  const stump = decisionStump(trainFeature, trainLabels, classes);
  const acc = (set) => {
    let correct = 0;
    set.forEach(r => { if (stumpPredict(stump, classes, +r[fi]) === r[ti]) correct++; });
    return set.length ? +(correct/set.length*100).toFixed(1) : 0;
  };
  const majorityClass = classes[0];
  const baselineAcc = (set) => set.length ? +(set.filter(r=>r[ti]===majorityClass).length/set.length*100).toFixed(1) : 0;
  return { targetCol, featureCol, classes, n: usable.length, trainN: train.length, testN: test.length,
    threshold: +stump.threshold.toFixed(2), flip: stump.flip,
    trainAcc: acc(train), testAcc: acc(test), baselineTrainAcc: baselineAcc(train), baselineTestAcc: baselineAcc(test),
    confusion: confusionMatrix(classes, test.map(r => r[ti]), test.map(r => stumpPredict(stump, classes, +r[fi]))),
    points: usable.map(r => ({ x: +r[fi], group: r[ti], isTest: usable.indexOf(r) >= splitAt })) };
}

// k-prototypes: k-means for numeric columns (standardised) combined with k-modes
// for categorical columns (a mismatch costs 1). Reduces to k-means when every
// column is numeric and k-modes when every column is categorical.
function runMixedClusteringTask(headers, rows, cols, k, forceCat) {
  const idxs = cols.map(c => headers.indexOf(c));
  const kinds = cols.map(c => mlKind(headers, rows, c, forceCat.includes(c)));
  const n = rows.length;
  k = Math.min(k, n);
  const stat = {};
  const data = rows.map(r => cols.map((_, d) => kinds[d] === 'numeric' ? +r[idxs[d]] : catValue(r, idxs[d])));
  cols.forEach((_, d) => {
    if (kinds[d] !== 'numeric') return;
    const vals = data.map(p => p[d]);
    const mean = vals.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(vals.reduce((s, x) => s + (x - mean) ** 2, 0) / n) || 1;
    stat[d] = { mean, sd };
  });
  const dist = (p, c) => p.reduce((s, v, d) => s + (kinds[d] === 'numeric' ? ((v - c[d]) / stat[d].sd) ** 2 : (v === c[d] ? 0 : 1)), 0);
  // Deterministic farthest-first initialisation
  let centroids = [data[0].slice()];
  while (centroids.length < k) {
    let bestIdx = 0, bestD = -1;
    data.forEach((p, i) => { const dm = Math.min(...centroids.map(c => dist(p, c))); if (dm > bestD) { bestD = dm; bestIdx = i; } });
    centroids.push(data[bestIdx].slice());
  }
  let assignments = new Array(n).fill(0);
  for (let iter = 0; iter < 20; iter++) {
    const next = data.map(p => { let b = 0, bd = Infinity; centroids.forEach((c, ci) => { const dd = dist(p, c); if (dd < bd) { bd = dd; b = ci; } }); return b; });
    const changed = next.some((a, i) => a !== assignments[i]);
    assignments = next;
    centroids = centroids.map((old, ci) => {
      const members = data.filter((_, i) => assignments[i] === ci);
      if (!members.length) return old;
      return cols.map((_, d) => {
        if (kinds[d] === 'numeric') return members.reduce((s, p) => s + p[d], 0) / members.length;
        const tally = {}; members.forEach(p => tally[p[d]] = (tally[p[d]] || 0) + 1);
        return Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];
      });
    });
    if (!changed && iter > 0) break;
  }
  const clusters = centroids.map((c, ci) => {
    const members = data.filter((_, i) => assignments[i] === ci);
    const summary = cols.map((name, d) => {
      if (!members.length) return '—';
      if (kinds[d] === 'numeric') return `${name}: ${(members.reduce((s, p) => s + p[d], 0) / members.length).toFixed(2)} avg`;
      const tally = {}; members.forEach(p => tally[p[d]] = (tally[p[d]] || 0) + 1);
      return `${name}: ` + Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([v, cnt]) => `${v} ${Math.round(cnt / members.length * 100)}%`).join(', ');
    });
    return { id: ci + 1, size: members.length, centroid: c.map((v, d) => kinds[d] === 'numeric' ? +v.toFixed(2) : v), summary };
  });
  const numericDims = cols.map((_, d) => d).filter(d => kinds[d] === 'numeric');
  const out = { mode: 'mixed', cols, colKinds: kinds, k, n, clusters, assignments };
  if (numericDims.length >= 2) {
    const [dx, dy] = numericDims;
    out.scatter = { xLabel: cols[dx], yLabel: cols[dy], points: data.map(p => [p[dx], p[dy]]),
      marks: clusters.map(c => ({ x: c.centroid[dx], y: c.centroid[dy] })) };
  }
  return out;
}

function runClusteringTask(headers, rows, cols, k, forceCat) {
  forceCat = forceCat || [];
  if (cols.some(c => mlKind(headers, rows, c, forceCat.includes(c)) === 'categorical')) return runMixedClusteringTask(headers, rows, cols, k, forceCat);
  const idxs = cols.map(c => headers.indexOf(c));
  const points = rows.map(r => idxs.map(i => +r[i]));
  const { centroids, assignments } = kMeans(points, k, 15);
  const sizes = new Array(k).fill(0);
  assignments.forEach(a => sizes[a]++);
  return { cols, k, n: points.length, clusters: centroids.map((c,i)=>({ id: i+1, size: sizes[i], centroid: c })),
    points, assignments };
}

function runAssociationTask(headers, rows, colA, colB) {
  const ai = headers.indexOf(colA), bi = headers.indexOf(colB);
  const n = rows.length;
  const countA = {}, countB = {}, countPair = {};
  rows.forEach(r => {
    countA[r[ai]] = (countA[r[ai]]||0) + 1;
    countB[r[bi]] = (countB[r[bi]]||0) + 1;
    const key = r[ai] + '→' + r[bi];
    countPair[key] = (countPair[key]||0) + 1;
  });
  const rules = Object.entries(countPair)
    .filter(([,c]) => c >= 2)
    .map(([key, count]) => {
      const [a, b] = key.split('→');
      return { a, b, count, support: +(count/n).toFixed(3), confidence: +(count/countA[a]).toFixed(3),
        lift: +((count/countA[a]) / (countB[b]/n)).toFixed(2) };
    })
    .sort((x,y) => y.confidence - x.confidence)
    .slice(0, 8);
  return { colA, colB, n, rules };
}

async function runModelLabAnalysis(gid) {
  const st = mlState(gid);
  const data = toolData(gid, 'data');
  const ds = st.datasetId && data.datasets && data.datasets[st.datasetId];
  if (!ds) { toast('Choose a dataset first', 'err'); return; }
  const parsed = parseCSVText(ds.csvText);
  const type = st.taskType;
  let config = {}, colsNeeded = [], results = null;

  if (type === 'Descriptive') {
    const a = decodeColChoice(document.getElementById('ml-colA').value), b = decodeColChoice(document.getElementById('ml-colB').value);
    config.colA = a.col; config.colB = b.col;
    if (!config.colA || !config.colB) { toast('Choose two columns', 'err'); return; }
    if (config.colA === config.colB) { toast('Choose two different columns', 'err'); return; }
    config.asCat = [a.cat && a.col, b.cat && b.col].filter(Boolean);
    colsNeeded = [config.colA, config.colB];
  } else if (type === 'Forecasting') {
    config.valueCol = document.getElementById('ml-forecast-col').value;
    config.periods = +document.getElementById('ml-periods').value || 3;
    if (!config.valueCol) { toast('Choose a numeric column to forecast', 'err'); return; }
    colsNeeded = [config.valueCol];
  } else if (type === 'Classification') {
    const t = decodeColChoice(document.getElementById('ml-target').value), f = decodeColChoice(document.getElementById('ml-feature').value);
    config.targetCol = t.col; config.featureCol = f.col; config.featureAsCat = f.cat;
    if (!config.targetCol || !config.featureCol) { toast('Choose a target and a feature column', 'err'); return; }
    if (config.targetCol === config.featureCol) { toast('The feature must be a different column from the target', 'err'); return; }
    colsNeeded = [config.targetCol, config.featureCol];
  } else if (type === 'Clustering') {
    const picks = ['ml-cluster-col1', 'ml-cluster-col2', 'ml-cluster-col3'].map(id => decodeColChoice(document.getElementById(id).value)).filter(p => p.col);
    const seen = new Set();
    const uniq = picks.filter(p => !seen.has(p.col) && seen.add(p.col));
    config.cols = uniq.map(p => p.col);
    config.asCat = uniq.filter(p => p.cat).map(p => p.col);
    config.k = +document.getElementById('ml-k').value || 3;
    if (!config.cols.length) { toast('Choose at least one column', 'err'); return; }
    colsNeeded = config.cols;
  } else if (type === 'Association') {
    config.colA = decodeColChoice(document.getElementById('ml-assoc-colA').value).col;
    config.colB = decodeColChoice(document.getElementById('ml-assoc-colB').value).col;
    if (!config.colA || !config.colB) { toast('Choose two columns', 'err'); return; }
    if (config.colA === config.colB) { toast('Choose two different columns', 'err'); return; }
    colsNeeded = [config.colA, config.colB];
  }

  const { cleaned, droppedCount } = st.autoClean
    ? cleanRowsForColumns(parsed.headers, parsed.rows, colsNeeded)
    : { cleaned: parsed.rows, droppedCount: 0 };
  if (cleaned.length < 2) { toast('Not enough complete rows for those columns', 'err'); return; }

  if (type === 'Forecasting' && !mlIsNumeric(parsed.headers, cleaned, config.valueCol)) { toast('Forecasting needs a numeric column — pick a different column', 'err'); return; }

  if (type === 'Descriptive') results = runDescriptiveTask(parsed.headers, cleaned, config.colA, config.colB, config.asCat);
  else if (type === 'Forecasting') results = runForecastingTask(parsed.headers, cleaned, config.valueCol, config.periods);
  else if (type === 'Classification') results = runClassificationTask(parsed.headers, cleaned, config.targetCol, config.featureCol, config.featureAsCat);
  else if (type === 'Clustering') results = runClusteringTask(parsed.headers, cleaned, config.cols, config.k, config.asCat);
  else if (type === 'Association') results = runAssociationTask(parsed.headers, cleaned, config.colA, config.colB);

  if (!results) { toast('Could not run that analysis — check your target column has at least two distinct values', 'err'); return; }

  const name = document.getElementById('ml-run-name').value.trim() || `${type} — ${ds.name}`;
  const rid = newId('m');
  const run = { datasetId: st.datasetId, datasetName: ds.name, type, config, results,
    rowsUsed: cleaned.length, rowsDropped: droppedCount, createdAt: Date.now(), name };
  await sRef(`guilds/${gid}/artefacts/model/runs/${rid}`).set(run);
  toast('Model run complete and saved', 'ok');
  renderStudioToolPanel();
}

async function removeModelRun(gid, rid) {
  await sRef(`guilds/${gid}/artefacts/model/runs/${rid}`).remove();
  renderStudioToolPanel();
}

function downloadModelRun(gid, rid) {
  const data = toolData(gid, 'model');
  const run = data.runs && data.runs[rid];
  if (!run) return;
  const r = run.results;
  let rows = [];
  if (run.type === 'Descriptive' && r.mode === 'category-category') {
    rows = [['Metric','Value'],['Column A', r.colA],['Column B', r.colB],["Cramér's V", r.cramersV],['Strength', r.strength],
      ['Chi-square', r.chi2],['Degrees of freedom', r.df],['p-value', r.pValue],['Rows used', r.n],[],
      [r.colA + ' \\ ' + r.colB, ...r.colLabels]];
    r.counts.forEach((row, i) => rows.push([r.rowLabels[i], ...row]));
  } else if (run.type === 'Descriptive' && r.mode === 'category-numeric') {
    rows = [['Metric','Value'],['Category column', r.catCol],['Numeric column', r.numCol],['Eta-squared', r.eta2],['Effect size', r.strength],['Rows used', r.n],[],
      [r.catCol, 'n', 'Mean', 'SD', 'Min', 'Max']];
    r.groups.forEach(g => rows.push([g.name, g.n, g.mean, g.sd, g.min, g.max]));
  } else if (run.type === 'Descriptive') {
    rows = [['Metric','Value'],['Column A', r.colA],['Column B', r.colB],['Correlation (r)', r.correlation],
      ['Strength', r.strength],['Direction', r.direction],['Rows used', r.n]];
    if (r.matrix && r.matrix.columns.length > 1) {
      rows.push([]);
      rows.push(['Correlation matrix', ...r.matrix.columns]);
      r.matrix.columns.forEach((col, i) => rows.push([col, ...r.matrix.matrix[i].map(v => v.toFixed(2))]));
    }
  } else if (run.type === 'Forecasting') {
    rows = [['Period','Value']];
    r.historical.forEach((v,i)=>rows.push(['Historical '+(i+1), v]));
    r.projections.forEach((v,i)=>rows.push(['Projected +'+(i+1), v]));
    rows.push(['Model MSE', r.modelMSE]); rows.push(['Baseline MSE (mean)', r.baselineMSE]);
  } else if (run.type === 'Classification') {
    const categorical = r.featureKind === 'categorical';
    rows = [['Metric','Value'],['Target', r.targetCol],['Feature', r.featureCol],['Classes', r.classes.join(categorical ? ', ' : ' vs ')],
      categorical ? ['Feature type', 'categorical'] : ['Threshold', r.threshold],['Train accuracy %', r.trainAcc],['Test accuracy %', r.testAcc],
      ['Baseline train %', r.baselineTrainAcc],['Baseline test %', r.baselineTestAcc]];
    if (categorical && r.rules) {
      rows.push([]); rows.push([r.featureCol, 'Predicted class', 'Train rows', '% in predicted class']);
      r.rules.forEach(x => rows.push([x.category, x.predicted, x.n, x.share]));
    }
    if (r.confusion) {
      rows.push([]); rows.push(['Confusion matrix (test): actual \\ predicted', ...r.confusion.labels]);
      r.confusion.matrix.forEach((row, i) => rows.push([r.confusion.labels[i], ...row]));
    }
  } else if (run.type === 'Clustering') {
    rows = r.mode === 'mixed'
      ? [['Cluster','Size', ...r.cols, 'Profile']].concat(r.clusters.map(c=>[c.id, c.size, ...c.centroid, (c.summary || []).join(' | ')]))
      : [['Cluster','Size', ...r.cols]].concat(r.clusters.map(c=>[c.id, c.size, ...c.centroid]));
  } else if (run.type === 'Association') {
    const lift = r.rules.some(rule => rule.lift !== undefined);
    rows = [[run.results.colA, run.results.colB, 'Count', 'Support', 'Confidence', ...(lift ? ['Lift'] : [])]]
      .concat(r.rules.map(rule=>[rule.a, rule.b, rule.count, rule.support, rule.confidence, ...(lift ? [rule.lift] : [])]));
  }
  downloadCSV(rows, `${run.name.replace(/\s+/g,'_')}.csv`);
}

function renderModelRunResult(run, rid) {
  const r = run.results;
  const meta = `<div style="font-size:10px;color:#94a3b8;margin-bottom:4px">${run.rowsUsed} rows used${run.rowsDropped ? `, ${run.rowsDropped} dropped during cleaning` : ''}</div>`;
  const chartId = `chart-run-${rid}`;
  const chartFile = n => `${run.name.replace(/\s+/g,'_')}_${n}.png`;

  if (run.type === 'Descriptive' && r.mode === 'category-category') {
    const fA = chartId + '-freqA', fB = chartId + '-freqB';
    queueChart(fA, canvas => drawBarChart(canvas, r.freqA.map(e => e[0]), r.freqA.map(e => e[1]), { title: `Counts: ${mlEsc(r.colA)}`, color: '#2563EB' }));
    queueChart(fB, canvas => drawBarChart(canvas, r.freqB.map(e => e[0]), r.freqB.map(e => e[1]), { title: `Counts: ${mlEsc(r.colB)}`, color: '#7C3AED' }));
    const rowTot = r.counts.map(row => row.reduce((a, b) => a + b, 0));
    const head = `<tr><th>${mlEsc(r.colA)} \\ ${mlEsc(r.colB)}</th>${r.colLabels.map(c => `<th class="C">${mlEsc(c)}</th>`).join('')}<th class="C">Total</th></tr>`;
    const body = r.counts.map((row, i) => `<tr><td><strong>${mlEsc(r.rowLabels[i])}</strong></td>${row.map(v => {
      const pct = rowTot[i] ? v / rowTot[i] : 0;
      return `<td class="C" style="background:rgba(124,58,237,${(pct * 0.45).toFixed(2)})">${v} <span style="color:#64748b;font-size:9px">(${Math.round(pct * 100)}%)</span></td>`;
    }).join('')}<td class="C">${rowTot[i]}</td></tr>`).join('');
    const sig = r.pValue < 0.05 ? 'statistically significant at the 5% level' : 'not statistically significant at the 5% level';
    return meta + `<span style="font-size:11px">Association between <strong>${mlEsc(r.colA)}</strong> and <strong>${mlEsc(r.colB)}</strong> (both categorical): Cramér's V = <strong>${r.cramersV}</strong> (${r.strength}); χ²(${r.df}) = ${r.chi2}, p = ${r.pValue} — ${sig}.</span>
      <div style="overflow-x:auto;margin-top:6px"><table style="font-size:11px"><thead>${head}</thead><tbody>${body}</tbody></table></div>
      <div style="font-size:10px;color:#64748b;margin-top:2px">Cell shading and brackets show the share of each ${mlEsc(r.colA)} row falling in that ${mlEsc(r.colB)} category.</div>
      ${r.lowExpected ? `<div class="alert" style="background:#fef9c3;color:#854d0e;border:1px solid #fde68a;margin-top:6px">Many cells have fewer than 5 expected observations, so the χ² p-value is unreliable. Collect more data or merge rare categories.</div>` : ''}
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:6px">
        <div>${chartCanvasHTML(fA, 260, 170)}${downloadChartButton(fA, chartFile('counts_' + r.colA))}</div>
        <div>${chartCanvasHTML(fB, 260, 170)}${downloadChartButton(fB, chartFile('counts_' + r.colB))}</div>
      </div>`;
  }
  if (run.type === 'Descriptive' && r.mode === 'category-numeric') {
    const mId = chartId + '-means', cId = chartId + '-counts';
    queueChart(mId, canvas => drawBarChart(canvas, r.groups.map(g => g.name), r.groups.map(g => g.mean), { title: `Mean ${mlEsc(r.numCol)} by ${mlEsc(r.catCol)}`, color: '#0D7377' }));
    queueChart(cId, canvas => drawBarChart(canvas, r.groups.map(g => g.name), r.groups.map(g => g.n), { title: `Counts: ${mlEsc(r.catCol)}`, color: '#7C3AED' }));
    const rows = r.groups.map(g => `<tr><td>${mlEsc(g.name)}</td><td class="C">${g.n}</td><td class="C">${g.mean}</td><td class="C">${g.sd}</td><td class="C">${g.min}</td><td class="C">${g.max}</td></tr>`).join('');
    return meta + `<span style="font-size:11px"><strong>${mlEsc(r.numCol)}</strong> across the categories of <strong>${mlEsc(r.catCol)}</strong>: η² = <strong>${r.eta2}</strong> (${r.strength} effect — ${Math.round(r.eta2 * 100)}% of the variation in ${mlEsc(r.numCol)} is explained by ${mlEsc(r.catCol)}). Overall mean ${r.grandMean}.</span>
      <table style="font-size:11px;margin-top:4px"><thead><tr><th>${mlEsc(r.catCol)}</th><th class="C">n</th><th class="C">Mean</th><th class="C">SD</th><th class="C">Min</th><th class="C">Max</th></tr></thead><tbody>${rows}</tbody></table>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:6px">
        <div>${chartCanvasHTML(mId, 280, 170)}${downloadChartButton(mId, chartFile('means_by_' + r.catCol))}</div>
        <div>${chartCanvasHTML(cId, 260, 170)}${downloadChartButton(cId, chartFile('counts_' + r.catCol))}</div>
      </div>`;
  }
  if (run.type === 'Descriptive') {
    const histAId = chartId + '-histA', histBId = chartId + '-histB', heatId = chartId + '-heat';
    queueChart(chartId, canvas => drawScatterChart(canvas, r.points, { xLabel: r.colA, yLabel: r.colB, title: `${r.colA} vs ${r.colB}` }));
    if (r.xValues) queueChart(histAId, canvas => { const b = binNumeric(r.xValues); drawBarChart(canvas, b.labels, b.counts, { title: `Distribution of ${r.colA}`, color: '#2563EB' }); });
    if (r.yValues) queueChart(histBId, canvas => { const b = binNumeric(r.yValues); drawBarChart(canvas, b.labels, b.counts, { title: `Distribution of ${r.colB}`, color: '#7C3AED' }); });
    if (r.matrix && r.matrix.columns.length > 1) queueChart(heatId, canvas => drawHeatmap(canvas, r.matrix.columns, r.matrix.matrix, { title: 'Correlation matrix' }));
    return meta + `<span style="font-size:11px">Correlation between <strong>${r.colA}</strong> and <strong>${r.colB}</strong>: <strong>${r.correlation}</strong> (${r.strength} ${r.direction})</span>
      <div style="font-size:10px;color:#64748b;margin-top:4px">${r.colA}: mean ${r.colAStats.mean} (min ${r.colAStats.min}, max ${r.colAStats.max}) · ${r.colB}: mean ${r.colBStats.mean} (min ${r.colBStats.min}, max ${r.colBStats.max})</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:6px">
        <div>${chartCanvasHTML(chartId, 280, 170)}${downloadChartButton(chartId, chartFile('scatter'))}</div>
        ${r.xValues ? `<div>${chartCanvasHTML(histAId, 260, 170)}${downloadChartButton(histAId, chartFile('histogram_'+r.colA))}</div>` : ''}
        ${r.yValues ? `<div>${chartCanvasHTML(histBId, 260, 170)}${downloadChartButton(histBId, chartFile('histogram_'+r.colB))}</div>` : ''}
        ${r.matrix && r.matrix.columns.length > 1 ? `<div>${chartCanvasHTML(heatId, 260, 220)}${downloadChartButton(heatId, chartFile('correlation_matrix'))}</div>` : ''}
      </div>`;
  }
  if (run.type === 'Forecasting') {
    queueChart(chartId, canvas => drawLineChart(canvas, [...r.historical, ...r.projections], r.historical.length, { title: r.valueCol + ' — historical vs projected' }));
    return meta + `<span style="font-size:11px">Trend: <strong>${r.trend}</strong> — next ${r.projections.length} periods: ${r.projections.join(', ')}</span>
      <div style="font-size:10px;color:${r.improvedOnBaseline?'#15803D':'#B45309'};margin-top:4px">Model MSE ${r.modelMSE} vs baseline (predict the mean) MSE ${r.baselineMSE} — ${r.improvedOnBaseline ? 'beats' : 'does not beat'} the baseline</div>
      <div class="alert" style="background:#fef9c3;color:#854d0e;border:1px solid #fde68a;margin-top:6px">Simple linear trend — assumes rows are already in chronological order. Treat as a hypothesis to test, not a guarantee.</div>
      <div style="margin-top:6px">${chartCanvasHTML(chartId, 300, 180)}${downloadChartButton(chartId, chartFile('forecast'))}</div>`;
  }
  if (run.type === 'Classification' && r.featureKind === 'categorical') {
    queueChart(chartId, canvas => drawBarChart(canvas, ['Train', 'Test', 'Base tr.', 'Base te.'], [r.trainAcc, r.testAcc, r.baselineTrainAcc, r.baselineTestAcc], { title: 'Accuracy % (model vs baseline)', color: '#1D4ED8' }));
    const ruleRows = r.rules.map(x => `<tr><td>${mlEsc(r.featureCol)} = ${mlEsc(x.category)}</td><td>${mlEsc(x.predicted)}</td><td class="C">${x.n}</td><td class="C">${x.share}%</td></tr>`).join('');
    const cm = r.confusion;
    const cmHTML = cm ? `<div style="overflow-x:auto;margin-top:6px"><table style="font-size:11px"><thead><tr><th>Actual \\ Predicted (test)</th>${cm.labels.map(l => `<th class="C">${mlEsc(l)}</th>`).join('')}</tr></thead><tbody>${cm.matrix.map((row, i) => `<tr><td><strong>${mlEsc(cm.labels[i])}</strong></td>${row.map((v, j) => `<td class="C" style="${i === j ? 'background:#dcfce7' : ''}">${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '';
    return meta + `<span style="font-size:11px">Predicting <strong>${mlEsc(r.targetCol)}</strong> (${r.classes.map(mlEsc).join(', ')}) from the category of <strong>${mlEsc(r.featureCol)}</strong> — one rule per category (${r.categoryCount} categories${r.rules.length < r.categoryCount ? ', largest ' + r.rules.length + ' shown' : ''})</span>
      <table style="font-size:11px;margin-top:4px"><thead><tr><th>Rule: if</th><th>predict</th><th class="C">Train rows</th><th class="C">Of which predicted class</th></tr></thead><tbody>${ruleRows}</tbody></table>
      <table style="font-size:11px;margin-top:6px"><thead><tr><th></th><th class="C">Train</th><th class="C">Test</th></tr></thead>
      <tbody><tr><td>Model accuracy</td><td class="C">${r.trainAcc}%</td><td class="C">${r.testAcc}%</td></tr>
      <tr><td>Baseline (majority class)</td><td class="C">${r.baselineTrainAcc}%</td><td class="C">${r.baselineTestAcc}%</td></tr></tbody></table>
      ${cmHTML}
      <div class="alert" style="background:#fef9c3;color:#854d0e;border:1px solid #fde68a;margin-top:6px">A one-feature, category-by-category rule — a starting baseline, not a production model. Compare test accuracy to the baseline, not to 100%.</div>
      <div style="margin-top:6px">${chartCanvasHTML(chartId, 300, 180)}${downloadChartButton(chartId, chartFile('accuracy'))}</div>`;
  }
  if (run.type === 'Classification') {
    queueChart(chartId, canvas => drawScatterChart(canvas, r.points.map(p => ({ x: p.x, y: p.isTest ? 1 : 0, group: p.group })), { xLabel: r.featureCol, yLabel: 'train=0 / test=1', vLine: r.threshold, title: `${r.featureCol} split at ${r.threshold}` }));
    return meta + `<span style="font-size:11px">Predicting <strong>${r.targetCol}</strong> (${r.classes.join(' vs ')}) from <strong>${r.featureCol}</strong> at threshold ${r.threshold}</span>
      <table style="font-size:11px;margin-top:4px"><thead><tr><th></th><th class="C">Train</th><th class="C">Test</th></tr></thead>
      <tbody><tr><td>Model accuracy</td><td class="C">${r.trainAcc}%</td><td class="C">${r.testAcc}%</td></tr>
      <tr><td>Baseline (majority class)</td><td class="C">${r.baselineTrainAcc}%</td><td class="C">${r.baselineTestAcc}%</td></tr></tbody></table>
      <div class="alert" style="background:#fef9c3;color:#854d0e;border:1px solid #fde68a;margin-top:6px">A single-rule classifier on one feature — a starting baseline, not a production model. Compare test accuracy to the baseline, not to 100%.</div>
      <div style="margin-top:6px">${chartCanvasHTML(chartId, 300, 180)}${downloadChartButton(chartId, chartFile('classes'))}</div>`;
  }
  if (run.type === 'Clustering' && r.mode === 'mixed') {
    if (r.scatter) {
      queueChart(chartId, canvas => drawScatterChart(canvas,
        r.scatter.points.map((p, i) => ({ x: p[0], y: p[1], group: r.assignments[i] })),
        { xLabel: r.scatter.xLabel, yLabel: r.scatter.yLabel, title: `${r.k} clusters`, marks: r.scatter.marks }));
    } else {
      queueChart(chartId, canvas => drawBarChart(canvas, r.clusters.map(c => 'C' + c.id), r.clusters.map(c => c.size), { title: 'Cluster sizes', color: '#7C3AED' }));
    }
    const cRows = r.clusters.map(c => `<tr><td>Cluster ${c.id}</td><td class="C">${c.size}</td><td>${(c.summary || []).map(mlEsc).join('<br>')}</td></tr>`).join('');
    return meta + `<table style="font-size:11px"><thead><tr><th>Cluster</th><th class="C">Size</th><th>Profile (${r.cols.map(mlEsc).join(', ')})</th></tr></thead><tbody>${cRows}</tbody></table>
      <div style="font-size:10px;color:#64748b;margin-top:4px">Mixed clustering (k-prototypes): numeric columns are standardised, categorical columns count 1 for each mismatch. Categorical columns show the most common categories in each cluster.</div>
      <div style="margin-top:6px">${chartCanvasHTML(chartId, 300, 180)}${downloadChartButton(chartId, chartFile('clusters'))}</div>`;
  }
  if (run.type === 'Clustering') {
    const rows = r.clusters.map(c => `<tr><td>Cluster ${c.id}</td><td class="C">${c.size}</td><td>${c.centroid.join(', ')}</td></tr>`).join('');
    if (r.points && r.points[0]) {
      queueChart(chartId, canvas => drawScatterChart(canvas,
        r.points.map((p,i) => ({ x: p[0], y: p[1] !== undefined ? p[1] : p[0], group: r.assignments[i] })),
        { xLabel: r.cols[0], yLabel: r.cols[1] || r.cols[0], title: `${r.k} clusters`, marks: r.clusters.map(c => ({ x: c.centroid[0], y: c.centroid[1] !== undefined ? c.centroid[1] : c.centroid[0] })) }));
    }
    return meta + `<table style="font-size:11px"><thead><tr><th>Cluster</th><th class="C">Size</th><th>Centroid (${r.cols.join(', ')})</th></tr></thead><tbody>${rows}</tbody></table>
      <div style="margin-top:6px">${chartCanvasHTML(chartId, 300, 180)}${downloadChartButton(chartId, chartFile('clusters'))}</div>`;
  }
  if (run.type === 'Association') {
    const hasLift = r.rules.some(rule => rule.lift !== undefined);
    const rows = r.rules.map(rule => `<tr><td>${mlEsc(r.colA)}=${mlEsc(rule.a)} → ${mlEsc(r.colB)}=${mlEsc(rule.b)}</td><td class="C">${rule.count}</td><td class="C">${rule.support}</td><td class="C">${rule.confidence}</td>${hasLift ? `<td class="C">${rule.lift}</td>` : ''}</tr>`).join('');
    queueChart(chartId, canvas => drawBarChart(canvas, r.rules.map(rule => `${rule.a}→${rule.b}`), r.rules.map(rule => rule.confidence), { title: 'Confidence by rule', color: '#B45309' }));
    return meta + `<table style="font-size:11px"><thead><tr><th>Rule</th><th class="C">Count</th><th class="C">Support</th><th class="C">Confidence</th>${hasLift ? '<th class="C">Lift</th>' : ''}</tr></thead><tbody>${rows || '<tr><td colspan="5">No rule occurred more than once</td></tr>'}</tbody></table>
      ${hasLift ? '<div style="font-size:10px;color:#64748b;margin-top:2px">Lift above 1 means the pair occurs together more often than chance; below 1, less often.</div>' : ''}
      ${r.rules.length ? `<div style="margin-top:6px">${chartCanvasHTML(chartId, 300, 180)}${downloadChartButton(chartId, chartFile('rules'))}</div>` : ''}`;
  }
  return '';
}

function renderModelLabConfig(gid, ds, type) {
  const numericCols = (ds.stats || []).filter(s => s.type === 'numeric').map(s => s.name);
  const catCols = (ds.stats || []).filter(s => s.type === 'categorical').map(s => s.name);
  const opts = (cols, placeholder) => `<option value="">${placeholder}</option>` + cols.map(c=>`<option>${mlEsc(c)}</option>`).join('');
  // Every column, tagged by type. Numeric columns also appear "as categories" so
  // coded values such as 0/1 or 1–5 ratings can be treated as groups.
  const anyOpts = (placeholder) => `<option value="">${placeholder}</option>` + (ds.stats || []).map(s => s.type === 'numeric'
    ? `<option value="${mlEsc(s.name)}">${mlEsc(s.name)} (numeric)</option><option value="${ML_CAT_PREFIX}${mlEsc(s.name)}">${mlEsc(s.name)} (numeric, as categories)</option>`
    : `<option value="${mlEsc(s.name)}">${mlEsc(s.name)} (categorical)</option>`).join('');
  const catOpts = (placeholder) => `<option value="">${placeholder}</option>` + (ds.stats || []).map(s => s.type === 'numeric'
    ? `<option value="${ML_CAT_PREFIX}${mlEsc(s.name)}">${mlEsc(s.name)} (numeric codes as categories)</option>`
    : `<option value="${mlEsc(s.name)}">${mlEsc(s.name)} (categorical)</option>`).join('');

  if (type === 'Descriptive') {
    return `<div class="form-row">
      <div class="form-group"><label>Column A</label><select id="ml-colA">${anyOpts('— column —')}</select></div>
      <div class="form-group"><label>Column B</label><select id="ml-colB">${anyOpts('— column —')}</select></div>
    </div><div class="alert alert-info">Numeric + numeric → correlation. Categorical + categorical → contingency table, χ² test and Cramér's V. Categorical + numeric → summary of the numbers within each category.</div>`;
  }
  if (type === 'Forecasting') {
    return `<div class="form-row">
      <div class="form-group"><label>Column to forecast (numeric, chronological order)</label><select id="ml-forecast-col">${opts(numericCols,'— column —')}</select></div>
      <div class="form-group"><label>Periods ahead</label><input type="number" id="ml-periods" value="3" min="1" max="12"></div>
    </div>`;
  }
  if (type === 'Classification') {
    return `<div class="form-row">
      <div class="form-group"><label>Target to predict (categorical)</label><select id="ml-target">${catOpts('— column —')}</select></div>
      <div class="form-group"><label>Feature to predict from</label><select id="ml-feature">${anyOpts('— column —')}</select></div>
    </div><div class="alert alert-info">Numeric feature → best single threshold, using the two most common target categories. Categorical feature → one rule per category, any number of target classes.</div>`;
  }
  if (type === 'Clustering') {
    return `<div class="form-row">
      <div class="form-group"><label>Column 1</label><select id="ml-cluster-col1">${anyOpts('— column —')}</select></div>
      <div class="form-group"><label>Column 2 (optional)</label><select id="ml-cluster-col2">${anyOpts('— none —')}</select></div>
      <div class="form-group"><label>Column 3 (optional)</label><select id="ml-cluster-col3">${anyOpts('— none —')}</select></div>
      <div class="form-group"><label>Number of clusters (k)</label><input type="number" id="ml-k" value="3" min="2" max="6"></div>
    </div><div class="alert alert-info">All numeric → k-means. Any categorical column → mixed clustering (k-prototypes), which groups by both the numbers and the categories.</div>`;
  }
  if (type === 'Association') {
    return `<div class="form-row">
      <div class="form-group"><label>Column A (categories)</label><select id="ml-assoc-colA">${catOpts('— column —')}</select></div>
      <div class="form-group"><label>Column B (categories)</label><select id="ml-assoc-colB">${catOpts('— column —')}</select></div>
    </div>`;
  }
  return '';
}

function renderModelTool(gid) {
  const dataArt = toolData(gid, 'data');
  const datasets = Object.entries(dataArt.datasets || {});
  const modelArt = toolData(gid, 'model');
  const runs = Object.entries(modelArt.runs || {});
  const st = mlState(gid);
  if ((!st.datasetId || !(dataArt.datasets || {})[st.datasetId]) && datasets.length) st.datasetId = datasets[0][0];
  const dsRaw = st.datasetId && (dataArt.datasets || {})[st.datasetId];
  const ds = dsRaw ? { id: st.datasetId, ...dsRaw } : null;

  if (!datasets.length) {
    return `<h4>Model Lab</h4>${exportHeader(gid)}
      <div class="alert alert-info">Upload a dataset in the <strong>Data Workbench</strong> tool first — Model Lab runs its analyses on datasets stored there.</div>`;
  }

  const taskBtns = MODEL_TASKS.map(t => `<button class="btn ${st.taskType===t?'btn-primary':'btn-ghost'} btn-sm" onclick="setModelLabTaskType('${gid}','${t}')">${t}</button>`).join(' ');
  const dsOptions = datasets.map(([did,d]) => `<option value="${did}" ${did===st.datasetId?'selected':''}>${d.name} (${d.rowCount} rows)</option>`).join('');
  const missingSummary = ds ? (ds.stats||[]).filter(s=>s.missing>0).map(s=>`${s.name}: ${s.missing} missing`).join(' · ') : '';

  const runsHTML = runs.filter(([,r])=>r.datasetId===st.datasetId || true).map(([rid, r]) => `
    <div style="border-top:1px solid #e2e8f0;padding:8px 0">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:700;font-size:12px">${r.name} <span class="b b-slate">${r.type}</span></span>
        <span><button class="btn btn-ghost btn-sm" onclick="downloadModelRun('${gid}','${rid}')">⬇ Download</button>
        <button class="btn btn-danger btn-sm" onclick="removeModelRun('${gid}','${rid}')">✕</button></span>
      </div>
      <div style="margin-top:4px">${renderModelRunResult(r, rid)}</div>
    </div>`).join('');

  return `<h4>Model Lab</h4>${exportHeader(gid)}
    <div class="alert alert-info">Pick a task type and dataset, confirm the columns that matter, and run — the sandbox cleans the data and computes the result automatically.</div>

    <div class="form-group" style="margin-bottom:8px"><label>1. Dataset</label>
      <select onchange="setModelLabDataset('${gid}',this.value)">${dsOptions}</select></div>

    <div style="margin-bottom:10px"><label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px">2. Task type</label>
      <div style="display:flex;flex-wrap:wrap;gap:4px">${taskBtns}</div></div>

    ${ds ? `<div class="alert" style="background:#f8fafc;border:1px solid #e2e8f0;color:#475569">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
        <input type="checkbox" ${st.autoClean?'checked':''} onchange="toggleModelLabClean('${gid}',this.checked)">
        3. Clean data automatically (drop rows missing the columns used below)
      </label>
      ${missingSummary ? `<div style="font-size:10px;margin-top:4px">Missing values found — ${missingSummary}</div>` : '<div style="font-size:10px;margin-top:4px">No missing values detected in this dataset.</div>'}
    </div>

    <div style="margin:10px 0"><label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px">4. Confirm columns</label>
      ${renderModelLabConfig(gid, ds, st.taskType)}
    </div>

    <div style="display:flex;gap:6px;align-items:center;margin-bottom:14px">
      <input type="text" id="ml-run-name" placeholder="Name this run" style="flex:1">
      <button class="btn btn-primary btn-sm" onclick="runModelLabAnalysis('${gid}')">▶ Run Analysis</button>
    </div>` : ''}

    <div style="font-size:10px;font-weight:700;color:#94a3b8;margin-bottom:4px">SAVED RUNS (${runs.length})</div>
    ${runsHTML || '<p style="color:#94a3b8;font-size:12px">No runs yet.</p>'}`;
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
  if (!gid) {
    panel.innerHTML = (isLeader || isLecturer)
      ? '<p style="color:#94a3b8;font-size:12px">Select a Guild above to view its Studio Tools.</p>'
      : '<p style="color:#94a3b8;font-size:12px">Join a Guild first (see My Guild tab).</p>';
    return;
  }
  const renderer = TOOL_RENDERERS[currentTool];
  panel.innerHTML = renderer ? renderer(gid) : '<p>Tool not found.</p>';
  drawPendingCharts();
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
  if ((art.data && art.data.datasets && Object.keys(art.data.datasets).length) && (art.model && art.model.runs && Object.keys(art.model.runs).length))
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
// Staff see only the Guild they explicitly picked — never a Guild inherited
// from a student name remembered in this browser from an earlier session.
myGuildId = function() {
  if (isLeader || isLecturer) return viewingGuildId;
  return _origMyGuildId();
};

function populateStudioToolGuildPicker() {
  const picker = document.getElementById('studioToolStaffPicker');
  const sel = document.getElementById('studioToolGuildPicker');
  if (!picker || !sel) return;
  if (!isLeader && !isLecturer) { picker.style.display = 'none'; return; }
  picker.style.display = 'block';
  const guilds = Object.entries(appData.guilds || {});
  const opt = ([gid, g]) => `<option value="${gid}" ${gid === viewingGuildId ? 'selected' : ''}>${g.name}</option>`;

  // A Lecturer only has one campus, but every Guild is still reachable here
  // (a tutor sometimes covers for a colleague) — their own campus's Guilds
  // are just grouped first so they don't have to hunt for them in a
  // 19-Guild cohort-wide list.
  if (isLecturer && currentLecturer && currentLecturer.campus) {
    const mine = guilds.filter(([,g]) => g.campus === currentLecturer.campus);
    const others = guilds.filter(([,g]) => g.campus !== currentLecturer.campus);
    sel.innerHTML = '<option value="">— Select a Guild —</option>'
      + (mine.length ? `<optgroup label="${currentLecturer.campus} (your campus)">${mine.map(opt).join('')}</optgroup>` : '')
      + (others.length ? `<optgroup label="Other campuses">${others.map(opt).join('')}</optgroup>` : '');
    return;
  }

  sel.innerHTML = '<option value="">— Select a Guild —</option>' + guilds.map(opt).join('');
}

