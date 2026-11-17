<#
.SYNOPSIS
  Measures how long the Windows package of Minha Livraria takes to be ready.

.DESCRIPTION
  Unzips the package into a new folder, away from where it was built, as a person would. Then
  starts MinhaLivraria.exe the way the My Collection hub does (port and token) and counts the time
  from the start of the process to the readiness answering UP. Each run ends with the graceful
  shutdown. The first run creates the database and is left out: the others start on data that
  already exists, as every start after the first.

  Every start also checks that the interface is served at /. The release runs it once on the
  package before attaching it.

  Prints one line per run and a summary with the median, in milliseconds: the time until the
  readiness answered, and the time Spring Boot logs as "process running for", which is precise.
#>
param(
  [Parameter(Mandatory = $true)]
  [string] $Zip,
  [int] $Runs = 7,
  [int] $Port = 8481
)

$ErrorActionPreference = 'Stop'

$place = Join-Path ([IO.Path]::GetTempPath()) ("minha-livraria-startup-" + [Guid]::NewGuid())
$data = Join-Path $place 'data'
Expand-Archive -Path $Zip -DestinationPath $place
$exe = Join-Path $place 'MinhaLivraria/MinhaLivraria.exe'
$url = "http://127.0.0.1:$Port"

function Measure-Start {
  $token = [Guid]::NewGuid().ToString('N')
  $env:MINHA_LIVRARIA_SHUTDOWN_TOKEN = $token
  $clock = [Diagnostics.Stopwatch]::StartNew()
  $process = Start-Process -FilePath $exe -ArgumentList "--server.port=$Port", "--app.data-dir=$data" -PassThru
  while ($true) {
    if ($process.HasExited) { throw "The app stopped while starting (code $($process.ExitCode))" }
    if ($clock.Elapsed.TotalSeconds -gt 120) { throw 'The app was not ready in 120 s' }
    try {
      $health = Invoke-RestMethod -Uri "$url/actuator/health/readiness" -TimeoutSec 2
      if ($health.status -eq 'UP') { break }
    } catch {
      # Not listening yet.
    }
    Start-Sleep -Milliseconds 50
  }
  $elapsed = [int] $clock.Elapsed.TotalMilliseconds
  # The package must still serve the interface, not only the API.
  $page = Invoke-WebRequest -Uri "$url/" -UseBasicParsing
  if ($page.Content -notmatch '<ml-root') { throw 'The interface was not served at /' }
  # What Spring Boot logs when it is ready: "Started ... in 5.1 seconds (process running for 5.6)".
  # A refused connection takes about 2 s on Windows, so the readiness polling above is coarse; the
  # log has the precise number.
  $log = Join-Path $data 'logs/minha-livraria.log'
  $line = Select-String -Path $log -Pattern 'process running for ([0-9.]+)' | Select-Object -Last 1
  $jvm = [int] ([double] $line.Matches[0].Groups[1].Value * 1000)
  # No body: the Actuator refuses the form type PowerShell sends by default (415).
  Invoke-RestMethod -Method Post -Uri "$url/actuator/shutdown" -ContentType 'application/json' `
    -Headers @{ 'X-MyCollection-Token' = $token } | Out-Null
  if (-not $process.WaitForExit(60000)) { throw 'The app did not stop after the shutdown' }
  return [pscustomobject]@{ Ready = $elapsed; Jvm = $jvm }
}

try {
  $first = Measure-Start
  Write-Host "first start (creates the database): ready $($first.Ready) ms, started $($first.Jvm) ms"
  $times = @()
  for ($run = 1; $run -le $Runs; $run++) {
    $time = Measure-Start
    Write-Host "run ${run}: ready $($time.Ready) ms, started $($time.Jvm) ms"
    $times += $time
  }
  $ready = $times.Ready | Sort-Object
  $jvm = $times.Jvm | Sort-Object
  $middle = [int][Math]::Floor($times.Count / 2)
  Write-Host "median: ready $($ready[$middle]) ms, started $($jvm[$middle]) ms (min $($jvm[0]), max $($jvm[-1]))"

  [pscustomobject]@{
    First = $first.Jvm; Median = $jvm[$middle]; Min = $jvm[0]; Max = $jvm[-1]; Ready = $ready[$middle]
  }
} finally {
  Remove-Item Env:MINHA_LIVRARIA_SHUTDOWN_TOKEN -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force $place -ErrorAction SilentlyContinue
}
