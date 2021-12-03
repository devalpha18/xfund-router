#!/bin/bash

BASE=${1:-"ETH"}
TARGET=${2:-"GBP"}
QTYPE=${3:-"PR"}
STYPE=${4:-"AVC"}
QTIME=${5:-"24H"}

cd /root/xfund-router
npx truffle exec request-data.js "${BASE}" "${TARGET}" "${QTYPE}" "${STYPE}" "${QTIME}" --network develop
