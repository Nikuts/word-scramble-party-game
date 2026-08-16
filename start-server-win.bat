@echo off
REM This script automates starting the Word Scramble Party Game server.

REM Set the title of the command prompt window.
TITLE Word Scramble Server

ECHO ===============================================
ECHO  Word Scramble Party Game Server
ECHO ===============================================
ECHO.

REM Step 1: Always run npm install to ensure all dependencies are up to date.
ECHO [STEP 1] Installing/Verifying required packages...
call npm install
IF %ERRORLEVEL% NEQ 0 (
    ECHO.
    ECHO ****************************************************
    ECHO * ERROR: npm install failed.                       *
    ECHO * Please make sure Node.js is installed correctly. *
    ECHO ****************************************************
    ECHO.
    PAUSE
    EXIT /B 1
)
ECHO Packages are ready.
ECHO.

REM Step 2: Start the Node.js server.
ECHO [STEP 3] Starting the game server...
ECHO You can close this window to stop the server.
ECHO.
npm run start:dev
