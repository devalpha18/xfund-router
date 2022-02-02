FROM ubuntu:bionic

RUN \
  apt-get update && \
  apt-get upgrade -y && \
  apt-get install -y curl build-essential nano netcat git

ENV NVM_DIR /root/.nvm
ENV NODE_VERSION 12.18.3
ENV PATH=$PATH:/usr/local/go/bin:/root/.nvm/versions/node/v$NODE_VERSION/bin

# Install nvm, node, npm and yarn
RUN curl -sL https://raw.githubusercontent.com/creationix/nvm/v0.35.3/install.sh | bash && \
  . $NVM_DIR/nvm.sh && \
  nvm install $NODE_VERSION && \
  npm install --global yarn

RUN mkdir -p /root/xfund-router
WORKDIR /root/xfund-router

# first, copy only essential files required for compiling contracts
COPY ./contracts ./contracts/
COPY ./migrations ./migrations/
COPY ./package.json ./yarn.lock ./truffle-config.js ./

# install node dependencies & compile contracts
RUN yarn install --frozen-lockfile && \
    npx truffle compile

COPY ./docker/assets/init-dev-env.js ./docker/assets/request-data.js ./docker/assets/request.sh ./

EXPOSE 8545

# default cmd to set up Ganache, deploy contracts and run go test
CMD cd /root/xfund-router && \
    touch /root/xfund-router/log.txt && \
    npx ganache-cli --deterministic --networkId 696969 --accounts 20 -h 0.0.0.0 --blockTime 5 & \
    until nc -z 127.0.0.1 8545; do sleep 0.5; echo "wait for ganache"; done && \
    echo "deploying contracts, please wait..." && \
    npx truffle deploy --network=develop && \
    npx truffle exec init-dev-env.js --network=develop && \
    tail -f /root/xfund-router/log.txt
