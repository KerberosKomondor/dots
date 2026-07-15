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

# Unlock BitWarden and export session (skip if already unlocked)
# Run `bw login` first if not yet logged in
if ! bw status 2>/dev/null | grep -q '"status":"unlocked"'; then
  export BW_SESSION=$(bw unlock --raw)
fi

# Kerberos ticket for MSSQL Windows auth — prompt if expired
# Realm must match your AD domain (uppercase)
if ! klist -s 2>/dev/null; then
  kinit user@YOUR.DOMAIN.NET
fi
