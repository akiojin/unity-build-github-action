#!/bin/bash

npm version $1
npm publish --access=public
git push
git push --tags
