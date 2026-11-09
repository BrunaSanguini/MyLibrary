<#
.SYNOPSIS
  Builds the Windows package of Minha Livraria: a private Java runtime (jlink), the app-image
  (jpackage) with MinhaLivraria.exe, a zip and its SHA-256 checksum.

.DESCRIPTION
  Runs after `./mvnw package` in backend/. The result goes to dist/ at the repository root:
    dist/minha-livraria-<version>-windows-x64.zip
    dist/minha-livraria-<version>-windows-x64.zip.sha256
  The executable is not digitally signed: Windows SmartScreen may warn on the first run.
#>
param(
  [Parameter(Mandatory = $true)]
  [string] $Version
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$jar = Join-Path $root 'backend/target/minha-livraria.jar'
$work = Join-Path $root 'dist/work'
$dist = Join-Path $root 'dist'
$name = "minha-livraria-$Version-windows-x64"

if (-not (Test-Path $jar)) { throw "Jar not found: $jar. Run ./mvnw package in backend/ first." }

Remove-Item -Recurse -Force $dist -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force (Join-Path $work 'input') | Out-Null
Copy-Item $jar (Join-Path $work 'input')

# Only the modules Spring Boot, Tomcat, Hibernate and H2 use; jdk.localedata brings the pt-BR formats.
$modules = @(
  'java.base', 'java.compiler', 'java.desktop', 'java.instrument', 'java.logging', 'java.management',
  'java.naming', 'java.net.http', 'java.prefs', 'java.rmi', 'java.scripting', 'java.security.jgss',
  'java.sql', 'java.transaction.xa', 'java.xml', 'jdk.charsets', 'jdk.jfr', 'jdk.localedata',
  'jdk.management', 'jdk.net', 'jdk.unsupported', 'jdk.zipfs'
) -join ','

jlink --add-modules $modules --strip-debug --no-header-files --no-man-pages `
  --output (Join-Path $work 'runtime')
if ($LASTEXITCODE -ne 0) { throw 'jlink failed' }

jpackage --type app-image `
  --name MinhaLivraria `
  --app-version $Version `
  --vendor BrunaSanguini `
  --description 'Minha Livraria - biblioteca pessoal' `
  --input (Join-Path $work 'input') `
  --main-jar minha-livraria.jar `
  --runtime-image (Join-Path $work 'runtime') `
  --java-options '-Dfile.encoding=UTF-8' `
  --dest (Join-Path $work 'image')
if ($LASTEXITCODE -ne 0) { throw 'jpackage failed' }

$zip = Join-Path $dist "$name.zip"
Compress-Archive -Path (Join-Path $work 'image/MinhaLivraria') -DestinationPath $zip
$hash = (Get-FileHash -Algorithm SHA256 $zip).Hash.ToLowerInvariant()
# Same format as sha256sum: "<hash>  <file name>".
Set-Content -Path "$zip.sha256" -Value "$hash  $name.zip" -Encoding ascii -NoNewline

Remove-Item -Recurse -Force $work
Get-ChildItem $dist | Format-Table Name, Length
