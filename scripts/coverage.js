#!/usr/bin/env node
require("dotenv").config()
const { runCoverage } = require("@openzeppelin/test-environment");

process.env['IS_COVERAGE'] = 1

async function main () {
  await runCoverage(
    [],
    "./node_modules/.bin/truffle compile",
    "./node_modules/.bin/mocha --exit --timeout 120000 --recursive".split(" "),
  )
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
