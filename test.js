const tp = require('testpass')
const noop = require('noop')

const Weaver = require('./lib/Weaver')
const utils = require('./lib/utils')
const main = require('.')

global.__DEV__ = true

function delay(fn = noop, ms) {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      try {
        resolve(fn())
      } catch(e) {
        return reject(e)
      }
    }, ms)
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
  tp.test('flushing stops early if a higher priority queue is added to', (t) => {
    const calls = []
    main.low(() => {
      calls.push('low')
      main.high(() => calls.push('high'))
    })
    main.low(() => calls.push('low'))
    return delay(() => {
      t.eq(calls, ['low'])
      return delay(() => {
        t.eq(calls, ['low', 'high', 'low'])
      })
    })
  })
  tp.test('flushing won\'t stop early until all async functions are done', (t) => {
    const calls = []
    main.low(done => {
      calls.push('async low')
      setTimeout(done)
    })
    main.low(() => {
      calls.push('low')
      main.high(() => calls.push('high'))
    })
    return delay(() => {
      const expected = ['async low', 'low']
      t.eq(calls, expected)
      return delay(() => {
        t.eq(calls, expected)
        return delay(() => {
          expected.push('high')
          t.eq(calls, expected)
        })
      })
    })
  })
  tp.test('equal priority queues make nesting harder to predict', (t) => {
    const weaver = Weaver()
    const foo = weaver.queue(1)
    const bar = weaver.queue(1)

    // `x` tracks foo calls
    // `y` tracks bar calls
    let x = 0, y = 0

    // This won't run until the 2nd tick.
    bar.push(() => {
      y++
      // This causes the 2nd flush to stop early.
      foo.push(() => {
        // This won't run until the 3rd tick.
        x++
      })
    })

    // This runs during the 1st tick.
    foo.push(() => {
      x++
      // This causes the 1st flush to stop early.
      bar.push(() => {
        // This won't run until the 3rd tick.
        y++
      })
    })

    return delay(() => {
      t.eq(x, 1)
      t.eq(y, 0)
      return delay(() => {
        t.eq(x, 1)
        t.eq(y, 1)
        return delay(() => {
          t.eq(x, 2)
          t.eq(y, 2)
        })
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
