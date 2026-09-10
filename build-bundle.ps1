$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$jsRoot = Join-Path $root "js"

$order = @(
  "utils/id.js",
  "utils/date.js",
  "utils/dom.js",
  "utils/photo.js",
  "db/storage.js",
  "db/users.js",
  "db/session.js",
  "db/access.js",
  "db/vehicles.js",
  "db/tools.js",
  "components/toast.js",
  "components/modal.js",
  "components/statusBadge.js",
  "components/photoInput.js",
  "components/pinPad.js",
  "components/header.js",
  "components/bottomNav.js",
  "router.js",
  "pages/accessGate.js",
  "pages/home.js",
  "pages/login.js",
  "pages/settings.js",
  "pages/vehicles/list.js",
  "pages/vehicles/form.js",
  "pages/vehicles/dailyReport.js",
  "pages/vehicles/inspection.js",
  "pages/vehicles/issueReport.js",
  "pages/vehicles/issueList.js",
  "pages/vehicles/detail.js",
  "pages/tools/list.js",
  "pages/tools/form.js",
  "pages/tools/detail.js",
  "pages/tools/checkout.js",
  "pages/tools/return.js",
  "pages/tools/history.js",
  "pages/users/list.js",
  "pages/users/form.js",
  "app.js"
)

$sb = New-Object System.Text.StringBuilder

foreach ($rel in $order) {
  $path = Join-Path $jsRoot $rel
  $content = Get-Content -Path $path -Raw -Encoding UTF8

  # strip local ES module import statements (single-line or multi-line)
  $content = [regex]::Replace($content, '(?ms)^\s*import\s*\{.*?\}\s*from\s*"\.[^"]*";\s*$', '')

  # de-export: keep the declarations, drop the "export" keyword
  $content = [regex]::Replace($content, '(?m)^export\s+async\s+function\b', 'async function')
  $content = [regex]::Replace($content, '(?m)^export\s+function\b', 'function')
  $content = [regex]::Replace($content, '(?m)^export\s+const\b', 'const')

  [void]$sb.AppendLine("// ==== $rel ====")
  [void]$sb.AppendLine($content.Trim())
  [void]$sb.AppendLine("")
}

$outPath = Join-Path $root "dist-bundle.js"
[System.IO.File]::WriteAllText($outPath, $sb.ToString(), (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Wrote $outPath"
