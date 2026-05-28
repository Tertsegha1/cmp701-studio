# build_scorm.ps1
# Builds four SCORM packages for Blackboard Ultra:
#   1. cmp701_student_scorm.zip  — student dashboard with guild picker
#   2. cmp701_tutor_scorm.zip    — tutor Group Hub with group picker
#   3. cmp701_admin_scorm.zip    — module leader all-groups + XP manager
#   4. cmp701_studio_scorm.zip   — alias for student (legacy name)
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

# 1. Student dashboard — guild picker on first open
Make-SCORM "$DL\cmp701_student_scorm.zip" "CMP701 Studio Dashboard" "bb.html" "bb.html" "cmp701-student"

# 2. Tutor view — group picker on first open
Make-SCORM "$DL\cmp701_tutor_scorm.zip"  "CMP701 Studio Tutor View" "bb.html" "bb.html?role=tutor" "cmp701-tutor"

# 3. Module leader admin — full overview + XP manager
Make-SCORM "$DL\cmp701_admin_scorm.zip"  "CMP701 Studio Admin"       "admin.html" "admin.html" "cmp701-admin"

Write-Host ""
Write-Host "Upload to Blackboard Ultra as SCORM Package content items:"
Write-Host "  cmp701_student_scorm.zip  Add to EACH guild workspace (33 workspaces)"
Write-Host "                            OR add once to the course content area (students pick guild on first open)"
Write-Host "  cmp701_tutor_scorm.zip    Add to a staff-only content area (tutors pick their group)"
Write-Host "  cmp701_admin_scorm.zip    Add to module leader content area only"
Write-Host ""
Write-Host "All SCORM items open in a new window. Set visibility appropriately per role."
