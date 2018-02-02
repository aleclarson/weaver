const main = require('.')

// High priority
const high = main.queue(2000)
exports.high = high.push

// Low priority
const low = main.queue(200)
exports.low = low.push
