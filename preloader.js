
const noop = require('noop')

// Preloader nodes are inserted here.
const container = document.createElement('div')
container.style.display = 'none'
document.body.appendChild(container)

// Image extensions
const imgRE = /\.(svg|png|jpe?g|gif)$/

function Preloader() {
  let items = {}
  let loading = []
  let nextItem = null
  let lastItem = null

  let loader
  return loader = {
    limit: 10,
    load(opts, asap) {
      if (typeof opts == 'string')  {
        opts = {url: opts}
      }
      let item = items[opts.url]
      if (!item || (asap && !isLoading(item))) {
        addItem(new Item(opts), asap)
      }
      return item
    },
    abort(url) {
      const item = items[url]
      if (item) {
        delete items[url]
        if (isLoading(item)) {
          return item.inst.abort()
        }
        if (item == nextItem) {
          nextItem = item.next
        } else {
          item.prev.next = item.next
        }
        if (item == lastItem) {
          lastItem = item.prev
        } else {
          item.next.prev = item.prev
        }
      }
    },
    clear() {
      loading.forEach(item => {
        item.inst.abort = noop
        item.destroy()
      })
      loading.length = 0
      nextItem = null
      lastItem = null
      items = {}
    }
  }

  function addItem(item, asap) {
    items[item.url] = item
    if (loading.length < loader.limit) {
      loadItem(item)
    } else if (nextItem) {
      if (asap) {
        item.next = nextItem
        item.next.prev = nextItem = item
      } else {
        item.prev = lastItem
        item.prev.next = lastItem = item
      }
    } else {
      nextItem = lastItem = item
    }
  }

  // Items with no `next` or `prev` are loading.
  function isLoading(item) {
    return !item.next && !item.prev
  }

  function loadItem(item) {
    const {inst} = item
    let {url, node} = inst

    // Temporary nodes are removed once loaded.
    const temp = !node
    const listener = (evt) => {
      inst.abort = noop
      if (temp) item.destroy()
      loading.splice(loading.indexOf(item), 1)
      if (inst.done) inst.done(evt.type == 'load')
      loadNext()
    }

    if (imgRE.test(url)) {
      if (temp) {
        inst.node = node = new Image()
      }
      node.src = url
      if (node.complete && node.naturalHeight) {
        inst.abort = noop
        if (inst.done) inst.done(true)
        return
      }
      node.addEventListener('load', listener)
      node.addEventListener('error', listener)
      item.destroy = destroyImage
      if (temp) {
        container.appendChild(node)
      }
    } else {
      throw Error('Cannot preload URL: ' + url)
    }

    inst.abort = () => {
      inst.abort = noop
      item.destroy()
      loading.splice(loading.indexOf(item), 1)
      loadNext()
    }

    loading.push(item)
  }

  function loadNext() {
    const item = nextItem
    if (item) {
      if (nextItem = item.next) {
        nextItem.prev = null
      } else {
        lastItem = null
      }
      item.next = null
      loadItem(item)
    }
  }

  function destroyImage() {
    const {node} = this.inst
    node.removeAttribute('src')
    container.removeChild(node)
  }
}

module.exports = new Preloader()

function Item(inst) {
  this.inst = inst
  this.prev = null
  this.next = null
}
