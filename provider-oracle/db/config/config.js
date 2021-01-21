require("dotenv").config()

const { DB_LOGGING } = process.env

const config = {
  development: {
    dialect: "sqlite",
    storage: 'provider-oracle/db/database.sqlite',
    logging: parseInt(DB_LOGGING, 10) === 1 ? console.log : false,
  },
  test: {
    dialect: "sqlite",
    storage: 'provider-oracle/db/database.sqlite',
    logging: parseInt(DB_LOGGING, 10) === 1 ? console.log : false,
  },
  production: {
    dialect: "sqlite",
    storage: 'provider-oracle/db/database.sqlite',
    logging: parseInt(DB_LOGGING, 10) === 1 ? console.log : false,
  },
}

module.exports = config
