@echo off
rem Startet CampusConnect: Docker (Postgres + Redis), Backend (:4000) und Frontend (:3000).
rem Doppelklick genuegt. Jeder Server laeuft in einem eigenen Fenster; Fenster schliessen = Server stoppen.
setlocal
cd /d "%~dp0"

echo [1/4] Starte PostgreSQL und Redis ...
docker compose up -d
if errorlevel 1 (
  echo.
  echo Docker laeuft nicht. Bitte Docker Desktop starten und das Skript erneut ausfuehren.
  pause
  exit /b 1
)

echo Warte auf PostgreSQL ...
:waitdb
docker compose exec -T postgres pg_isready -U campus -q >nul 2>&1
if errorlevel 1 (
  ping -n 2 127.0.0.1 >nul
  goto waitdb
)

echo [2/4] Pruefe Konfiguration und Abhaengigkeiten ...
set FIRST_RUN=0
if not exist backend\.env (
  set FIRST_RUN=1
  node -e "const fs=require('fs');fs.writeFileSync('backend/.env',fs.readFileSync('backend/.env.example','utf8').replace('change-me-to-a-long-random-string',require('crypto').randomBytes(32).toString('hex')))"
)
if not exist frontend\.env.local copy frontend\.env.example frontend\.env.local >nul
if not exist backend\node_modules (
  pushd backend
  call npm install
  popd
)
if not exist frontend\node_modules (
  pushd frontend
  call npm install
  popd
)

echo [3/4] Aktualisiere Datenbankschema ...
pushd backend
call npx prisma db push
if errorlevel 1 (
  popd
  echo Datenbankschema konnte nicht aktualisiert werden.
  pause
  exit /b 1
)
if "%FIRST_RUN%"=="1" call npx prisma db seed
popd

echo [4/4] Starte Server ...
netstat -ano | findstr /r /c:":4000 .*LISTENING" >nul
if errorlevel 1 (
  start "CampusConnect Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"
) else (
  echo Backend laeuft bereits auf Port 4000.
)
netstat -ano | findstr /r /c:":3000 .*LISTENING" >nul
if errorlevel 1 (
  start "CampusConnect Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
) else (
  echo Frontend laeuft bereits auf Port 3000.
)

echo.
echo Fertig: Frontend http://localhost:3000  ^|  API http://localhost:4000
echo Demo-Daten zuruecksetzen: cd backend ^&^& npx prisma db seed
start "" http://localhost:3000
