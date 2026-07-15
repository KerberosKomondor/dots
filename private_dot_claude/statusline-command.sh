#!/usr/bin/env bash
# Claude Code status line - styled after the Dracula zsh theme

# Measure display width of a string, stripping ANSI codes first
display_width() {
    printf '%s' "$1" | sed 's/\x1B\[[0-9;]*[mK]//g' | wc -L
}

input=$(cat)

cwd=$(echo "$input" | jq -r '.cwd // .workspace.current_dir // ""')
dir=$(basename "$cwd")

# Model
model=$(echo "$input" | jq -r '.model.display_name // .model.id // "Claude"')

# Context window
ctx_pct=$(echo "$input" | jq -r '.context_window.used_percentage // 0' | awk '{printf "%d", $1}')
bar_filled=$(( ctx_pct * 20 / 100 ))
bar_empty=$(( 20 - bar_filled ))
bar=$(printf '%0.s▓' $(seq 1 $bar_filled 2>/dev/null))$(printf '%0.s░' $(seq 1 $bar_empty 2>/dev/null))
if [ "$ctx_pct" -ge 90 ]; then
    ctx_color='\033[31m'
elif [ "$ctx_pct" -ge 70 ]; then
    ctx_color='\033[33m'
else
    ctx_color='\033[32m'
fi
ctx_display=$(printf "${ctx_color}%s %d%%\033[0m" "$bar" "$ctx_pct")

# Cost
cost=$(echo "$input" | jq -r '.cost.total_cost_usd // 0' | awk '{printf "$%.4f", $1}')

# Git branch and status (skip optional locks for safety)
git_info=""
if git -C "$cwd" --no-optional-locks rev-parse --git-dir > /dev/null 2>&1; then
    branch=$(git -C "$cwd" --no-optional-locks symbolic-ref --quiet --short HEAD 2>/dev/null)
    if [ -z "$branch" ]; then
        branch=$(git -C "$cwd" --no-optional-locks rev-parse --short HEAD 2>/dev/null)
    fi
    if [ -n "$branch" ]; then
        git_status=$(LC_ALL=C git -C "$cwd" --no-optional-locks status 2>&1)
        if echo "$git_status" | grep -qE 'new file:|deleted:|modified:|renamed:|Untracked files:'; then
            git_info=$(printf '\033[36m(%s)\033[0m \033[33m✗\033[0m' "$branch")
        else
            git_info=$(printf '\033[36m(%s)\033[0m \033[32m✔\033[0m' "$branch")
        fi
    fi
fi

# Terminal width
cols=$(tput cols 2>/dev/null || echo 80)

# Left side
left_colored="$(printf '\033[32m➜\033[0m') $(printf '\033[34;1m%s\033[0m' "$dir")"
if [ -n "$git_info" ]; then
    left_colored="$left_colored $git_info"
fi

# Right side
right_colored="$(printf '\033[35m[%s]\033[0m' "$model") $ctx_display $(printf '\033[32m%s\033[0m' "$cost")"

# Padding using accurate display widths
left_len=$(display_width "$left_colored")
right_len=$(display_width "$right_colored")
pad=$(( cols - left_len - right_len ))
[ "$pad" -lt 1 ] && pad=1

printf '%s%*s%s\n' "$left_colored" "$pad" "" "$right_colored"
