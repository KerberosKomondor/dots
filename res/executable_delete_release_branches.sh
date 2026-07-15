#!/bin/zsh

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <number> Delete all branches less than or equal to this release number"
  exit 1
fi

limit=$1

echo "Deleting all branches with release/It.<number> less than or equal to $limit"

# Get all local branches matching release/It<number>
branches=($(git branch -a | grep 'remotes/origin/release' | sed 's/^[* ] //' | sed 's/remotes\/origin\/release\/It\.//g'))

for branch in $branches; do
  # Extract the number after release/It
  num=${branch##release/It}
  echo "branch: $branch, number: $num"
  if [[ ${num[1,3]} -le $limit ]]; then
    echo "Deleting branch: $branch"
    git push origin --delete release/It.$branch
  fi
done

git remote prune origin
