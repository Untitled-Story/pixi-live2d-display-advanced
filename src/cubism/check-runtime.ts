if (typeof window === 'undefined' || !('Live2DCubismCore' in window)) {
  throw new Error(
    'Could not find Cubism runtime. This plugin requires live2dcubismcore.js to be loaded.'
  )
}
