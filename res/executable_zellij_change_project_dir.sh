#!/usr/bin/env zsh

# Commands should be prefixed with a space to skip being stored in zsh's history

# Tabs are matched by POSITION (0=nvim, 1=claude, 2=dev, 3=storybook), same
# as the old tmux script matched by window index rather than name — this is
# what keeps working after the nvim tab gets renamed to the project name.
NVIM_POS=0
CLAUDE_POS=1
DEV_POS=2
STORYBOOK_POS=3

if [ -z "$1" ]; then
    echo "Usage: $0 <project_name>"
    exit 1
fi

INPUT_NAME="$1"
ACTUAL_DIR=$(find "$HOME/code" -maxdepth 1 -type d -iname "$INPUT_NAME" -print -quit)

if [ -z "$ACTUAL_DIR" ]; then
    echo "Error: No directory matching '$INPUT_NAME' found in ~/code"
    exit 1
fi

PROJECT_NAME=$(basename "$ACTUAL_DIR")
PROJECT_DIR="$ACTUAL_DIR"

panes_json() {
    zellij action list-panes --json --all
}

# The pane's title tracks the currently running foreground command (kitty's
# shell integration sets it per-command), so it doubles as tmux's
# pane_current_command.
pane_id_for_pos() {
    panes_json | jq -r --argjson pos "$1" '[.[] | select(.is_plugin==false and .tab_position==$pos)][0].id'
}

title_for_pos() {
    panes_json | jq -r --argjson pos "$1" '[.[] | select(.is_plugin==false and .tab_position==$pos)][0].title'
}

tab_id_for_pos() {
    zellij action list-tabs --json --all | jq -r --argjson pos "$1" '.[] | select(.position==$pos) | .tab_id'
}

run_in_pane() {
    local pane=$1
    shift
    zellij action write-chars --pane-id "$pane" -- "$*"
    zellij action send-keys --pane-id "$pane" -- Enter
}

npm_script_exists() {
    local script_name=$1
    [ -f "$PROJECT_DIR/package.json" ] && grep -q "\"$script_name\":" "$PROJECT_DIR/package.json"
}

# --- nvim tab: check for unsaved changes before touching anything ---
NVIM_PANE=$(pane_id_for_pos "$NVIM_POS")
if [ "$(title_for_pos "$NVIM_POS")" = "nvim" ]; then
    zellij action send-keys --pane-id "$NVIM_PANE" -- Esc
    sleep 0.2
    run_in_pane "$NVIM_PANE" ":qa"
    sleep 0.5

    if [ "$(title_for_pos "$NVIM_POS")" = "nvim" ]; then
        echo "Error: nvim tab has unsaved changes. Please save or discard changes before switching projects."
        exit 1
    fi
fi

# nvim tab: rename, cd, launch nvim
zellij action rename-tab --tab-id "$(tab_id_for_pos "$NVIM_POS")" "$PROJECT_NAME"
run_in_pane "$NVIM_PANE" " cd $PROJECT_DIR"
run_in_pane "$NVIM_PANE" " nvim"

# --- claude tab: close claude if running, cd, relaunch ---
CLAUDE_PANE=$(pane_id_for_pos "$CLAUDE_POS")
if [ "$(title_for_pos "$CLAUDE_POS")" = "claude" ]; then
    zellij action send-keys --pane-id "$CLAUDE_PANE" -- "Ctrl c"
    sleep 0.3
    zellij action send-keys --pane-id "$CLAUDE_PANE" -- "Ctrl c"
    sleep 0.5

    if [ "$(title_for_pos "$CLAUDE_POS")" = "claude" ]; then
        run_in_pane "$CLAUDE_PANE" "/exit"
        sleep 0.5
    fi

    attempt=0
    while [ "$(title_for_pos "$CLAUDE_POS")" = "claude" ] && [ $attempt -lt 10 ]; do
        sleep 0.2
        attempt=$((attempt + 1))
    done
fi
run_in_pane "$CLAUDE_PANE" " cd $PROJECT_DIR"
run_in_pane "$CLAUDE_PANE" " claude"

# --- dev tab: stop whatever's running, cd, npm run start (falls back to dev) ---
DEV_PANE=$(pane_id_for_pos "$DEV_POS")
DEV_TITLE=$(title_for_pos "$DEV_POS")
if [[ "$DEV_TITLE" == npm* ]]; then
    zellij action send-keys --pane-id "$DEV_PANE" -- "Ctrl c"
    sleep 0.5
fi
run_in_pane "$DEV_PANE" " cd $PROJECT_DIR"
if npm_script_exists "start"; then
    run_in_pane "$DEV_PANE" " npm run start"
elif npm_script_exists "dev"; then
    run_in_pane "$DEV_PANE" " npm run dev"
else
    run_in_pane "$DEV_PANE" " echo 'Error: neither \"start\" nor \"dev\" npm script exists in package.json'"
fi

# --- storybook tab: stop whatever's running, cd, npm run storybook ---
STORYBOOK_PANE=$(pane_id_for_pos "$STORYBOOK_POS")
STORYBOOK_TITLE=$(title_for_pos "$STORYBOOK_POS")
if [[ "$STORYBOOK_TITLE" == npm* ]]; then
    zellij action send-keys --pane-id "$STORYBOOK_PANE" -- "Ctrl c"
    sleep 0.5
fi
run_in_pane "$STORYBOOK_PANE" " cd $PROJECT_DIR"
if npm_script_exists "storybook"; then
    run_in_pane "$STORYBOOK_PANE" " npm run storybook"
else
    run_in_pane "$STORYBOOK_PANE" " echo 'Error: \"storybook\" npm script does not exist in package.json'"
fi
