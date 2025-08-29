#!/usr/bin/env bash
set -euo pipefail

echo "Initializing and updating submodules..."
git submodule update --init --recursive

echo "Pulling latest for each submodule on its current branch..."
while IFS= read -r path; do
  echo "-- "
  (
    cd ""
    branch=cursor/check-loveable-dev-implementation-compatibility-4909
    git fetch --all
    git pull --ff-only origin "" || true
  )
done < <(git config --file .gitmodules --get-regexp path | awk {print
