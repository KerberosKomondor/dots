#!/usr/bin/env zsh

# Select project using fzf
PROJECT=$(ls -1 ~/code | fzf --prompt="Select project: " --height=100% --reverse)

if [ -n "$PROJECT" ]; then
    ~/res/zellij_change_project_dir.sh "$PROJECT"
else
    echo "No project selected"
    sleep 1
fi
