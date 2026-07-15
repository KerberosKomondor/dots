#!/bin/zsh

# USAGE:  . ./get_env_var.sh <VAR_NAME>
# This needs to be called as a dot space script
# https://stackoverflow.com/questions/496702/can-a-shell-script-set-environment-variables-of-the-calling-shell
#

if [[ $# -ne 1 ]]
then
  echo "requires one argument"
  return
fi

if [[ -v $1 ]]
then
  return
else
  ANS=""
  vared -cp "enter $1: " ANS
  export "$1=$ANS"
fi
