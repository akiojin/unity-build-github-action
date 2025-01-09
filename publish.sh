#!/bin/bash

if [ "$#" -ne 1 ] || [[ "$1" != "major" && "$1" != "minor" && "$1" != "patch" ]]; then
    echo "Usage:"
    echo " ./publish.sh <major/minor/patch>"
    echo "  or"
    echo " npm run release <major/minor/patch>"
    exit 1
fi

if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "Error: Environment variable GITHUB_TOKEN is not set."
  exit 1
fi

if ! npm run clean; then
    echo "Error: Failed to clean the project."
    exit 1
fi

if ! npm run build; then
    echo "Error: Failed to build the project."
    exit 1
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ "$BRANCH" != "develop" ]; then
    echo "Error: You must be on the develop branch to publish."
    exit 1
fi

if ! git pull; then
    echo "Error: Failed to pull the latest changes."
    exit 1
fi

VERSION=$(npm version $1 --no-git-tag-version)

git add package.json package-lock.json
git commit -m "bump: $VERSION"
git push --follow-tags

if ! gh pr create --base main --head develop --title "bump: $VERSION" --body "bump: $VERSION"; then
    echo "Error: Failed to create a pull request."
    exit 1
fi
