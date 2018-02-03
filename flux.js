const main = require('./index')

// High priority
const high = main.queue(2000)
high.name = 'flux.high'
exports.high = high.push

// Low priority
const low = main.queue(200)
low.name = 'flux.low'
exports.low = low.push
