$ErrorActionPreference = "Stop"
$docs = Split-Path -Parent $MyInvocation.MyCommand.Path
$html = Join-Path $docs "informe-completo.html"
$pdf = Join-Path $docs "informe-completo.pdf"
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$uri = ([Uri]$html).AbsoluteUri

if (-not (Test-Path $chrome)) {
  $chrome = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
}

& $chrome --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="$pdf" $uri
if (-not (Test-Path $pdf)) { throw "PDF was not created: $pdf" }
Write-Host "Wrote $pdf"
