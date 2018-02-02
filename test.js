const tp = require('testpass')
const noop = require('noop')

const Weaver = require('./lib/Weaver')
const utils = require('./lib/utils')
const main = require('.')

function delay(fn = noop) {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      try {fn(), resolve()}
      catch(e) {
        return reject(e)
      }
    })
  );
}

tp.group('queues:', (t) => {
  tp.test('highest priority queues are flushed first', (t) => {
    const calls = []
    main.low(() => calls.push('low'))
    main.high(() => calls.push('high'))
    return delay(() => {
      t.eq(calls, ['high', 'low'])
    })
  })
  tp.test('nesting within equal priority queues is unsafe', (t) => {
    const weaver = Weaver()
    const foo = weaver.queue(1)
    const bar = weaver.queue(1)

    // If the queues are added to in the order they were created,
    // the nested function is called during the same cycle.
    let x = 0
    foo.push(() => {
      x++
      bar.push(() => x++)
    })

    // Otherwise, the nested function is called in the next cycle.
    let y = 0
    bar.push(() => {
      y++
      foo.push(() => y++)
    })

    return delay(() => {
      t.eq(x, 2)
      t.eq(y, 1)
      return delay(() => {
        t.eq(y, 2)
      })
    })
  })
})

tp.group('pools:', () => {

  tp.test('take from top of pool', (t) => {
    const pool = utils.pool()
    pool.fill(2, (i) => i + 1)
    pool.get(i => t.eq(i, 2))
  })

  tp.test('calls are synchronous unless pool is empty', (t) => {
    const pool = utils.pool()
    pool.fill(1, noop.arg1)

    let called = false
    pool.get((i, done) => called = true)
    t.eq(called, true)

    called = false
    pool.get(i => called = true)
    t.eq(called, false)
  })

  tp.test('a queue item is returned if the pool is empty', (t) => {
    const pool = utils.pool().fill(0, noop)
    const item = pool.get(noop)
    t.eq(item.value, noop)
  })
})

tp.group('task pools:', () => {
  tp.test('tasks must emit "done"', (t) => {
    let pool = utils.pool(noop)
    pool.fill(1, noop.arg1)

    let called = false
    pool.run().on('done', () => called = true)
    delay(() => {
      t.eq(called, false)
    })

    pool = utils.pool((i, j, emit) => {
      emit('done', i, j)
    }).fill(1, noop.arg1)

    called = false
    pool.run(10).on('done', (i, j) => {
      called = true
      t.eq(i, 0)
      t.eq(j, 10)
    })
    return delay(() => {
      t.eq(called, true)
    })
  })
})
