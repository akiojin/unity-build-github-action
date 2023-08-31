#!/bin/bash

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

git fetch --prune --prune-tags

for BRANCH in $(git for-each-ref --format '%(refname:short)' refs/heads/); do
  git switch $BRANCH
  git pull
done

git switch $CURRENT_BRANCH
