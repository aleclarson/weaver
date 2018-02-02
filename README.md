
# weaver v1.0.0

Priority-based task queues.

```js
// General task queue
const weaver = require('weaver')

// Animation queue
const flux = require('weaver/flux')

// These will run in order (after a short delay).
flux.high(() => console.log('flux high'))
weaver.high(() => console.log('weaver high'))
flux.low(() => console.log('flux low'))
weaver.low(() => console.log('weaver low'))

// Image loader
const pixi = require('weaver/pixi')

// Preload an image.
const task = pixi.load('/foo.svg')

// Abort loading.
task.cancel()
```

## Roadmap

- Write more tests... 👀
- `flux.scroll(true)` which puts all queues on hold

Questions and suggestions are encouraged! 🙂
