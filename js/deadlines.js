// ─── Deadline Editor (Module Leader) ─────────────────────────────────
// The framework's critical instruction: the module leader must be able to
// enter/update CW1, CW2, Quest and LunchPoint dates personally, with a
// change history and a reconciliation warning — dates here never silently
// become the formal Blackboard submission dates. Nothing here is
// hard-coded from any past cohort; every date starts blank until entered.
function editorIdentity() {
  if (isLeader) return 'Module Leader';
  if (isLecturer && typeof currentLecturer !== 'undefined' && currentLecturer) return currentLecturer.name;
  return 'Staff';
}

async function logDeadlineChange(field, oldValue, newValue, reason) {
  if (oldValue === newValue) return;
  const history = appData.config.deadlineHistory || [];
  history.push({ ts: Date.now(), editor: editorIdentity(), field, oldValue: oldValue || '(not set)', newValue: newValue || '(cleared)', reason: reason || '' });
  await sRef('config/deadlineHistory').set(history);
}

function questDateVal(week, key) {
  const qd = appData.config.questDates || {};
  return (qd[week] && qd[week][key]) || '';
}
function prDateVal(week) {
  const pd = appData.config.peerReviewDates || {};
  return (pd[week] && pd[week].date) || '';
}

function checkDeadlineConflicts() {
  const warnings = [];
  const qd = appData.config.questDates || {};
  for (let w = 1; w <= 12; w++) {
    const q = qd[w];
    if (q && q.release && q.close && new Date(q.close) < new Date(q.release)) {
      warnings.push(`Week ${w}: close date is before its release date`);
    }
  }
  const lp = appData.config.lunchpoint || {};
  const cw2 = appData.config.cw2Deadline;
  if (lp.date && cw2 && new Date(lp.date) < new Date(cw2)) {
    warnings.push('LunchPoint is scheduled before the CW2 submission deadline');
  }
  if (lp.freezeAt && lp.date && new Date(lp.date) < new Date(lp.freezeAt)) {
    warnings.push('LunchPoint date is before its own prototype freeze deadline');
  }
  return warnings;
}

async function publishDeadlines() {
  const reason = prompt('Reason for this change (shown in the change history):', '') || '';
  const before = JSON.parse(JSON.stringify(appData.config));

  const cw1Sub = document.getElementById('dlCw1Sub').value;
  const cw1Mark = document.getElementById('dlCw1Mark').value;
  const cw2Sub = document.getElementById('dlCw2Sub').value;
  const cw2Mark = document.getElementById('dlCw2Mark').value;

  await logDeadlineChange('CW1 submission', before.cw1Deadline, cw1Sub, reason);
  await logDeadlineChange('CW1 marking', before.cw1MarkDeadline, cw1Mark, reason);
  await logDeadlineChange('CW2 submission', before.cw2Deadline, cw2Sub, reason);
  await logDeadlineChange('CW2 marking', before.cw2MarkDeadline, cw2Mark, reason);

  const questDates = {};
  for (let w = 1; w <= 12; w++) {
    const release = document.getElementById('dlQRelease' + w).value;
    const close = document.getElementById('dlQClose' + w).value;
    questDates[w] = { release, close };
    const beforeQ = (before.questDates && before.questDates[w]) || {};
    await logDeadlineChange(`Week ${w} Quest release`, beforeQ.release, release, reason);
    await logDeadlineChange(`Week ${w} Quest close`, beforeQ.close, close, reason);
  }

  const peerReviewDates = {};
  for (let w = 1; w <= 12; w++) {
    const date = document.getElementById('dlPR' + w).value;
    peerReviewDates[w] = { date };
    const beforeP = (before.peerReviewDates && before.peerReviewDates[w]) || {};
    await logDeadlineChange(`Week ${w} Peer Review checkpoint`, beforeP.date, date, reason);
  }

  await sRef('config').update({
    cw1Deadline: cw1Sub, cw1MarkDeadline: cw1Mark, cw2Deadline: cw2Sub, cw2MarkDeadline: cw2Mark,
    questDates, peerReviewDates
  });
  toast('Deadlines published — student calendars will refresh', 'ok');
  renderDeadlines();
}

