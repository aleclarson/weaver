const Weaver = require('./lib/Weaver')

// The main weaver.
const main = Weaver()
module.exports = main

// High priority
const high = main.queue(1000)
high.name = 'weaver.high'
main.high = high.push

// Low priority
const low = main.queue(100)
low.name = 'weaver.low'
main.low = low.push
