#!/bin/bash

# Cursor Agent Mode Switcher
# Switches between VIBE mode (autonomous) and DEV mode (collaborative)

PROJECT_ROOT="/home/eventstorm1/vc-3"
CURSORRULES_FILE="$PROJECT_ROOT/.cursorrules"
VIBE_RULES="$PROJECT_ROOT/.cursorrules.vibe"
DEV_RULES="$PROJECT_ROOT/.cursorrules.dev"
VSCODE_DIR="$PROJECT_ROOT/.vscode"
SETTINGS_FILE="$VSCODE_DIR/settings.json"
VIBE_SETTINGS="$VSCODE_DIR/settings.vibe.json"
DEV_SETTINGS="$VSCODE_DIR/settings.dev.json"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

show_current_mode() {
    if [ -f "$CURSORRULES_FILE" ]; then
        if grep -q "VIBE MODE" "$CURSORRULES_FILE" 2>/dev/null; then
            echo -e "${BLUE}Current mode: VIBE (Autonomous)${NC}"
        elif grep -q "DEV MODE" "$CURSORRULES_FILE" 2>/dev/null; then
            echo -e "${BLUE}Current mode: DEV (Collaborative)${NC}"
        else
            echo -e "${YELLOW}Current mode: Unknown (custom .cursorrules)${NC}"
        fi
    else
        echo -e "${YELLOW}No mode set (no .cursorrules file)${NC}"
    fi
}

switch_to_vibe() {
    echo -e "${GREEN}Switching to VIBE MODE (Autonomous)...${NC}"
    
    # Copy cursorrules
    if [ -f "$VIBE_RULES" ]; then
        cp "$VIBE_RULES" "$CURSORRULES_FILE"
        echo "  ✓ Applied VIBE .cursorrules"
    else
        echo -e "${YELLOW}  ⚠ Warning: $VIBE_RULES not found${NC}"
    fi
    
    # Create .vscode directory if needed
    mkdir -p "$VSCODE_DIR"
    
    # Copy settings
    if [ -f "$VIBE_SETTINGS" ]; then
        cp "$VIBE_SETTINGS" "$SETTINGS_FILE"
        echo "  ✓ Applied VIBE VSCode/Cursor settings"
    else
        echo -e "${YELLOW}  ⚠ Warning: $VIBE_SETTINGS not found${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}✓ Switched to VIBE MODE${NC}"
    echo "  → Agent operates autonomously"
    echo "  → Minimal interruptions and prompts"
    echo "  → Auto-apply suggestions enabled"
    echo "  → Max context and long-running tasks"
}

switch_to_dev() {
    echo -e "${GREEN}Switching to DEV MODE (Collaborative)...${NC}"
    
    # Copy cursorrules
    if [ -f "$DEV_RULES" ]; then
        cp "$DEV_RULES" "$CURSORRULES_FILE"
        echo "  ✓ Applied DEV .cursorrules"
    else
        echo -e "${YELLOW}  ⚠ Warning: $DEV_RULES not found${NC}"
    fi
    
    # Create .vscode directory if needed
    mkdir -p "$VSCODE_DIR"
    
    # Copy settings
    if [ -f "$DEV_SETTINGS" ]; then
        cp "$DEV_SETTINGS" "$SETTINGS_FILE"
        echo "  ✓ Applied DEV VSCode/Cursor settings"
    else
        echo -e "${YELLOW}  ⚠ Warning: $DEV_SETTINGS not found${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}✓ Switched to DEV MODE${NC}"
    echo "  → Agent works collaboratively"
    echo "  → Frequent approvals required"
    echo "  → Detailed explanations enabled"
    echo "  → Educational mode active"
}

show_help() {
    echo "Cursor Agent Mode Switcher"
    echo ""
    echo "Usage: $0 [mode]"
    echo ""
    echo "Modes:"
    echo "  vibe    - Switch to VIBE mode (autonomous, minimal interruptions)"
    echo "  dev     - Switch to DEV mode (collaborative, frequent approvals)"
    echo "  status  - Show current mode"
    echo "  help    - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 vibe    # Switch to autonomous mode"
    echo "  $0 dev     # Switch to collaborative mode"
    echo "  $0 status  # Check current mode"
}

# Main script logic
case "$1" in
    vibe)
        switch_to_vibe
        ;;
    dev)
        switch_to_dev
        ;;
    status)
        show_current_mode
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${YELLOW}No mode specified${NC}"
        echo ""
        show_current_mode
        echo ""
        show_help
        exit 1
        ;;
esac

