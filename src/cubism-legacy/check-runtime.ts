if (!('Live2D' in window)) {
  throw new Error(
    'Could not find Cubism 2 runtime. This plugin requires live2d.min.js to be loaded.'
  )
}
