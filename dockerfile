FROM  node:8

LABEL maintainer="Kalisio <contact@kalisio.xyz>"

ARG KRAWLER_BRANCH
ENV KRAWLER_BRANCH=$KRAWLER_BRANCH

ENV DEBUG="krawler:hooks:docker"

RUN git clone https://github.com/kalisio/krawler.git -b $KRAWLER_BRANCH --single-branch && cd krawler && yarn install && yarn link && cd ..
RUN yarn link @kalisio/krawler
ENV NODE_PATH=/krawler/node_modules

COPY jobfile.js .
COPY seed.yaml .

CMD node ./krawler jobfile.js
