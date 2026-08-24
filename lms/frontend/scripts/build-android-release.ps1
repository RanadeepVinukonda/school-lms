<#
  Genesis LMS — Android release build (Windows / PowerShell).

  Produces a signed release APK:
      android/app/build/outputs/apk/release/app-release.apk

  Steps:
    1. Build the web bundle (out/)
    2. Sync the web assets + native plugins into the Capacitor Android project
    3. Assemble the signed release APK with the Gradle wrapper

  Prerequisites:
    - Node.js 18+, npm
    - JDK 17 (Android Gradle Plugin 8.x requirement)
    - Android SDK (ANDROID_HOME or default %LOCALAPPDATA%\Android\Sdk)

  The release keystore (genesis-release.keystore) and keystore.properties must
  already be present under android/ (they are, in this repo's local build).
#>
[System.Diagnostics.CodeAnalysis.SuppressMessage('PSUseDeclaredVarsMoreThanAssignments', '')]
[CmdletBinding()]
param(
    [switch]$DebugBuild = $false
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot

# Capacitor 8 / AGP 8.x require JDK 21+. Locate one (JAVA_HOME wins if suitable).
function Get-JdkMajorVersion {
    param([string]$JavaExe)
    # Prefer the JDK's `release` file (no process spawning, no stderr noise).
    $jdkHome = Split-Path (Split-Path $JavaExe -Parent) -Parent
    $releaseFile = Join-Path $jdkHome 'release'
    $rel = (Get-Content -LiteralPath $releaseFile -ErrorAction SilentlyContinue) -join "`n"
    if ($rel -match 'JAVA_VERSION="(\d+)') { return [int]$Matches[1] }
    # Fallback: probe `java -version` via cmd so stderr never trips EAP=Stop.
    $q = '"' + $JavaExe + '" -version 2>&1'
    $v = ((cmd /c $q 2>$null) -join ' ')
    if ($v -match 'version "(\d+)') { return [int]$Matches[1] }
    return $null
}

function Get-UsableJdk {
    $candidates = @()
    if ($env:JAVA_HOME) { $candidates += $env:JAVA_HOME }
    $candidates += "$env:ProgramFiles\Java\*", "$env:ProgramFiles\Eclipse Adoptium\*",
        "$env:ProgramFiles\Android\Android Studio\jbr"
    foreach ($c in $candidates) {
        $java = Get-ChildItem -Path $c -Filter java.exe -Recurse -ErrorAction SilentlyContinue |
            Where-Object { $_.Directory.Name -eq 'bin' } | Select-Object -First 1
        if (-not $java) { continue }
        $major = Get-JdkMajorVersion -JavaExe $java.FullName
        Write-Host "(probe) $($java.FullName) -> major $major" -ForegroundColor DarkGray
        if ($major -ge 21) {
            return (Split-Path $java.DirectoryName -Parent)
        }
    }
    return $null
}

$jdk = Get-UsableJdk
if ($jdk) {
    $env:JAVA_HOME = $jdk
    Write-Host "Using JDK: $jdk"
} else {
    throw 'No JDK 21+ found. Install JDK 21/22 (e.g. Temurin 21) and re-run.'
}

if (-not $env:ANDROID_HOME) {
    $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
}
if (-not (Test-Path $env:ANDROID_HOME)) {
    throw "Android SDK not found at $env:ANDROID_HOME. Set ANDROID_HOME and re-run."
}
Write-Host "Using Android SDK: $env:ANDROID_HOME"

Push-Location $Root
try {
    Write-Host "`n[1/3] Building web bundle (out/)" -ForegroundColor Cyan
    & npx next build --webpack
    if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }

    Write-Host "`n[2/3] Syncing Capacitor (android)" -ForegroundColor Cyan
    npx cap sync android
    if ($LASTEXITCODE -ne 0) { throw 'capacitor sync failed.' }

    Write-Host "`n[3/3] Assembling $($(if ($DebugBuild) {'debug'} else {'release'})) APK" -ForegroundColor Cyan
    $prevJavaHome = $env:JAVA_HOME
    $env:JAVA_HOME = $jdk
    Push-Location android
    try {
        if ($DebugBuild) {
            & .\gradlew.bat assembleDebug
        } else {
            & .\gradlew.bat assembleRelease
        }
        if ($LASTEXITCODE -ne 0) { throw 'Gradle build failed.' }
    } finally {
        Pop-Location
        $env:JAVA_HOME = $prevJavaHome
    }
} finally {
    Pop-Location
}

$variant = if ($DebugBuild) { 'debug' } else { 'release' }
$apk = Join-Path $Root "android\app\build\outputs\apk\$variant\app-$variant.apk"
if (Test-Path $apk) {
    $size = [math]::Round((Get-Item $apk).Length / 1MB, 2)
    Write-Host "`nSuccess: $apk ($size MB)" -ForegroundColor Green
} else {
    Write-Warning "Build finished but APK not found at $apk"
}