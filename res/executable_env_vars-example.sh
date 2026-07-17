#!/bin/zsh

# used in .gitconfig
export BRANCHPREFIX="initials"

# used by https://github.com/ankitpokhrel/jira-cli
export JIRA_AUTH_TYPE="basic"
export JIRA_API_TOKEN="jira key"

# Atlassian API for attachment downloads
# Get token from: https://id.atlassian.com/manage-profile/security/api-tokens
export ATLASSIAN_CLOUD_ID="your-cloud-id-here"
export ATLASSIAN_EMAIL="your.email@example.com"
export ATLASSIAN_API_TOKEN="your-api-token-here"

# Unlock BitWarden once per login, cache session in runtime dir (tmpfs, cleared on logout)
# Run `bw login` first if not yet logged in
BW_SESSION_CACHE="${XDG_RUNTIME_DIR:-/tmp}/bw_session"
if [ -f "$BW_SESSION_CACHE" ]; then
  export BW_SESSION=$(cat "$BW_SESSION_CACHE")
fi
if ! bw status --session "$BW_SESSION" 2>/dev/null | grep -q '"status":"unlocked"'; then
  export BW_SESSION=$(bw unlock --raw)
  install -m 600 /dev/null "$BW_SESSION_CACHE"
  printf '%s' "$BW_SESSION" > "$BW_SESSION_CACHE"
fi

# Kerberos ticket for MSSQL Windows auth — prompt if expired
# Realm must match your AD domain (uppercase)
if ! klist -s 2>/dev/null; then
  kinit user@YOUR.DOMAIN.NET
fi
