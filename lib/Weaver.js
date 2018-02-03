const utils = require('./utils')

// TODO: Add "scrolling" as top priority.
// TODO: Try to fit within a constant number of milliseconds?
// TODO: Stop processing a queue early if a higher priority queue has tasks?
// TODO: Add `serial` task method. Call it to prevent parallel task running while that task is running.

// Priority scheduler
function Weaver() {
  const queues = []
  function createQueue(priority) {
    const queue = utils.queue()
    queue.priority = priority

    const push = queue.push.bind(queue)
    queue.push = function(fn) {
      // Trigger a flush if necessary.
      if (idx < 0) flush()
      // We'll be called this cycle if the current priority is larger.
      // Otherwise, we'll need to flush again once finished.
      else if (queues[idx].priority <= priority) {
        willFlush = true
      }
      return push(fn)
    }

    // Find where this queue belongs in the sorted array.
    let i = 0, len = queues.length
    while (i < len && queues[i].priority >= priority) i++
    queues.splice(i, 0, queue)

    return queue
  }

  let flushing = false, idx = -1
  function flush() {
    if (flushing) return
    flushing = true

    setTimeout(function flush() {
      let queue = null; do {
        queue = queues[++idx]
        if (!queue) return didFlush()
      } while (queue._empty())

      if (__DEV__) {
        var timeout = setTimeout(() => {
          let msg = 'Flush timed out after 5 seconds'
          if (queue.name) msg += `.\nSomething in the "${queue.name}" queue never finished.`
          console.warn(msg)
        }, 5 * 1000)
      }

      let n = 1
      try {
        let fn = null
        while (fn = queue.shift()) {
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
        if (idx < queues.length - 1) {
          flush()
        } else didFlush()
      }
    })
  }

  let willFlush = false
  function didFlush() {
    flushing = false, idx = -1
    if (willFlush) {
      willFlush = false
      flush()
    }
  }

  return {
    queue: createQueue,
    queues,
    flush,
  }
}

module.exports = Weaver
