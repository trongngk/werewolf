$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$androidStudioJava = 'C:\Program Files\Android\Android Studio\jbr'

if (Test-Path -LiteralPath $androidStudioJava) {
  $env:JAVA_HOME = $androidStudioJava
}

if (-not $env:ANDROID_HOME) {
  $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
}

$env:NODE_ENV = 'production'

Push-Location $projectRoot
try {
  & npx.cmd expo prebuild --platform android --no-install
  if ($LASTEXITCODE -ne 0) { throw 'Expo prebuild failed.' }

  # React Native 0.83.6 includes foojay-resolver 0.5.0, which is incompatible with Gradle 9.
  $wrapperPath = Join-Path $projectRoot 'android\gradle\wrapper\gradle-wrapper.properties'
  $wrapper = Get-Content -Raw -LiteralPath $wrapperPath
  $wrapper = $wrapper.Replace('gradle-9.0.0-bin.zip', 'gradle-8.14.3-bin.zip')
  Set-Content -LiteralPath $wrapperPath -Value $wrapper

  Push-Location (Join-Path $projectRoot 'android')
  try {
    & .\gradlew.bat assembleRelease
    if ($LASTEXITCODE -ne 0) { throw 'Gradle release build failed.' }
  }
  finally {
    Pop-Location
  }

  $distPath = Join-Path $projectRoot 'dist'
  New-Item -ItemType Directory -Path $distPath -Force | Out-Null
  Copy-Item `
    -LiteralPath (Join-Path $projectRoot 'android\app\build\outputs\apk\release\app-release.apk') `
    -Destination (Join-Path $distPath 'werewolf-moderator.apk') `
    -Force

  Get-Item -LiteralPath (Join-Path $distPath 'werewolf-moderator.apk')
}
finally {
  Pop-Location
}
