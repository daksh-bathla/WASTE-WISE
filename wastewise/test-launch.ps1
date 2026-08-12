Set-Location -LiteralPath $PSScriptRoot
"[{0}] test script ran" -f (Get-Date -Format o) | Add-Content -LiteralPath test-launch.log
