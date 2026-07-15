#!/usr/bin/env zsh

# Small delay to ensure tmux is ready
sleep 0.5

# Select project using fzf
PROJECT=$(ls -1 ~/code | fzf --prompt="Select project: " --height=100% --reverse)

# Count panes in current window
PANE_COUNT=$(tmux list-panes | wc -l)

# If a project was selected, run the change script
if [ -n "$PROJECT" ]; then
    if [ "$PANE_COUNT" -gt 1 ]; then
        # In a split pane - we need to run the script in the background
        # and let this script exit cleanly to close the pane
        nohup ~/res/change_project_dir.sh "$PROJECT" > /dev/null 2>&1 &
        sleep 0.3
        tmux kill-pane
    else
        # In main pane, run directly and let it finish
        # change_project_dir.sh will handle starting nvim
        ~/res/change_project_dir.sh "$PROJECT"
    fi
else
    echo "No project selected"
    sleep 1
    if [ "$PANE_COUNT" -gt 1 ]; then
        tmux kill-pane
    fi
fi
