#!/bin/bash

# ==============================================================================
# Word Scramble Party Game - macOS Startup Script
# ==============================================================================
# This script automates the process of checking dependencies, installing them,
# and launching both the backend server and the frontend development server.
# ==============================================================================

# --- Color Codes for Better Output ---
C_RED='\033[0;31m'
C_GREEN='\033[0;32m'
C_YELLOW='\033[0;33m'
C_BLUE='\033[0;34m'
C_NC='\033[0m' # No Color

# --- Helper Functions ---
function print_info() {
    echo -e "${C_BLUE}INFO:${C_NC} $1"
}

function print_success() {
    echo -e "${C_GREEN}SUCCESS:${C_NC} $1"
}

function print_warning() {
    echo -e "${C_YELLOW}WARNING:${C_NC} $1"
}

function print_error() {
    echo -e "${C_RED}ERROR:${C_NC} $1"
}

# --- Main Script Logic ---
print_info "Starting the Word Scramble Party Game server..."

# 1. Check for Node.js and npm
print_info "Checking for Node.js and npm..."
if ! command -v node &> /dev/null; then
    print_error "Node.js could not be found."
    print_info "Please install it from https://nodejs.org/ and try again."
    exit 1
fi
if ! command -v npm &> /dev/null; then
    print_error "npm could not be found."
    print_info "npm is usually installed with Node.js. Please reinstall Node.js from https://nodejs.org/ and try again."
    exit 1
fi
print_success "Node.js and npm are installed."

# 2. Check for .env file (optional; built-in fallback packs work without an API key)
print_info "Checking for .env file with GEMINI_API_KEY or API_KEY..."
if [ ! -f .env ]; then
    print_warning "The .env file was not found in the project root. Built-in fallback packs will be used unless you add GEMINI_API_KEY."
elif ! grep -qE "GEMINI_API_KEY|API_KEY" .env; then
    print_warning "The .env file does not contain GEMINI_API_KEY or API_KEY. Built-in fallback packs will be used."
else
    print_success ".env file with Gemini API key found."
fi


# 3. Check for node_modules and install if necessary
print_info "Checking for project dependencies..."
if [ ! -d "node_modules" ]; then
    print_warning "Dependencies not found. Running 'npm install'..."
    npm install
    if [ $? -ne 0 ]; then
        print_error "npm install failed. Please check for errors and try again."
        exit 1
    fi
    print_success "Dependencies installed successfully."
else
    print_success "Dependencies are already installed."
fi

# 4. Run the development server
print_info "Launching the game server and frontend..."
print_info "Your browser should open automatically."
print_info "To stop the server, press Ctrl+C in this terminal window."

npm run dev

# Exit with the status of the last command
exit $?