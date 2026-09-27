// ─── Completion Certificates ────────────────────────────────────────
// Awarded once a student's Guild has completed every milestone week. Each
// certificate gets a globally unique id written to studio/__certificates/{id}
// — OUTSIDE any single cohort's path — so the public verify-certificate.html
// page can confirm authenticity without first needing to know which cohort
// issued it. The QR code simply encodes a link to that verification page.
function verifyBaseUrl() {
  return location.origin + location.pathname.replace(/index\.html$/, '');
}

function generateCertId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
  let rand = '';
  for (let i = 0; i < 8; i++) rand += chars[Math.floor(Math.random() * chars.length)];
  return `CMP701-${rand}`;
}

async function issueCertificate(studentId) {
  const student = appData.students[studentId];
  if (!student || !student.guildId) return null;
  const gid = student.guildId;
  const guild = appData.guilds[gid];
  if (!guild || guildMilestoneCompletedCount(gid) < MILESTONE_WEEKS.length) return null;

  if (student.certificateId) return student.certificateId; // idempotent — never re-issue
  const certId = generateCertId();
  const cohortName = COHORT_ID === 'default' ? '2025–26 S2' : ((allCohorts[COHORT_ID] || {}).name || COHORT_ID);
  await db.ref('studio/__certificates/' + certId).set({
    studentId, studentName: student.name, guildId: gid, guildName: guild.name,
    campus: student.campus || guild.campus || '', cohortId: COHORT_ID, cohortName,
    module: 'CMP701 Digital Transformation Studio', issuedAt: Date.now(),
    milestonesCompleted: MILESTONE_WEEKS.length
  });
  await sRef('students/' + studentId + '/certificateId').set(certId);
  return certId;
}

function renderCertificateSection() {
  const body = document.getElementById('sCertificateBody');
  if (!body) return;
  if (!currentStudent || !appData.students[currentStudent]) {
    body.innerHTML = '<p style="color:#94a3b8;font-size:12px">Select your name to check your certificate eligibility.</p>';
    return;
  }
  const student = appData.students[currentStudent];
  const gid = student.guildId;
  const count = gid ? guildMilestoneCompletedCount(gid) : 0;
  const total = MILESTONE_WEEKS.length;
  const eligible = gid && count >= total;

  if (!gid) {
    body.innerHTML = '<p style="color:#94a3b8;font-size:12px">Join a Guild to start earning milestone completions toward your certificate.</p>';
    return;
  }
  if (!eligible) {
    body.innerHTML = `
      <div class="pbar-wrap" style="height:12px;margin-bottom:8px"><div class="pbar-fill" style="width:${Math.round(count/total*100)}%;background:#B45309"></div></div>
      <p style="font-size:12px;color:#475569">Your Guild has completed <strong>${count}/${total}</strong> milestone weeks. Complete all ${total} to unlock your certificate.</p>`;
    return;
  }

  const existingId = student.certificateId;
  body.innerHTML = `
    <p style="font-size:12px;color:#15803D;font-weight:700;margin-bottom:10px">🎉 All ${total} milestone weeks complete — your certificate is ready!</p>
    <button class="btn btn-primary" onclick="openCertificateModal()">${existingId ? 'View My Certificate' : 'Generate My Certificate'}</button>`;
}

async function openCertificateModal() {
  const certId = await issueCertificate(currentStudent);
  if (!certId) { toast('Certificate not available yet', 'err'); return; }
  const student = appData.students[currentStudent];
  const guild = appData.guilds[student.guildId];
  const verifyUrl = verifyBaseUrl() + 'verify-certificate.html?id=' + certId;

  document.getElementById('certificateModalBody').innerHTML = `
    <div id="certRenderTarget" style="text-align:center;color:#94a3b8;font-size:12px;padding:20px">Rendering certificate…</div>
    <div style="display:flex;gap:8px;margin-top:12px;justify-content:center">
      <button class="btn btn-primary" onclick="downloadCertificatePNG()">⬇ Download Certificate (PNG)</button>
      <button class="btn btn-ghost" onclick="window.print()">🖨 Print</button>
    </div>
    <p style="font-size:10px;color:#94a3b8;text-align:center;margin-top:8px">Verify at <a href="${verifyUrl}" target="_blank">${verifyUrl}</a></p>`;

  renderCertificateSVG(student.name, guild ? guild.name : '', certId, verifyUrl);
  openModal('certificateModal');
}

