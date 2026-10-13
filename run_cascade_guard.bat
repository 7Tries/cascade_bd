@echo off
chcp 65001 >nul
title CascadeGuard Studio + PostgreSQL 16
echo ======================================================================
echo   CascadeGuard: Relational Cascade Engine & PostgreSQL 16
echo ======================================================================
echo.

REM Проверяем статус PostgreSQL на порту 5432
netstat -ano | findstr 5432 >nul
if %errorlevel% neq 0 (
    echo [INFO] Запуск локального PostgreSQL 16 (порт 5432)...
    start "" /B "C:\Users\Anxiety\pgsql\bin\postgres.exe" -D "C:\Users\Anxiety\pgsql\data"
    timeout /t 2 /nobreak >nul
) else (
    echo [OK] PostgreSQL 16 активен на порту 5432.
)

echo.
echo [INFO] Запуск веб-сервера CascadeGuard на http://localhost:8000...
echo [INFO] Нажмите Ctrl+C для остановки сервера.
echo.
cd /d "%~dp0backend"
python main.py
pause
