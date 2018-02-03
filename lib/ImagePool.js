const utils = require('./utils')
const noop = require('noop')

// Where image nodes are inserted into the DOM.
const container = document.createElement('div')
container.id = 'image-pool'
container.style.display = 'none'
document.body.appendChild(container)

function ImagePool(count) {
  return utils.pool(function(img, src, emit) {
    const task = this

    // Begin loading.
    img.src = src

    // Already cached?
    if (img.complete && img.naturalHeight) {
      return done({type: 'load'})
    }

    task.loading = true
    task.on('cancel', () => done({type: 'cancel'}))

    img.addEventListener('load', done)
    img.addEventListener('error', done)

    function done(evt) {
      task.loading = false
      task.cancel = noop

      img.removeEventListener('load', done)
      img.removeEventListener('error', done)

      if (evt.type != 'cancel') {
        emit('done', evt.type == 'load')
      }
    }
  }).fill(count || 10, function(i) {
    let img = new Image()
    img.style.display = 'none'
    container.appendChild(img)
    return img
  })
}

module.exports = ImagePool
