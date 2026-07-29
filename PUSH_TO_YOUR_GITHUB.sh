#!/usr/bin/env bash
# Creates intPrep on the GitHub account linked to YOUR local SSH key, then pushes.
# Run in Terminal (so you can enter the SSH passphrase):
#   cd /Users/shivamrohilla/Desktop/omnissa && bash PUSH_TO_YOUR_GITHUB.sh

set -euo pipefail
cd "$(dirname "$0")"

echo "1) Unlock SSH key (enter passphrase if asked)..."
eval "$(ssh-agent -s)" >/dev/null
ssh-add --apple-use-keychain ~/.ssh/id_ed25519 2>/dev/null || ssh-add ~/.ssh/id_ed25519

echo "2) Detect GitHub account for this key..."
SSH_OUT="$(ssh -T git@github.com 2>&1 || true)"
echo "$SSH_OUT"
USER="$(echo "$SSH_OUT" | sed -n 's/.*Hi \([^!]*\)!.*/\1/p')"
if [[ -z "$USER" ]]; then
  echo "ERROR: SSH still not authenticated. Add this machine's key to the GitHub account you want, then retry."
  exit 1
fi
echo "Using GitHub user: $USER"

REPO="intPrep"
REMOTE="git@github.com:${USER}/${REPO}.git"

echo "3) Create repo if missing (needs 'gh' OR create manually once)..."
if command -v gh >/dev/null 2>&1; then
  gh repo create "$REPO" --public --source=. --remote=origin --push 2>/dev/null \
    || {
      git remote remove origin 2>/dev/null || true
      git remote add origin "$REMOTE"
      # repo may already exist
      git push -u origin main
    }
else
  echo "gh not installed — create an EMPTY public repo named '$REPO' under https://github.com/$USER"
  echo "Opening browser create page..."
  open "https://github.com/new?name=${REPO}&description=Frontend+interview+prep&visibility=public" || true
  read -r -p "After the empty repo exists on GitHub, press Enter to push..."
  git remote remove origin 2>/dev/null || true
  git remote add origin "$REMOTE"
  git push -u origin main
fi

echo "Done → https://github.com/${USER}/${REPO}"
