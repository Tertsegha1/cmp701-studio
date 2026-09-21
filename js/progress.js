// ─── Tutor Progress Dashboard ────────────────────────────────────────
// One screen showing every Guild's completion across all Studio Tools,
// company/prototype status, and an evidence-gap flag — filterable by
// campus and seminar group. Closes the framework's explicit "tutor
// dashboard shows progress and evidence gaps by Guild" requirement,
// which the pick-a-Guild-at-a-time Studio Tools view doesn't cover.
function toolCompletion(art) {
  art = art || {};
  const hasText = obj => obj && Object.keys(obj).some(k => k !== 'updatedAt' && obj[k]);
  return {
    evidence: ((art.evidence && art.evidence.rows) || []).length > 0,
    maturity: ['technology', 'process', 'people', 'data'].some(k => art.maturity && art.maturity[k] && art.maturity[k].score > 0),
    strategy: ['strategy_pestle', 'strategy_fiveforces', 'strategy_swot', 'strategy_most', 'strategy_ansoff'].some(k => hasText(art[k]))
      || ((art.strategy_stakeholders && art.strategy_stakeholders.rows) || []).length > 0,
    platform: hasText(art.platform),
    data: !!(art.data && art.data.datasets && Object.keys(art.data.datasets).length),
    model: !!(art.model && art.model.runs && Object.keys(art.model.runs).length),
    bmc: hasText(art.bmc) || !!(art.bmc && art.bmc.revenueInputs),
    process: ((art.process && art.process.rows) || []).length > 0 || !!(art.process && art.process.roadmap),
    innovation: ((art.innovation && art.innovation.rows) || []).length > 0
  };
}

function renderProgressDashboard() {
  const body = document.getElementById('progressBody');
  if (!body) return;

  const campusSel = document.getElementById('progCampusFilter');
  const groupSel = document.getElementById('progGroupFilter');
  const campusFilter = campusSel ? campusSel.value : '';
  const groupFilter = groupSel ? groupSel.value : '';

  const allGuilds = Object.entries(appData.guilds || {});
  const campuses = [...new Set(allGuilds.map(([,g]) => g.campus).filter(Boolean))].sort();
  const groups = [...new Set(allGuilds.map(([,g]) => g.seminarGroup).filter(Boolean))].sort();

  const guilds = allGuilds.filter(([,g]) =>
    (!campusFilter || g.campus === campusFilter) && (!groupFilter || (g.seminarGroup || '') === groupFilter)
  );

  const rows = guilds.map(([gid, g]) => {
    const comp = toolCompletion(g.artefacts);
    const evCount = ((g.artefacts && g.artefacts.evidence && g.artefacts.evidence.rows) || []).length;
    const gap = evCount < 3;
    const cells = TOOL_DEFS.map(t => `<td class="C" title="${t.label}">${comp[t.key] ? '<span style="color:#15803D;font-weight:700">✓</span>' : '<span style="color:#cbd5e1">—</span>'}</td>`).join('');
    const proto = g.prototype ? (g.prototype.scopeStatus || 'not started') : 'not started';
    const protoBadge = proto === 'approved' ? '<span class="b b-green">approved</span>' : proto === 'requested' ? '<span class="b b-amber">awaiting</span>' : '<span class="b b-slate">not started</span>';
    const frozen = g.prototype && g.prototype.frozenVersionId ? '<span class="b b-green">🔒 frozen</span>' : '<span class="b b-slate">—</span>';
    const companyBadge = !g.company ? '<span class="b b-slate">not set</span>' : g.company.status === 'approved' ? '<span class="b b-green">approved</span>' : '<span class="b b-amber">pending</span>';
    return `<tr${gap ? ' style="background:#fef2f2"' : ''}>
      <td style="font-weight:700">${g.name}</td>
      <td style="font-size:11px">${g.campus || '—'}${g.seminarGroup ? ' Group ' + g.seminarGroup : ''}</td>
      <td class="C">${companyBadge}</td>
      ${cells}
      <td class="C">${protoBadge}</td>
      <td class="C">${frozen}</td>
      <td class="C">${gap ? `<span class="b b-red">⚠ ${evCount}/3 sources</span>` : '<span class="b b-green">OK</span>'}</td>
      <td class="C"><button class="btn btn-ghost btn-sm" onclick="goToStudioToolsForGuild('${gid}')">View</button></td>
    </tr>`;
  }).join('');

  const opts = (arr, current) => arr.map(v => `<option value="${v}" ${v===current?'selected':''}>${v}</option>`).join('');

  body.innerHTML = `
    <div class="frow" style="margin-bottom:10px">
      <select id="progCampusFilter" onchange="renderProgressDashboard()" style="padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:6px;font-size:12px">
        <option value="" ${!campusFilter?'selected':''}>All Campuses</option>${opts(campuses, campusFilter)}
      </select>
      <select id="progGroupFilter" onchange="renderProgressDashboard()" style="padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:6px;font-size:12px">
        <option value="" ${!groupFilter?'selected':''}>All Seminar Groups</option>${opts(groups, groupFilter)}
      </select>
    </div>
    <div class="tw"><table><thead><tr>
      <th>Guild</th><th>Campus / Group</th><th class="C">Company</th>
      ${TOOL_DEFS.map(t => `<th class="C" title="${t.label}">${t.icon}</th>`).join('')}
      <th class="C">Prototype</th><th class="C">Frozen</th><th class="C">Evidence</th><th class="C">Open</th>
    </tr></thead><tbody>${rows || `<tr><td colspan="${5 + TOOL_DEFS.length}" style="text-align:center;color:#94a3b8;padding:16px">No Guilds match these filters</td></tr>`}</tbody></table></div>
    <div class="alert alert-info" style="margin-top:10px">✓ / — shows whether each Guild has started that Studio Tool (hover an icon for its name). Rows highlighted in red have fewer than 3 Evidence Library sources logged.</div>`;
}
