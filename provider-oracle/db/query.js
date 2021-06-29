const { Op } = require("sequelize")
const { Jobs } = require("./models")

const { REQUEST_STATUS } = require("../consts")

const getOpenJobs = async (currentHeight) => {
  return Jobs.findAll({
    where: {
      heightToFulfill: {
        [Op.lte]: currentHeight,
      },
      requestStatus: REQUEST_STATUS.REQUEST_STATUS_OPEN,
    },
  })
}

const getStuckJobs = async (currentHeight) => {
  const stuckHeight = currentHeight - 240 // approx 1 hour
  return Jobs.findAll({
    where: {
      heightToFulfill: {
        [Op.lte]: stuckHeight,
      },
      requestStatus: REQUEST_STATUS.REQUEST_STATUS_RECEIVED,
    },
  })
}

const getOpenOrStuckJobs = async (currentHeight) => {
  const stuckHeight = currentHeight - 240 // approx 1 hour

  return Jobs.findAll({
    where: {
      [Op.or]: [
        {
          heightToFulfill: {
            [Op.lte]: currentHeight,
          },
          requestStatus: REQUEST_STATUS.REQUEST_STATUS_OPEN,
        },
        {
          heightToFulfill: {
            [Op.lte]: stuckHeight,
          },
          requestStatus: REQUEST_STATUS.REQUEST_STATUS_RECEIVED,
        },
      ],
    },
  })
}

const getLastNJobsByAddress = async (count, address) => {
  const where = {
    requestStatus: REQUEST_STATUS.REQUEST_STATUS_FULFILLED,
  }

  if (address) {
    where.consumer = address
  }

  return Jobs.findAll({
    where,
    order: [["createdAt", "DESC"]],
    limit: count,
  })
}

module.exports = {
  getOpenJobs,
  getOpenOrStuckJobs,
  getStuckJobs,
  getLastNJobsByAddress,
}
