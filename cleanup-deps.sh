#!/bin/bash

# Node.js Dependency Cleanup Script
# Cleans up node_modules and reinstalls fresh dependencies

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧹 Node.js Dependency Cleanup Tool${NC}"
echo "=================================="

# Function to show current disk usage
show_usage() {
    if [ -d "node_modules" ]; then
        SIZE=$(du -sh node_modules 2>/dev/null | cut -f1)
        echo -e "${YELLOW}📊 Current node_modules size: ${SIZE}${NC}"
    else
        echo -e "${YELLOW}📊 No node_modules folder found${NC}"
    fi
}

# Function to clean everything
clean_all() {
    echo -e "\n${YELLOW}🗑️  Removing node_modules...${NC}"
    if [ -d "node_modules" ]; then
        rm -rf node_modules
        echo -e "${GREEN}✅ Removed node_modules${NC}"
    fi
    
    echo -e "${YELLOW}🗑️  Removing package-lock.json...${NC}"
    if [ -f "package-lock.json" ]; then
        rm package-lock.json
        echo -e "${GREEN}✅ Removed package-lock.json${NC}"
    fi
    
    echo -e "${YELLOW}🗑️  Removing npm cache...${NC}"
    npm cache clean --force
    echo -e "${GREEN}✅ Cleared npm cache${NC}"
}

# Function to reinstall dependencies
reinstall_deps() {
    echo -e "\n${YELLOW}📦 Installing fresh dependencies...${NC}"
    npm install
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
        show_usage
    else
        echo -e "${RED}❌ Failed to install dependencies${NC}"
        exit 1
    fi
}

# Function to audit and fix vulnerabilities
audit_and_fix() {
    echo -e "\n${YELLOW}🔍 Auditing for vulnerabilities...${NC}"
    npm audit
    
    echo -e "\n${YELLOW}🔧 Attempting to fix vulnerabilities...${NC}"
    npm audit fix
    
    echo -e "${GREEN}✅ Audit complete${NC}"
}

# Function to remove dev dependencies from production
remove_dev_deps() {
    echo -e "\n${YELLOW}🏭 Removing development dependencies...${NC}"
    npm prune --production
    echo -e "${GREEN}✅ Development dependencies removed${NC}"
}

# Main menu
echo "Select cleanup option:"
echo "1) Full cleanup (remove node_modules, package-lock.json, clear cache, reinstall)"
echo "2) Quick cleanup (remove node_modules, reinstall)"
echo "3) Cache cleanup only"
echo "4) Remove dev dependencies (production mode)"
echo "5) Audit and fix vulnerabilities"
echo "6) Show current usage and exit"
echo ""

show_usage

read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        echo -e "\n${RED}⚠️  Full cleanup will remove everything and reinstall fresh${NC}"
        read -p "Are you sure? (y/N): " confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            clean_all
            reinstall_deps
            audit_and_fix
        else
            echo "Cancelled."
        fi
        ;;
    2)
        echo -e "\n${YELLOW}Quick cleanup...${NC}"
        if [ -d "node_modules" ]; then
            rm -rf node_modules
            echo -e "${GREEN}✅ Removed node_modules${NC}"
        fi
        reinstall_deps
        ;;
    3)
        echo -e "\n${YELLOW}Clearing npm cache...${NC}"
        npm cache clean --force
        echo -e "${GREEN}✅ Cache cleared${NC}"
        ;;
    4)
        remove_dev_deps
        show_usage
        ;;
    5)
        audit_and_fix
        ;;
    6)
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo -e "\n${GREEN}🎉 Cleanup complete!${NC}"
