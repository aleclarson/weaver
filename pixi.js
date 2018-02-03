const ImagePool = require('./lib/ImagePool')
const noop = require('noop')

const pool = ImagePool()
const tasks = Object.create(null)

exports.load = function(src, done) {
  let task = tasks[src]
  if (task) {
    task.reqs += 1
    if (done) task.on('done', done)
  }
  else {
    // Only cancel if no other consumer needs the image.
    tasks[src] = task = pool.run(src, () => {
      if (--task.reqs == 0) {
        delete tasks[src]
        return true
      }
    })

    // Track remaining consumers.
    task.reqs = 1

    // Remove from task cache once loaded or failed.
    task.on('done', (success) => {
      delete tasks[src]
      if (done) done(success)
    })
  }
  return task
}
