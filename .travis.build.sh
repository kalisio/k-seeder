#!/bin/bash
source .travis.env.sh

echo Building k-seeder $VERSION with Krawler $KRAWLER_BRANCH

# Build Stations image
docker build --build-arg KRAWLER_BRANCH=$KRAWLER_BRANCH -f dockerfile -t kalisio/k-seeder .
docker tag kalisio/k-seeder kalisio/k-seeder:$VERSION

# Push the built images to Docker hub
docker login -u="$DOCKER_USER" -p="$DOCKER_PASSWORD"
docker push kalisio/k-seeder:$VERSION
