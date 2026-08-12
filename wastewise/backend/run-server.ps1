Set-Location -LiteralPath $PSScriptRoot
"[{0}] backend wrapper starting" -f (Get-Date -Format o) | Add-Content -LiteralPath run.out.log
& 'C:\Program Files\nodejs\node.exe' server.js 2>&1 | Tee-Object -FilePath run.out.log -Append
