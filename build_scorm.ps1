# build_scorm.ps1
# Builds two SCORM packages for Blackboard Ultra:
#   1. cmp701_studio_scorm.zip  — student-facing dashboard  (bb.html)
#   2. cmp701_admin_scorm.zip   — module leader weekly manager (admin.html)
# Run: .\build_scorm.ps1

$StudioDir = $PSScriptRoot
$StudentZip = "C:\Users\terts\Downloads\cmp701_studio_scorm.zip"
$AdminZip   = "C:\Users\terts\Downloads\cmp701_admin_scorm.zip"

# ── Student dashboard SCORM ───────────────────────────────────────────────
if (Test-Path $StudentZip) { Remove-Item $StudentZip -Force }
Compress-Archive -Path "$StudioDir\bb.html","$StudioDir\imsmanifest.xml" `
                 -DestinationPath $StudentZip
Write-Host "Student SCORM built:  $StudentZip"

# ── Admin manager SCORM ───────────────────────────────────────────────────
# Needs its own manifest pointing to admin.html
$AdminManifest = "$StudioDir\imsmanifest_admin.xml"
@'
<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="cmp701-studio-admin" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="
    http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
    http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p1p2.xsd">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations default="cmp701-admin-org">
    <organization identifier="cmp701-admin-org">
      <title>CMP701 Studio Weekly Manager</title>
      <item identifier="item-admin" identifierref="res-admin">
        <title>Weekly Manager</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res-admin" type="webcontent"
              adlcp:scormtype="sco" href="admin.html">
      <file href="admin.html"/>
    </resource>
  </resources>
</manifest>
'@ | Out-File -FilePath $AdminManifest -Encoding utf8

if (Test-Path $AdminZip) { Remove-Item $AdminZip -Force }
Compress-Archive -Path "$StudioDir\admin.html","$AdminManifest" `
                 -DestinationPath $AdminZip
Remove-Item $AdminManifest -Force
Write-Host "Admin SCORM built:    $AdminZip"

Write-Host ""
Write-Host "Upload instructions:"
Write-Host "  Student dashboard: upload $StudentZip as SCORM — visible to all students"
Write-Host "  Weekly Manager:    upload $AdminZip as SCORM — visible to staff only (hide from students)"
Write-Host ""
Write-Host "To update the dashboard: edit bb.html, re-run this script, replace the student SCORM in BB."
Write-Host "Or use the Weekly Manager directly in Blackboard (no scripts needed)."
