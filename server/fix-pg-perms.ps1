$dataDir = "C:\Program Files\PostgreSQL\18\data"
$user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

Write-Host "Granting full control to $user on $dataDir..."
$acl = Get-Acl $dataDir
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule($user, "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
$acl.SetAccessRule($rule)
Set-Acl -Path $dataDir -AclObject $acl

# Also fix child items
Get-ChildItem $dataDir -Recurse -Force | ForEach-Object {
    $childAcl = Get-Acl $_.FullName
    $childAcl.SetAccessRule($rule)
    Set-Acl -Path $_.FullName -AclObject $childAcl
}

Write-Host "Permissions fixed. Starting PostgreSQL..."
$proc = Start-Process -FilePath "C:\Program Files\PostgreSQL\18\bin\postgres.exe" -ArgumentList "-D","$dataDir","-p","5432" -PassThru -WindowStyle Minimized
Start-Sleep -Seconds 4

if ($proc.HasExited) {
    Write-Host "PG exited with code: $($proc.ExitCode)"
    $latest = Get-ChildItem "$dataDir\log" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($latest) { Get-Content $latest.FullName -Tail 10 }
} else {
    Write-Host "PostgreSQL running with PID: $($proc.Id)"
    & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h localhost -U postgres -c "SELECT 'OK' AS status;"
}
