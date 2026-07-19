$ErrorActionPreference = "Stop"

$postgresBin = "C:\Program Files\PostgreSQL\18\bin"
$psql = Join-Path $postgresBin "psql.exe"

if (-not (Test-Path -LiteralPath $psql)) {
  throw "psql.exe not found at $psql"
}

$databaseName = $env:POSTGRES_DB
if (-not $databaseName) {
  $databaseName = "agro_operativo"
}

$appUser = $env:POSTGRES_USER
if (-not $appUser) {
  $appUser = "agro"
}

$appPassword = $env:POSTGRES_PASSWORD
if (-not $appPassword) {
  $appPassword = "agro"
}

$port = $env:POSTGRES_PORT
if (-not $port) {
  $port = "5432"
}

$superUser = "postgres"
$securePassword = Read-Host "PostgreSQL local password for user '$superUser'" -AsSecureString
$plainPassword = [System.Net.NetworkCredential]::new("", $securePassword).Password
$env:PGPASSWORD = $plainPassword

function Invoke-Postgres {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Database,
    [Parameter(Mandatory = $true)]
    [string] $Sql
  )

  & $psql -h localhost -p $port -U $superUser -d $Database -v ON_ERROR_STOP=1 -c $Sql
}

Write-Host "Checking local PostgreSQL connection..."
Invoke-Postgres -Database "postgres" -Sql "select current_user;" | Out-Host

Write-Host "Creating application role if needed..."
Invoke-Postgres -Database "postgres" -Sql @"
do `$`$
begin
  if not exists (select 1 from pg_roles where rolname = '$appUser') then
    create role "$appUser" with login createdb password '$appPassword';
  else
    alter role "$appUser" with login createdb password '$appPassword';
  end if;
end
`$`$;
"@ | Out-Host

Write-Host "Creating application database if needed..."
$databaseExists = & $psql -h localhost -p $port -U $superUser -d postgres -tAc "select 1 from pg_database where datname = '$databaseName';"
$databaseExists = ($databaseExists | Select-Object -First 1)

if ([string]::IsNullOrWhiteSpace($databaseExists) -or $databaseExists.Trim() -ne "1") {
  & $psql -h localhost -p $port -U $superUser -d postgres -v ON_ERROR_STOP=1 -c "create database ""$databaseName"" owner ""$appUser"";"
} else {
  Invoke-Postgres -Database "postgres" -Sql "alter database ""$databaseName"" owner to ""$appUser"";" | Out-Host
}

Invoke-Postgres -Database $databaseName -Sql "alter schema public owner to ""$appUser"";" | Out-Host
Invoke-Postgres -Database $databaseName -Sql "grant all privileges on schema public to ""$appUser"";" | Out-Host

$env:PGPASSWORD = $appPassword
$env:DATABASE_URL = "postgresql://${appUser}:${appPassword}@localhost:${port}/${databaseName}?schema=public"

Write-Host "Applying Prisma migrations without seed data..."
npm.cmd exec -- prisma migrate deploy

Write-Host "Local database is ready without seed data: $databaseName"
