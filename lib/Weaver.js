const utils = require('./utils')

// TODO: Add "scrolling" as top priority.
// TODO: Try to fit within a constant number of milliseconds?

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

    let queue = null
    setTimeout(function flush() {
      do {
        queue = queues[++idx]
        if (!queue) return didFlush()
      } while (queue._empty())

      let n = 1, fn = null
      while (fn = queue.shift()) {
        fn.length ? (++n, fn(done)) : fn()
      }
      done()

      function done() {
        if (--n) return
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
