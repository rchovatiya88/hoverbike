
/**
 * Component to handle camera positioning for models without camera nodes
 */
AFRAME.registerComponent('model-camera-fix', {
  schema: {
    cameraOffset: {type: 'vec3', default: {x: 0, y: 1.5, z: 0}}
  },

  init: function () {
    this.el.addEventListener('model-loaded', this.onModelLoaded.bind(this));
  },

  onModelLoaded: function (evt) {
    console.log('Model loaded, adjusting camera position');
    const cameraEl = this.el.querySelector('a-camera');
    if (cameraEl) {
      // Set camera position based on component data
      cameraEl.setAttribute('position', this.data.cameraOffset);
      console.log('Camera position set to:', this.data.cameraOffset);
    }
  }
});
