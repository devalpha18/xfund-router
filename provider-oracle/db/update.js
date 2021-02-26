const { Jobs, LastGethBlock } = require("./models")

const { REQUEST_STATUS } = require("../consts")

const updateLastHeight = async (eventToGet, height) => {
  const [l, lCreated] = await LastGethBlock.findOrCreate({
    where: {
      event: eventToGet,
    },
    defaults: {
      event: eventToGet,
      height,
    },
  })

  if (!lCreated) {
    if (height > l.height) {
      await l.update({ height })
    }
  }
}

const updateJobComplete = async (id, fulfillTxHash, height, gasPayer) => {
  await Jobs.update(
    {
      requestStatus: REQUEST_STATUS.REQUEST_STATUS_FULFILLED,
      fulfillTxHash,
      requestCompleteHeight: height,
      gasPayer,
      statusReason: "fulfilled",
    },
    {
      where: {
        id,
      },
    },
  )
}

const updateJobCancelled = async (id, cancelTxHash, cancelHeight) => {
  await Jobs.update(
    {
      requestStatus: REQUEST_STATUS.REQUEST_STATUS_CANCELLED,
      cancelTxHash,
      cancelHeight,
      statusReason: "cancelled by consumer",
    },
    {
      where: {
        id,
      },
    },
  )
}

const updateJobRecieved = async (id) => {
  await Jobs.update(
    {
      requestStatus: REQUEST_STATUS.REQUEST_STATUS_RECEIVED,
      statusReason: "recieved",
    },
    {
      where: {
        id,
      },
    },
  )
}

const updateJobFulfilling = async (id, price, fulfillTxHash) => {
  await Jobs.update(
    {
      requestStatus: REQUEST_STATUS.REQUEST_STATUS_FULFILLING,
      price: price.toString(),
      fulfillTxHash,
      statusReason: "fulfilling",
    },
    {
      where: {
        id,
      },
    },
  )
}

const updateJobWithStatusReason = async (id, requestStatus, statusReason) => {
  await Jobs.update(
    {
      requestStatus,
      statusReason,
    },
    {
      where: {
        id,
      },
    },
  )
}

module.exports = {
  updateLastHeight,
  updateJobComplete,
  updateJobCancelled,
  updateJobRecieved,
  updateJobFulfilling,
  updateJobWithStatusReason,
}
