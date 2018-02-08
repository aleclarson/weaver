const utils = require('./utils')

// Priority scheduler
function Weaver() {
  let flushing = false, idx = -1

  const queues = []
  function createQueue(priority) {
    const queue = utils.queue()
    queue.priority = priority

    const push = queue.push.bind(queue)
    queue.push = function(fn) {
      // Trigger a flush if necessary.
      if (idx < 0) flushAsync()
      // The given function is called during the current flush
      // if the current queue has larger priority. Otherwise, we
      // need to tell the flush to stop early and restart.
      else if (queues[idx].priority <= priority) {
        flushing = false, idx = -1
      }
      return push(fn)
    }

    // Find where this queue belongs in the sorted array.
    let i = 0, len = queues.length
    while (i < len && queues[i].priority >= priority) i++
    queues.splice(i, 0, queue)

    return queue
  }

  function flushAsync() {
    if (flushing) return
    flushing = true

    setTimeout(function flush() {
      let queue = null; do {
        queue = queues[++idx]
        if (!queue) {
          // All queues are empty.
          return flushing = false, idx = -1
        }
      } while (queue._empty())

      if (__DEV__) {
        var timeout = setTimeout(() => {
          let msg = 'Flush timed out after 10 seconds'
          if (queue.name) msg += `.\nSomething in the "${queue.name}" queue never finished.`
          console.warn(msg)
        }, 1e4)
      }

      let n = 1
      try {
        let fn = null
        while (flushing && (fn = queue.shift())) {
          fn.length ? (++n, fn(done)) : fn()
        }
      } catch(e) {
        console.error(e)
      } finally {
        done()
      }

      function done() {
        if (--n) return
        if (__DEV__) clearTimeout(timeout)
        flushing ? flush() : flushAsync()
      }
    })
  }

  return {
    flush: flushAsync,
    queue: createQueue,
    queues,
  }
}

module.exports = Weaver
