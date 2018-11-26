#!/bin/bash
source .travis.env.sh

echo Building k-seeder $VERSION with Krawler $KRAWLER_BRANCH

# Build seeder image
docker build --build-arg KRAWLER_BRANCH=$KRAWLER_BRANCH -f dockerfile -t kalisio/k-seeder .
docker tag kalisio/k-seeder kalisio/k-seeder:$VERSION

# Build the mapproxy-seed image
docker build -f dockerfile.mapproxy-seed -t kalisio/k-seeder-mapproxy-seed .
docker tag kalisio/k-seeder-mapproxy-seed kalisio/k-seeder:mapproxy-seed-$VERSION

# Push the built images to Docker hub
docker login -u="$DOCKER_USER" -p="$DOCKER_PASSWORD"
docker push kalisio/k-seeder:$VERSION
docker push kalisio/k-seeder:mapproxy-seed-$VERSION