function renderDeadlines() {
  const body = document.getElementById('deadlinesBody');
  if (!body) return;
  if (!isLeader) {
    body.innerHTML = renderDeadlinesReadOnly();
    return;
  }

  const c = appData.config;
  const questRows = Array.from({ length: 12 }, (_, i) => i + 1).map(w => `
    <tr><td>Week ${w}</td>
      <td><input type="datetime-local" id="dlQRelease${w}" value="${questDateVal(w,'release')}"></td>
      <td><input type="datetime-local" id="dlQClose${w}" value="${questDateVal(w,'close')}"></td>
      <td><input type="datetime-local" id="dlPR${w}" value="${prDateVal(w)}"></td>
    </tr>`).join('');

  const warnings = checkDeadlineConflicts();
  const history = (c.deadlineHistory || []).slice().reverse().slice(0, 30);
  const historyRows = history.map(h => `<tr>
    <td style="font-size:10px;color:#94a3b8">${new Date(h.ts).toLocaleString('en-GB')}</td>
    <td>${h.editor}</td><td>${h.field}</td>
    <td style="font-size:11px"><span style="color:#B91C1C">${h.oldValue}</span> → <span style="color:#15803D">${h.newValue}</span></td>
    <td style="font-size:11px;color:#64748b">${h.reason||'—'}</td>
  </tr>`).join('');

  body.innerHTML = `
    <div class="alert" style="background:#dbeafe;color:#1D4ED8;border:1px solid #93c5fd">
      All UK time. Publishing here updates student calendars and reminders in this Studio only —
      it does <strong>not</strong> change the formal Blackboard submission date. Always verify against the approved coursework brief before publishing.
    </div>
    ${warnings.length ? `<div class="alert" style="background:#fee2e2;color:#B91C1C;border:1px solid #fca5a5">⚠ ${warnings.join(' · ')}</div>` : ''}

    <div class="card">
      <div class="card-hdr blue">CW1 & CW2</div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group"><label>CW1 submission (25%)</label><input type="datetime-local" id="dlCw1Sub" value="${c.cw1Deadline||''}"></div>
          <div class="form-group"><label>CW1 marking deadline</label><input type="datetime-local" id="dlCw1Mark" value="${c.cw1MarkDeadline||''}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>CW2 submission (75%)</label><input type="datetime-local" id="dlCw2Sub" value="${c.cw2Deadline||''}"></div>
          <div class="form-group"><label>CW2 marking deadline</label><input type="datetime-local" id="dlCw2Mark" value="${c.cw2MarkDeadline||''}"></div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-hdr teal">Quest Release/Close & Peer Review Checkpoints</div>
      <div class="card-body" style="padding:0"><table><thead><tr><th>Week</th><th>Quest Release</th><th>Quest Close</th><th>Peer Review Checkpoint</th></tr></thead>
      <tbody>${questRows}</tbody></table></div>
    </div>

    <div class="alert alert-info">LunchPoint date, venue and freeze time are configured in <strong>Prototypes &amp; LunchPoint</strong> — they appear here in the conflict check above.</div>

    <button class="btn btn-primary" onclick="publishDeadlines()">Publish Deadlines</button>

    <div class="card" style="margin-top:16px">
      <div class="card-hdr slate">Change History</div>
      <div class="card-body" style="padding:0"><table><thead><tr><th>When</th><th>Editor</th><th>Field</th><th>Change</th><th>Reason</th></tr></thead>
      <tbody>${historyRows || '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:16px">No changes published yet</td></tr>'}</tbody></table></div>
    </div>`;
}

function renderDeadlinesReadOnly() {
  const c = appData.config;
  const rows = Array.from({ length: 12 }, (_, i) => i + 1).map(w =>
    `<tr><td>Week ${w}</td><td>${questDateVal(w,'release')||'—'}</td><td>${questDateVal(w,'close')||'—'}</td></tr>`
  ).join('');
  return `
    <div class="krow">
      <div class="kpi bl"><div class="v">${c.cw1Deadline ? new Date(c.cw1Deadline).toLocaleDateString('en-GB') : 'TBC'}</div><div class="l">CW1 Submission</div></div>
      <div class="kpi pu"><div class="v">${c.cw2Deadline ? new Date(c.cw2Deadline).toLocaleDateString('en-GB') : 'TBC'}</div><div class="l">CW2 Submission</div></div>
    </div>
    <div class="card"><div class="card-hdr teal">Quest Schedule</div><div class="card-body" style="padding:0">
      <table><thead><tr><th>Week</th><th>Release</th><th>Close</th></tr></thead><tbody>${rows}</tbody></table>
    </div></div>`;
}
