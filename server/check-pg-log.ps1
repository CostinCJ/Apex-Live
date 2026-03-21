$logDir = "C:\Program Files\PostgreSQL\18\data\log"
$latest = Get-ChildItem $logDir | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Write-Host "Latest log: $($latest.FullName)"
Get-Content $latest.FullName -Tail 30
