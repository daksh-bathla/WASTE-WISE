Set-Location -LiteralPath $PSScriptRoot
"[{0}] frontend wrapper starting" -f (Get-Date -Format o) | Add-Content -LiteralPath run.out.log
& 'C:\Program Files\nodejs\npm.cmd' run dev -- --host 127.0.0.1 2>&1 | Tee-Object -FilePath run.out.log -Append
