
/**
 * Draco decoder utility for A-Frame
 * This utility helps set up Draco compression for glTF models
 */

// Only setup if DRACOLoader exists
if (typeof THREE !== 'undefined' && THREE.DRACOLoader) {
  // Initialize the Draco loader globally
  const dracoLoader = new THREE.DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

  // Configure A-Frame to use Draco for all glTF models
  if (THREE.GLTFLoader) {
    THREE.GLTFLoader.prototype.setDRACOLoader(dracoLoader);
  }

  // Register draco-model component only if not already registered
  if (!AFRAME.components['draco-model']) {
    AFRAME.registerComponent('draco-model', {
      schema: {
        src: {type: 'asset'},
        crossOrigin: {default: ''},
      },

      init: function () {
        this.model = null;
        this.loader = new THREE.GLTFLoader();
        
        // Set up Draco loader
        this.loader.setDRACOLoader(dracoLoader);
        
        this.onError = this.onError.bind(this);
      },

      update: function () {
        const data = this.data;
        if (!data.src) return;

        this.remove();
        
        if (data.crossOrigin) this.loader.setCrossOrigin(data.crossOrigin);
        
        this.loader.load(
          data.src, 
          gltf => this.load(gltf), 
          undefined, 
          this.onError
        );
      },

      load: function (gltfModel) {
        const el = this.el;
        this.model = gltfModel.scene || gltfModel.scenes[0];
        this.model.animations = gltfModel.animations;
        
        el.setObject3D('mesh', this.model);
        el.emit('model-loaded', {format: 'gltf', model: this.model});
      },

      onError: function (error) {
        console.error('Error loading Draco-compressed glTF model:', error);
        this.el.emit('model-error', {src: this.data.src, error: error});
      },

      remove: function () {
        if (!this.model) return;
        this.el.removeObject3D('mesh');
        this.model = null;
      }
    });
  }
}
