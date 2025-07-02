#!/bin/bash

# Soldier Sign-Out System Startup Script
# Checks if database exists and runs appropriate script

DB_PATH="./data/soldiers.db"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Soldier Sign-Out System${NC}"
echo "================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Function to clean and reinstall dependencies
clean_dependencies() {
    echo -e "${YELLOW}🧹 Cleaning up node_modules...${NC}"
    
    if [ -d "node_modules" ]; then
        rm -rf node_modules
        echo -e "${GREEN}✅ Removed existing node_modules${NC}"
    fi
    
    if [ -f "package-lock.json" ]; then
        rm package-lock.json
        echo -e "${GREEN}✅ Removed package-lock.json${NC}"
    fi
    
    echo -e "${YELLOW}📦 Installing fresh dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install dependencies.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Dependencies cleaned and reinstalled successfully${NC}"
}

# Check for cleanup flag
if [ "$1" = "--clean" ] || [ "$1" = "-c" ]; then
    clean_dependencies
    exit 0
fi

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install dependencies.${NC}"
        exit 1
    fi
fi

# Function to start server and open browser
start_server() {
    echo -e "${YELLOW}🌐 Opening browser...${NC}"
    
    # Start server in background
    node server.js &
    SERVER_PID=$!
    
    # Wait a moment for server to start
    sleep 3
    
    # Try to open browser
    if command -v chromium-browser &> /dev/null; then
        chromium-browser http://localhost:3000 &> /dev/null &
        echo -e "${GREEN}✅ Browser opened successfully${NC}"
    elif command -v google-chrome &> /dev/null; then
        google-chrome http://localhost:3000 &> /dev/null &
        echo -e "${GREEN}✅ Browser opened successfully${NC}"
    elif command -v firefox &> /dev/null; then
        firefox http://localhost:3000 &> /dev/null &
        echo -e "${GREEN}✅ Browser opened successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  No supported browser found. Please open http://localhost:3000 manually${NC}"
    fi
    
    # Wait for server process
    wait $SERVER_PID
}

# Check if database exists
if [ -f "$DB_PATH" ]; then
    echo -e "${GREEN}✅ Database found. Starting server...${NC}"
    echo "================================"
    start_server
else
    echo -e "${YELLOW}⚠️  Database not found. Running setup...${NC}"
    echo "================================"
    node setup.js
    
    # After setup completes, check if database was created
    if [ -f "$DB_PATH" ]; then
        echo ""
        echo -e "${GREEN}✅ Setup completed successfully.${NC}"
        echo -e "${YELLOW}🔄 Starting server...${NC}"
        echo "================================"
        start_server
    else
        echo -e "${RED}❌ Setup did not complete successfully.${NC}"
        exit 1
    fi
fi
