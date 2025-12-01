#!/bin/bash

# Cursor Agent Mode Switcher
# Switches between VIBE mode (autonomous) and DEV mode (collaborative)

PROJECT_ROOT="/home/eventstorm1/vc-3"
CURSORRULES_FILE="$PROJECT_ROOT/.cursorrules"
VIBE_RULES="$PROJECT_ROOT/.cursorrules.vibe"
DEV_RULES="$PROJECT_ROOT/.cursorrules.dev"
VSCODE_DIR="$PROJECT_ROOT/.vscode"
SETTINGS_FILE="$VSCODE_DIR/settings.json"

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
    cp "$VIBE_RULES" "$CURSORRULES_FILE"
    
    # Update VSCode settings if they exist
    if [ -f "$SETTINGS_FILE" ]; then
        # Use jq if available, otherwise use sed
        if command -v jq &> /dev/null; then
            jq '.["cursor.general.enableAutoUpdate"] = true | 
                .["cursor.ai.autoApply"] = true' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp" && \
                mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
        fi
    fi
    
    echo -e "${GREEN}✓ Switched to VIBE MODE${NC}"
    echo "Agent will now operate autonomously with minimal interruptions"
}

switch_to_dev() {
    echo -e "${GREEN}Switching to DEV MODE (Collaborative)...${NC}"
    cp "$DEV_RULES" "$CURSORRULES_FILE"
    
    # Update VSCode settings if they exist
    if [ -f "$SETTINGS_FILE" ]; then
        # Use jq if available, otherwise use sed
        if command -v jq &> /dev/null; then
            jq '.["cursor.general.enableAutoUpdate"] = false | 
                .["cursor.ai.autoApply"] = false' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp" && \
                mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
        fi
    fi
    
    echo -e "${GREEN}✓ Switched to DEV MODE${NC}"
    echo "Agent will now work collaboratively with frequent check-ins"
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

