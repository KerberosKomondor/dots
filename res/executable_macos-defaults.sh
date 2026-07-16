#!/bin/bash
# macOS system defaults tuned for the AeroSpace tiling WM setup.
# Re-run after a fresh install / macOS reset to reapply.

# Auto-hide the Dock with no delay and a fast slide, so AeroSpace can tile
# into the screen space the Dock would otherwise reserve.
defaults write com.apple.dock autohide -bool true
defaults write com.apple.dock autohide-delay -float 0
defaults write com.apple.dock autohide-time-modifier -float 0.15

killall Dock
