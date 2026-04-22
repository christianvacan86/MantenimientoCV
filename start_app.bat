@echo off
setlocal

set "ROOT=%~dp0"

if not exist "%ROOT%backend\venv\Scripts\activate.bat" (
  echo [ERROR] No se encontro el entorno virtual en backend\venv.
  echo Crea el venv e instala dependencias antes de ejecutar este script.
  pause
  exit /b 1
)

if not exist "%ROOT%frontend\node_modules" (
  echo [ADVERTENCIA] No se encontro frontend\node_modules.
  echo Ejecuta "npm install" en frontend si falla el arranque.
)

start "CMMS Backend" cmd /k "cd /d "%ROOT%backend" && call venv\Scripts\activate.bat && uvicorn main:app --reload --host 0.0.0.0 --port 8000"
start "CMMS Frontend" cmd /k "cd /d "%ROOT%frontend" && npm run dev"

echo Backend y Frontend iniciandose en ventanas separadas...
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173

endlocal
