if (typeof window === 'undefined' || typeof window.Live2DCubismCore === 'undefined') {
  throw new Error(
    'Could not find Cubism runtime. This plugin requires live2dcubismcore.js to be loaded.'
  )
}
