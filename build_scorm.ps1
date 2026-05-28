# build_scorm.ps1
# Builds TWO SCORM packages for Blackboard Ultra:
#   1. cmp701_studio_scorm.zip   — unified dashboard (role picker on first open)
#                                  Students pick guild, Tutors pick group, ML sees all
#   2. cmp701_admin_scorm.zip    — module leader XP manager / weekly publisher
# Run: .\build_scorm.ps1

$Dir  = $PSScriptRoot
$DL   = "C:\Users\terts\Downloads"

function Make-SCORM($ZipPath, $Title, $HtmlFile, $HtmlHref, $Id) {
  $manifest = @"
<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="$Id" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations default="org-$Id">
    <organization identifier="org-$Id">
      <title>$Title</title>
      <item identifier="item-$Id" identifierref="res-$Id">
        <title>$Title</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res-$Id" type="webcontent"
              adlcp:scormtype="sco" href="$HtmlHref">
      <file href="$HtmlFile"/>
    </resource>
  </resources>
</manifest>
"@
  $mPath = "$Dir\imsmanifest_tmp.xml"
  $manifest | Out-File -FilePath $mPath -Encoding utf8
  if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
  Compress-Archive -Path "$Dir\$HtmlFile","$mPath" -DestinationPath $ZipPath
  Remove-Item $mPath -Force
  Write-Host "Built: $ZipPath"
}

# 1. Unified dashboard -- role picker on first open (Students, Tutors, Module Leader)
Make-SCORM "$DL\cmp701_studio_scorm.zip" "CMP701 Studio Dashboard" "bb.html" "bb.html" "cmp701-studio"

# 2. Admin weekly manager -- module leader only (XP entry + publish)
Make-SCORM "$DL\cmp701_admin_scorm.zip"  "CMP701 Studio Admin"     "admin.html" "admin.html" "cmp701-admin"

Write-Host ""
Write-Host "Upload to Blackboard Ultra as SCORM Package content items:"
Write-Host "  cmp701_studio_scorm.zip  Add to the main course content area (visible to all roles)"
Write-Host "                           On first open each user picks their role, then their guild or group."
Write-Host "  cmp701_admin_scorm.zip   Add to module leader content area only (XP manager)"
Write-Host ""
Write-Host "Visibility settings:"
Write-Host "  cmp701_studio_scorm.zip  Visible to Students AND Staff"
Write-Host "  cmp701_admin_scorm.zip   Visible to Staff only (or restrict by username)"