function renderCertificateSVG(studentName, guildName, certId, verifyUrl) {
  // Render the QR via the vendored qrcodejs library into a detached element,
  // then pull its canvas back out as a data URL to embed inside the
  // certificate SVG — so the whole certificate (border, text, QR) downloads
  // and prints as a single self-contained image.
  const qrHolder = document.createElement('div');
  new QRCode(qrHolder, { text: verifyUrl, width: 110, height: 110, correctLevel: QRCode.CorrectLevel.M });
  setTimeout(() => {
    const qrCanvas = qrHolder.querySelector('canvas');
    const qrDataUrl = qrCanvas ? qrCanvas.toDataURL('image/png') : '';
    const issuedDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const svg = `
      <svg id="certificateSVG" viewBox="0 0 800 560" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:#fff">
        <rect x="0" y="0" width="800" height="560" fill="#fffdf7"/>
        <rect x="16" y="16" width="768" height="528" fill="none" stroke="#B45309" stroke-width="4"/>
        <rect x="28" y="28" width="744" height="504" fill="none" stroke="#1B3A6B" stroke-width="1.5"/>
        <text x="400" y="95" text-anchor="middle" font-family="Georgia,serif" font-size="16" letter-spacing="4" fill="#B45309">CERTIFICATE OF COMPLETION</text>
        <text x="400" y="145" text-anchor="middle" font-family="Georgia,serif" font-size="30" font-weight="bold" fill="#1B3A6B">CMP701 Digital Transformation Studio</text>
        <text x="400" y="185" text-anchor="middle" font-family="Arial" font-size="13" fill="#475569">Ulster University QAHE</text>
        <text x="400" y="245" text-anchor="middle" font-family="Arial" font-size="13" fill="#64748b">This certifies that</text>
        <text x="400" y="290" text-anchor="middle" font-family="Georgia,serif" font-size="28" font-weight="bold" fill="#1e293b">${escapeXML(studentName)}</text>
        <text x="400" y="325" text-anchor="middle" font-family="Arial" font-size="13" fill="#64748b">has successfully completed all ${MILESTONE_WEEKS.length} Guild studio milestones as a member of</text>
        <text x="400" y="352" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="#0D7377">${escapeXML(guildName)}</text>
        <line x1="220" y1="410" x2="420" y2="410" stroke="#94a3b8" stroke-width="1"/>
        <text x="220" y="428" font-family="Arial" font-size="10" fill="#64748b">Dr Tertsegha Anande — Module Leader</text>
        <text x="220" y="445" font-family="Arial" font-size="10" fill="#94a3b8">Issued ${issuedDate}</text>
        ${qrDataUrl ? `<image x="630" y="380" width="110" height="110" href="${qrDataUrl}"/>` : ''}
        <text x="685" y="505" text-anchor="middle" font-family="Arial" font-size="8" fill="#94a3b8">Scan to verify</text>
        <text x="400" y="530" text-anchor="middle" font-family="monospace" font-size="10" fill="#94a3b8">Certificate ID: ${certId}</text>
      </svg>`;
    const target = document.getElementById('certRenderTarget');
    if (target) target.outerHTML = `<div id="certRenderTarget">${svg}</div>`;
  }, 50);
}

function escapeXML(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
}

function downloadCertificatePNG() {
  const svgEl = document.getElementById('certificateSVG');
  if (!svgEl) { toast('Certificate still rendering — try again in a moment', 'err'); return; }
  const svgData = new XMLSerializer().serializeToString(svgEl);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1600; canvas.height = 1120; // 2x for a crisp download/print
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'CMP701_Certificate.png';
    a.click();
  };
  img.src = url;
}
