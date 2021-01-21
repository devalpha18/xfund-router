require("dotenv").config()
const fetch = require("isomorphic-unfetch")
const { SupportedPairs, sequelize } = require("./db/models")

const { FINCHAINS_API_URL } = process.env

const deleteOld = async (newPairs) => {
  const dbPairsRes = await SupportedPairs.findAll()
  if(dbPairsRes) {
    for(let i = 0; i < dbPairsRes.length; i += 1) {
      const dbPair = dbPairsRes[i]
      let pairSupported = false
      for(let j = 0; j < newPairs.length; j += 1) {
        const newPair = newPairs[j]
        if(newPair.name === dbPair.name) {
          pairSupported = true
        }
      }
      if(!pairSupported) {
        console.log("delete no longer supported pair", dbPair.name, dbPair.id)
        await sequelize.query(
          `DELETE FROM "SupportedPairs" WHERE id = '${dbPair.id}'`,
        )
      }
    }
  }
  return
}

const updateSupportedPairs = async () => {
  const supportedPairsRes = await fetch(`${FINCHAINS_API_URL}/pairs`)
  const supportedPairs = await supportedPairsRes.json()

  await deleteOld(supportedPairs)

  for(let i = 0; i < supportedPairs.length; i += 1) {
    const name = supportedPairs[i].name
    const base = supportedPairs[i].base
    const target = supportedPairs[i].target

    await SupportedPairs.findOrCreate( {
      where: {
        name,
      },
      defaults: {
        name,
        base,
        target,
      },
    } )
  }
}

const getSupportedPairs = async () => {
  const dbPairsRes = await SupportedPairs.findAll()
  const pairs = []
  if(dbPairsRes) {
    for(let i = 0; i < dbPairsRes.length; i += 1) {
      const dbPair = dbPairsRes[i]
      const p = {
        name: dbPair.name,
        base: dbPair.base,
        target: dbPair.target,
      }
      pairs.push(p)
    }
  }
  return pairs
}

module.exports = {
  getSupportedPairs,
  updateSupportedPairs,
}
