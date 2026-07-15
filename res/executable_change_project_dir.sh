#!/usr/bin/env zsh

# Commands should be prefixed with a space to skip being stored in zsh's history

# Get the current tmux session name
TMUX_SESSION=$(tmux display-message -p '#S')

# Check if project name was provided
if [ -z "$1" ]; then
    echo "Usage: $0 <project_name>"
    exit 1
fi

# Find matching directory (case insensitive)
INPUT_NAME="$1"
ACTUAL_DIR=$(find "$HOME/code" -maxdepth 1 -type d -iname "$INPUT_NAME" -print -quit)

if [ -z "$ACTUAL_DIR" ]; then
    echo "Error: No directory matching '$INPUT_NAME' found in ~/code"
    exit 1
fi

# Use the actual directory name
PROJECT_NAME=$(basename "$ACTUAL_DIR")
PROJECT_DIR="$ACTUAL_DIR"

# Function to check if nvim is running in a window
is_nvim_running() {
    local window=$1
    # Target pane 1 specifically (not the active pane which might be temporary)
    local cmd=$(tmux display-message -p -t "$TMUX_SESSION:$window.1" '#{pane_current_command}')
    [[ "$cmd" == "nvim" ]]
}

# Check for unsaved changes in nvim BEFORE making any changes
if is_nvim_running 1; then
    # Try graceful quit to test for unsaved changes
    tmux send-keys -t "$TMUX_SESSION:1.1" Escape
    sleep 0.2
    tmux send-keys -t "$TMUX_SESSION:1.1" ":qa" C-m
    sleep 0.5

    # If nvim is still running, there are unsaved changes
    if is_nvim_running 1; then
        # Reopen nvim since we tried to close it
        echo "Error: Window 1 has unsaved changes in nvim. Please save or discard changes before switching projects."
        exit 1
    fi
fi

# Function to check if an application is running (not just shell)
is_app_running() {
    local window=$1
    local cmd=$(tmux display-message -p -t "$TMUX_SESSION:$window" '#{pane_current_command}')
    # Return 0 (true) if something other than shell is running
    [[ "$cmd" != "zsh" && "$cmd" != "bash" && "$cmd" != "" ]]
}

# Function to safely close app if running
close_app_if_running() {
    local window=$1
    if is_app_running "$window"; then
        tmux send-keys -t "$TMUX_SESSION:$window" C-c
        sleep 0.5
    fi
}

# Function to check if npm script exists in package.json
npm_script_exists() {
    local script_name=$1
    local package_json="$PROJECT_DIR/package.json"

    if [ ! -f "$package_json" ]; then
        return 1
    fi

    # Check if the script exists in package.json
    grep -q "\"$script_name\":" "$package_json"
}

# Function to run npm script if it exists, otherwise show error
run_npm_script_if_exists() {
    local window=$1
    local script_name=$2

    if npm_script_exists "$script_name"; then
        tmux send-keys -t "$TMUX_SESSION:$window" " npm run $script_name" C-m
    else
        tmux send-keys -t "$TMUX_SESSION:$window" " echo 'Error: npm script \"$script_name\" does not exist in package.json'" C-m
    fi
}

# Function to run npm script with fallback options
# Usage: run_npm_script_with_fallback <window> <script1> <script2> ...
run_npm_script_with_fallback() {
    local window=$1
    shift  # Remove first argument (window), rest are script names

    for script_name in "$@"; do
        if npm_script_exists "$script_name"; then
            tmux send-keys -t "$TMUX_SESSION:$window" " npm run $script_name" C-m
            return 0
        fi
    done

    # None of the scripts exist
    tmux send-keys -t "$TMUX_SESSION:$window" " echo 'Error: None of the npm scripts ($*) exist in package.json'" C-m
    return 1
}

# Function to check if claude is running in a window
is_claude_running() {
    local window=$1
    local cmd=$(tmux display-message -p -t "$TMUX_SESSION:$window" '#{pane_current_command}')
    [[ "$cmd" == "claude" ]]
}

# Function to close claude if running
close_claude_if_running() {
    local window=$1
    if is_claude_running "$window"; then
        # Send multiple C-c to ensure claude exits
        tmux send-keys -t "$TMUX_SESSION:$window" C-c
        sleep 0.3
        tmux send-keys -t "$TMUX_SESSION:$window" C-c
        sleep 0.5

        # If still running after C-c attempts, send exit command
        if is_claude_running "$window"; then
            tmux send-keys -t "$TMUX_SESSION:$window" "/exit" C-m
            sleep 0.5
        fi

        # Wait until claude is no longer running
        local max_attempts=10
        local attempt=0
        while is_claude_running "$window" && [ $attempt -lt $max_attempts ]; do
            sleep 0.2
            ((attempt++))
        done
    fi
}

# Window 1: Rename, change directory, and start nvim
tmux rename-window -t "$TMUX_SESSION:1" "$PROJECT_NAME"
tmux send-keys -t "$TMUX_SESSION:1.1" " cd $PROJECT_DIR" C-m
tmux send-keys -t "$TMUX_SESSION:1.1" " nvim" C-m

# Window 2: Close claude if running, change directory, and start claude
close_claude_if_running 2
tmux send-keys -t "$TMUX_SESSION:2" " cd $PROJECT_DIR" C-m
tmux send-keys -t "$TMUX_SESSION:2" " claude" C-m

# Window 3: Close any running application, change directory, and run npm run start (or dev as fallback)
close_app_if_running 3
tmux send-keys -t "$TMUX_SESSION:3" " cd $PROJECT_DIR" C-m
run_npm_script_with_fallback 3 "start" "dev"

# Window 4: Close any running application, change directory, and run npm run storybook
close_app_if_running 4
tmux send-keys -t "$TMUX_SESSION:4" " cd $PROJECT_DIR" C-m
run_npm_script_if_exists 4 "storybook"
