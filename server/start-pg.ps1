$pgBin = "C:\Program Files\PostgreSQL\18\bin\postgres.exe"
$pgData = "C:\Program Files\PostgreSQL\18\data"

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $pgBin
$psi.Arguments = "-D `"$pgData`" -p 5432"
$psi.UseShellExecute = $true
$psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Minimized

$proc = [System.Diagnostics.Process]::Start($psi)
Write-Host "PostgreSQL started with PID: $($proc.Id)"
Start-Sleep -Seconds 3

# Test connection
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h localhost -U postgres -c "SELECT 'PostgreSQL is running!' AS status;"
