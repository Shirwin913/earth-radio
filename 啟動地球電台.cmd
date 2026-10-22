@echo off
set "EARTH_RADIO_ASSET_ROOT=%~dp0"
cd /d "%TEMP%"
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js is required. Please install it from https://nodejs.org/
 pause
 exit /b 1
)
powershell.exe -NoProfile -Command "$radioRuntime=Join-Path $env:USERPROFILE 'DocumentsCodexEarthRadioRuntime'; New-Item -ItemType Directory -Path $radioRuntime -Force | Out-Null; foreach($radioName in @('server.cjs','vessels-bundled.cjs','webcams.cjs','storm-radii.cjs','conditions.cjs','estimated-fronts.cjs')) { Copy-Item -LiteralPath (Join-Path $env:EARTH_RADIO_ASSET_ROOT $radioName) -Destination $radioRuntime -Force }; Set-Location -LiteralPath $radioRuntime; & node (Join-Path $radioRuntime 'server.cjs') --open; exit $LASTEXITCODE"
if errorlevel 1 echo Startup failed. Please send the error shown above.
pause
