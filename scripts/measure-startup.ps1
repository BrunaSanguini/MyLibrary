<#
.SYNOPSIS
  Measures how long the Windows package of Minha Livraria takes to be ready.

.DESCRIPTION
  Unzips the package into a new folder, away from where it was built, as a person would. Then
  starts MinhaLivraria.exe the way the My Collection hub does (port and token) and counts the time
  from the start of the process to the readiness answering UP. Each run ends with the graceful
  shutdown. The first run creates the database and is left out: the others start on data that
  already exists, as every start after the first.

  Prints one line per run and a summary with the median, in milliseconds.
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
  Invoke-RestMethod -Method Post -Uri "$url/actuator/shutdown" -Headers @{ 'X-MyCollection-Token' = $token } | Out-Null
  if (-not $process.WaitForExit(60000)) { throw 'The app did not stop after the shutdown' }
  return $elapsed
}

try {
  $first = Measure-Start
  Write-Host "first start (creates the database): $first ms"
  $times = @()
  for ($run = 1; $run -le $Runs; $run++) {
    $time = Measure-Start
    Write-Host "run ${run}: $time ms"
    $times += $time
  }
  $sorted = $times | Sort-Object
  $median = $sorted[[int][Math]::Floor($sorted.Count / 2)]
  Write-Host "median: $median ms (min $($sorted[0]), max $($sorted[-1]))"
  [pscustomobject]@{ First = $first; Median = $median; Min = $sorted[0]; Max = $sorted[-1] }
} finally {
  Remove-Item -Env:MINHA_LIVRARIA_SHUTDOWN_TOKEN -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force $place -ErrorAction SilentlyContinue
}
