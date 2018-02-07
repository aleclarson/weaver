const noop = require('noop')

// TODO: Provide a way to hoist a queued task to run asap?
module.exports = {
  task,
  queue,
  pool,
}

// Task creator
function task(runner) {
  if (typeof runner != 'function')
    throw TypeError('Expected a function')

  return function(props, cancel) {
    if (!cancel) cancel = noop.true
    else if (typeof cancel != 'function')
      throw TypeError('Expected a function')

    const task = {
      on(event, fn) {
        if (typeof fn != 'function')
          throw TypeError('Expected a function')

        const queue = events[event]
        if (queue) queue.push(fn)
        else events[event] = [fn]
        return this
      },
      cancel() {
        cancel() && (this.cancel = noop, emit('cancel'))
      }
    }

    const events = {}
    function emit(event, arg1, arg2, arg3) {
      const queue = events[event]
      queue && setTimeout(() =>
        queue.forEach(fn => fn(arg1, arg2, arg3)))
    }

    runner.call(task, props, emit)
    return task
  }
}

// Queue creator
function queue() {
  let first = null, last = null
  return {
    _empty() {
      return !first
    },
    push(value) {
      const item = {value, next: null}
      if (last) {
        last.next = item
        last = item
      } else {
        first = last = item
      }
      return item
    },
    shift() {
      let item = first
      while (item) {
        // Find the first item with a value.
        if (item.value === null) {
          item = item.next
        } else {
          first = item.next
          if (last == item) {
            last = null
          }
          return item.value
        }
      }
    },
    flush(iterator, ctx) {
      let i = 0, item = first, result
      while (item) {
        if (item.value !== null)
          result = iterator.call(ctx, item.value, i++)
        item = item.next

        // Return false to stop flushing.
        if (result === false) {
          first = item
          return
        }
      }
      first = null
      last = null
    }
  }
}

// Pool creator
function pool(runner) {
  let pool = null
  function fill(count, filler) {
    pool = new Array(count)
    for (let i = 0; i < count; i++) {
      pool[i] = filler(i)
    }
    return this
  }

  // The request queue prevents overdrafting.
  const requests = queue()
  function request(fn) {
    if (typeof fn != 'function')
      throw TypeError('Expected a function')

    if (!pool) throw Error('Pool must be filled')
    return pool.length ?
      loan(fn, pool.pop()) :
      requests.push(fn)
  }
  function loan(fn, value) {
    let next
    if (fn.length > 1) {
      let done = false
      fn(value, function() {
        if (!done) {
          done = true
          if (next = requests.shift()) {
            loan(next, value)
          } else pool.push(value)
        }
      })
    } else {
      fn(value)
      if (next = requests.shift()) {
        loan(next, value)
      } else pool.push(value)
    }
  }

  // This pool runs a task on its values.
  if (runner) {
    if (typeof runner != 'function')
      throw TypeError('Expected a function')

    return {
      fill,
      run: task(function(props, emit) {
        const item = request((value, done) => {
          this.on('done', done)
          runner.call(this, value, props, emit)
        })
        // If the request was queued, `cancel` should dequeue.
        if (item) this.on('cancel', () => {item.value = null})
      })
    }
  }

  // This pool simply stores its values.
  return {fill, get: request}
}
