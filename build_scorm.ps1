# build_scorm.ps1
# Packages bb.html as a Blackboard Ultra SCORM 1.2 zip.
# Run: .\build_scorm.ps1

$OutZip    = "C:\Users\terts\Downloads\cmp701_studio_scorm.zip"
$StudioDir = $PSScriptRoot

if (Test-Path $OutZip) { Remove-Item $OutZip -Force }

Compress-Archive -Path "$StudioDir\bb.html","$StudioDir\imsmanifest.xml" `
                 -DestinationPath $OutZip

Write-Host "SCORM package built: $OutZip"
Write-Host "Upload to Blackboard Ultra as a SCORM Package content item."
Write-Host "To update: edit bb.html, re-run this script, then replace the package in BB."
