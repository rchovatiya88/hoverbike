/* global THREE */

// This script initializes the DRACOLoader correctly

// Function to initialize the Draco decoder for glTF models
function initializeDracoDecoder() {
  console.log("Initializing Draco decoder");

  // Make sure THREE.GLTFLoader is available
  if (typeof THREE !== 'undefined' && THREE.GLTFLoader) {
    // Create a DRACOLoader instance
    const dracoLoader = new THREE.DRACOLoader();

    // Specify the path to the Draco decoder files
    // The path should be relative to the application's base URL
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.5/');

    // Optional: Pre-fetch the decoder to improve performance
    dracoLoader.preload();

    // Make the DRACOLoader available to the GLTFLoader
    if (THREE.GLTFLoader) {
      THREE.GLTFLoader.prototype.setDRACOLoader = function(loader) {
        this.dracoLoader = loader;
        return this;
      };

      // Create a dummy GLTFLoader to attach the dracoLoader
      const gltfLoader = new THREE.GLTFLoader();
      gltfLoader.setDRACOLoader(dracoLoader);

      console.log("DRACOLoader successfully initialized");
    } else {
      console.error("THREE.GLTFLoader not found");
    }
  } else {
    console.error("THREE.js or THREE.GLTFLoader not found");
  }
}

// Call the initialization function
window.addEventListener('load', initializeDracoDecoder);