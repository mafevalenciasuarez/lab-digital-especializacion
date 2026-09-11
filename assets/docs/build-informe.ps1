$ErrorActionPreference = "Stop"
$docs = Split-Path -Parent $MyInvocation.MyCommand.Path
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chrome)) {
  $chrome = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
}

function Export-Pdf($name) {
  $html = Join-Path $docs "$name.html"
  $pdf = Join-Path $docs "$name.pdf"
  $uri = ([Uri]$html).AbsoluteUri
  & $chrome --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="$pdf" $uri
  if (-not (Test-Path $pdf)) { throw "PDF was not created: $pdf" }
  Write-Host "Wrote $pdf"
}

Export-Pdf "informe-completo"
Export-Pdf "rubrica"
