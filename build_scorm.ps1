# build_scorm.ps1
# Builds ONE SCORM package for Blackboard Ultra:
#   cmp701_studio_scorm.zip  — contains bb.html (dashboard) + admin.html (XP manager)
#
# On first open users pick their role:
#   Student      -> guild picker -> personalised dashboard
#   Tutor        -> group picker -> Group Hub
#   Module Leader-> All Groups overview + "Open XP Manager" button -> admin.html
#
# Upload ONCE to Blackboard Ultra. Set visibility: visible to all enrolled users.
# Run: .\build_scorm.ps1

$Dir = $PSScriptRoot
$DL  = "C:\Users\terts\Downloads"
$Out = "$DL\cmp701_studio_scorm.zip"

# ── Build manifest ────────────────────────────────────────────────────────────
$manifest = @"
<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="cmp701-studio" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations default="org-cmp701-studio">
    <organization identifier="org-cmp701-studio">
      <title>CMP701 Digital Transformation Studio</title>
      <item identifier="item-dashboard" identifierref="res-dashboard">
        <title>CMP701 Studio Dashboard</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res-dashboard" type="webcontent"
              adlcp:scormtype="sco" href="bb.html">
      <file href="bb.html"/>
      <file href="admin.html"/>
    </resource>
  </resources>
</manifest>
"@

# ── Write manifest, zip, clean up ────────────────────────────────────────────
$mPath = "$Dir\imsmanifest_tmp.xml"
$manifest | Out-File -FilePath $mPath -Encoding utf8

if (Test-Path $Out) { Remove-Item $Out -Force }

Compress-Archive -Path "$Dir\bb.html","$Dir\admin.html","$mPath" `
                 -DestinationPath $Out

Remove-Item $mPath -Force

Write-Host ""
Write-Host "Built: $Out"
Write-Host ""
Write-Host "Contents of the zip:"
Write-Host "  bb.html      Student / Tutor / Module Leader dashboard (entry point)"
Write-Host "  admin.html   XP Manager (opened via button in Module Leader view)"
Write-Host "  imsmanifest.xml"
Write-Host ""
Write-Host "Upload to Blackboard Ultra:"
Write-Host "  Add Content > SCORM Package > select cmp701_studio_scorm.zip"
Write-Host "  Title: CMP701 Studio Dashboard"
Write-Host "  Visibility: visible to all enrolled users"
Write-Host "  Open in new window: Yes (recommended)"
