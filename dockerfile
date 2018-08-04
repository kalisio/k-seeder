FROM  node:8

MAINTAINER Kalisio <contact@kalisio.com>

ENV DEBUG=

WORKDIR /opt/k-seeder
COPY . /opt/k-seeder

RUN yarn install

ENTRYPOINT ['/bin/bash']

