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
  [string] $Version,

  # How the jar goes into the package. The startup measurements (docs/ci-cd.md) compare them:
  #   Jar        the Spring Boot jar as built, with the libraries nested inside;
  #   Extracted  the jar extracted into the application and lib/, as plain jars (the default: it
  #              started 17% faster, at the same size);
  #   AotCache   extracted, plus the AOT cache of the JDK, trained by starting the app once. It added
  #              no measured gain and 34 MB, so it stays here only to be measured again.
  [ValidateSet('Jar', 'Extracted', 'AotCache')]
  [string] $Layout = 'Extracted'
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$jar = Join-Path $root 'backend/target/minha-livraria.jar'
$work = Join-Path $root 'dist/work'
$dist = Join-Path $root 'dist'
$name = "minha-livraria-$Version-windows-x64"

if (-not (Test-Path $jar)) { throw "Jar not found: $jar. Run ./mvnw package in backend/ first." }

Remove-Item -Recurse -Force $dist -ErrorAction SilentlyContinue
$inputDir = Join-Path $work 'input'
New-Item -ItemType Directory -Force $inputDir | Out-Null
if ($Layout -eq 'Jar') {
  Copy-Item $jar $inputDir
} else {
  # The JDK caches only classes read from plain jars, not from jars nested in another one.
  java -Djarmode=tools -jar $jar extract --destination $inputDir
  if ($LASTEXITCODE -ne 0) { throw 'Extracting the jar failed' }
}

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

$javaOptions = @('--java-options', '-Dfile.encoding=UTF-8')
if ($Layout -eq 'AotCache') {
  # $APPDIR is replaced by jpackage with the folder of the installed app, wherever it was unzipped.
  $javaOptions += @('--java-options', '-XX:AOTCache=$APPDIR\minha-livraria.aot')
}

jpackage --type app-image `
  --name MinhaLivraria `
  --app-version $Version `
  --vendor BrunaSanguini `
  --description 'Minha Livraria - biblioteca pessoal' `
  --input $inputDir `
  --main-jar minha-livraria.jar `
  --runtime-image (Join-Path $work 'runtime') `
  @javaOptions `
  --dest (Join-Path $work 'image')
if ($LASTEXITCODE -ne 0) { throw 'jpackage failed' }

$app = Join-Path $work 'image/MinhaLivraria/app'
if ($Layout -eq 'AotCache') {
  # Training run: the app starts with the runtime and the class path of the package, on empty data,
  # and stops right after the context is ready. The JVM writes the cache as it exits.
  $java = Join-Path $work 'image/MinhaLivraria/runtime/bin/java.exe'
  $training = Join-Path $work 'training-data'
  $cache = Join-Path $app 'minha-livraria.aot'
  & $java "-XX:AOTCacheOutput=$cache" '-Dfile.encoding=UTF-8' '-Dspring.context.exit=onRefresh' `
    -cp (Join-Path $app 'minha-livraria.jar') io.github.brunasanguini.minhalivraria.MinhaLivrariaApplication `
    "--app.data-dir=$training" '--server.port=0'
  if ($LASTEXITCODE -ne 0) { throw 'The training run failed' }
  if (-not (Test-Path $cache)) { throw 'The AOT cache was not written' }
  Remove-Item -Recurse -Force $training
}

$zip = Join-Path $dist "$name.zip"
Compress-Archive -Path (Join-Path $work 'image/MinhaLivraria') -DestinationPath $zip
$hash = (Get-FileHash -Algorithm SHA256 $zip).Hash.ToLowerInvariant()
# Same format as sha256sum: "<hash>  <file name>".
Set-Content -Path "$zip.sha256" -Value "$hash  $name.zip" -Encoding ascii -NoNewline

Remove-Item -Recurse -Force $work
Get-ChildItem $dist | Format-Table Name, Length
