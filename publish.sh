#!/bin/bash

if [ "$#" -ne 1 ] || [[ "$1" != "major" && "$1" != "minor" && "$1" != "patch" && "$1" != "prerelease" ]]; then
  echo "Usage:"
  echo " ./publis.sh <major/minor/patch/prerelease>"
  echo "  or"
  echo " npm run release <major/minor/patch>"
  echo "  or"
  echo " npm run pre-release"
  exit 1
fi

echo -n "Do you want to continue the update process? (Y/N): "
read -n 1 ANSWER
echo ""

if [ "$ANSWER" != "Y" ] && [ "$ANSWER" != "y" ]; then
  echo "Update process canceled."
  exit 1
fi

npm run clean
npm run build

STATUS=$(git status --porcelain)

if [ -n "$STATUS" ]; then
  echo "Error: There are uncommitted files. Please commit them first."
  exit 1
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ "$1" != "prerelease" ]; then
  if [ "$BRANCH" != "develop" ]; then
    echo "Error: You must be on the develop branch to publish."
    exit 1
  fi

  VERSION=$(npm version $1 --no-git-tag-version)
else
  if [ "$BRANCH" == "main" ] || [ "$BRANCH" == "develop" ]; then
    echo "Error: prerlease must be outside the main or develop branch."
    exit 1
  fi

  VERSION=$(npm version prerelease --preid rc)
fi

git pull
git add package.json package-lock.json
git commit -m "bump: $VERSION"
git push --follow-tags

if [ "$1" != "prerelease" ]; then
  gh pr create --base main --head develop --title "bump: $VERSION" --body "bump: $VERSION"
fi
