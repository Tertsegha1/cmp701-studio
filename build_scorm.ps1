# build_scorm.ps1
# Builds ONE SCORM 1.2 package for Blackboard Ultra:
#   cmp701_studio_scorm.zip  -- bb.html (dashboard) + admin.html (XP manager)
#
# Entry point: bb.html -- role picker on first open
#   Student       -> guild picker -> personalised dashboard
#   Tutor         -> group picker -> Group Hub
#   Module Leader -> All Groups overview + Open XP Manager -> admin.html
#
# Run: .\build_scorm.ps1

$Dir = $PSScriptRoot
$DL  = "C:\Users\terts\Downloads"
$Out = "$DL\cmp701_studio_scorm.zip"

$manifest = @'
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
'@

# Stage files in a clean temp folder.
# imsmanifest.xml must be named exactly that at the zip root -- any other name
# causes Blackboard Ultra to reject the package with an upload error.
$tmp = Join-Path $env:TEMP "cmp701_scorm_stage"
if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
New-Item -ItemType Directory -Path $tmp | Out-Null

Copy-Item "$Dir\bb.html"    $tmp
Copy-Item "$Dir\admin.html" $tmp

# Write manifest WITHOUT BOM -- UTF-8 with BOM can cause SCORM parse errors
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText("$tmp\imsmanifest.xml", $manifest, $utf8NoBom)

# Build zip
if (Test-Path $Out) { Remove-Item $Out -Force }
Compress-Archive -Path "$tmp\*" -DestinationPath $Out

# Clean up temp folder
Remove-Item $tmp -Recurse -Force

Write-Host ""
Write-Host "Built: $Out"
Write-Host ""

# List zip contents to confirm correct structure
Add-Type -AssemblyName System.IO.Compression.FileSystem
$z = [System.IO.Compression.ZipFile]::OpenRead($Out)
Write-Host "Zip contents (all files must be at root level):"
foreach ($entry in $z.Entries) {
    $kb = [math]::Round($entry.Length / 1024, 1)
    Write-Host "  $($entry.FullName)  ($kb KB)"
}
$z.Dispose()

Write-Host ""
Write-Host "Upload instructions:"
Write-Host "  Blackboard Ultra: Add Content, SCORM Package, select cmp701_studio_scorm.zip"
Write-Host "  Title: CMP701 Studio Dashboard"
Write-Host "  Open in new window: Yes"
Write-Host "  Visible to: All enrolled users"
