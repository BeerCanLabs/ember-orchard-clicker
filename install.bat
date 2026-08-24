@echo off
echo Installing Ember Orchard Clicker...

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Node.js not found. Please install from https://nodejs.org/
    exit /b 1
)

echo Node.js found.
node --version

where serve >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Installing serve globally...
    npm install -g serve
)

echo Setup complete!
echo Run 'npx serve .' to start the server.
echo Or double-click index.html
pause