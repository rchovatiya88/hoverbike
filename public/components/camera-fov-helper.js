/* global AFRAME, THREE */

AFRAME.registerComponent('camera-fov-helper', {
  schema: {
    camera: { type: 'selector', default: '#camera' },
    enabled: { type: 'boolean', default: true },
    color: { type: 'color', default: '#00ffff' },
    opacity: { type: 'number', default: 0.2 },
    distance: { type: 'number', default: 10 }
  },
  
  init: function() {
    // Only continue if enabled
    if (!this.data.enabled) return;
    
    this.cameraEl = this.data.camera;
    if (!this.cameraEl) {
      console.warn('camera-fov-helper: No camera specified');
      return;
    }
    
    // Add toggle key
    this.onKeyDown = this.onKeyDown.bind(this);
    window.addEventListener('keydown', this.onKeyDown);
    
    // Wait for camera and scene to be fully initialized
    this.el.sceneEl.addEventListener('loaded', () => {
      setTimeout(() => {
        try {
          // Create helper for visualizing camera FOV
          this.createFOVHelper();
          console.log('Camera FOV helper initialized');
        } catch (e) {
          console.warn('Error initializing camera FOV helper:', e);
        }
      }, 1500); // Slightly longer delay to ensure camera is fully initialized
    });
  },
  
  createFOVHelper: function() {
    // Clean up existing helper if it exists
    if (this.fovHelper) {
      this.el.sceneEl.object3D.remove(this.fovHelper);
    }
    
    // Get the camera
    const camera = this.cameraEl.getObject3D('camera');
    if (!camera) {
      console.warn('camera-fov-helper: Camera object not found');
      return;
    }
    
    // Create a new helper
    this.fovHelper = new THREE.CameraHelper(camera);
    
    // Customize helper appearance
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(this.data.color),
      transparent: true,
      opacity: this.data.opacity,
      linewidth: 2
    });
    
    this.fovHelper.material = material;
    
    // Add to scene
    this.el.sceneEl.object3D.add(this.fovHelper);
    
    // Create frustum visualization
    this.createFrustumVisualization(camera);
  },
  
  createFrustumVisualization: function(camera) {
    // Calculate frustum dimensions at the specified distance
    const fov = camera.fov * (Math.PI / 180);
    const aspect = camera.aspect;
    const distance = this.data.distance;
    
    const height = 2 * Math.tan(fov / 2) * distance;
    const width = height * aspect;
    
    // Create the frustum visualization
    const geometry = new THREE.BufferGeometry();
    
    // Near plane corners
    const nearPlaneDistance = camera.near;
    const nearHeight = 2 * Math.tan(fov / 2) * nearPlaneDistance;
    const nearWidth = nearHeight * aspect;
    
    const nearTopLeft = new THREE.Vector3(-nearWidth/2, nearHeight/2, -nearPlaneDistance);
    const nearTopRight = new THREE.Vector3(nearWidth/2, nearHeight/2, -nearPlaneDistance);
    const nearBottomLeft = new THREE.Vector3(-nearWidth/2, -nearHeight/2, -nearPlaneDistance);
    const nearBottomRight = new THREE.Vector3(nearWidth/2, -nearHeight/2, -nearPlaneDistance);
    
    // Far plane corners at our specified distance
    const farTopLeft = new THREE.Vector3(-width/2, height/2, -distance);
    const farTopRight = new THREE.Vector3(width/2, height/2, -distance);
    const farBottomLeft = new THREE.Vector3(-width/2, -height/2, -distance);
    const farBottomRight = new THREE.Vector3(width/2, -height/2, -distance);
    
    // Lines connecting near and far planes
    const vertices = [
      // Near plane
      nearTopLeft, nearTopRight,
      nearTopRight, nearBottomRight,
      nearBottomRight, nearBottomLeft,
      nearBottomLeft, nearTopLeft,
      
      // Far plane
      farTopLeft, farTopRight,
      farTopRight, farBottomRight,
      farBottomRight, farBottomLeft,
      farBottomLeft, farTopLeft,
      
      // Connecting lines
      nearTopLeft, farTopLeft,
      nearTopRight, farTopRight,
      nearBottomRight, farBottomRight,
      nearBottomLeft, farBottomLeft
    ];
    
    // Convert vertices to positions array
    const positions = new Float32Array(vertices.length * 3);
    for (let i = 0; i < vertices.length; i++) {
      positions[i * 3] = vertices[i].x;
      positions[i * 3 + 1] = vertices[i].y;
      positions[i * 3 + 2] = vertices[i].z;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Create the frustum lines
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(this.data.color),
      transparent: true,
      opacity: this.data.opacity,
      linewidth: 2
    });
    
    this.frustumLines = new THREE.LineSegments(geometry, material);
    
    // Create a plane to visualize the far plane
    const planeGeometry = new THREE.PlaneGeometry(width, height);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.data.color),
      transparent: true,
      opacity: this.data.opacity * 0.5,
      side: THREE.DoubleSide
    });
    
    this.frustumPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    this.frustumPlane.position.z = -distance;
    
    // Create a group for all frustum visualizations
    this.frustumGroup = new THREE.Group();
    this.frustumGroup.add(this.frustumLines);
    this.frustumGroup.add(this.frustumPlane);
    
    // Add to camera
    this.cameraEl.object3D.add(this.frustumGroup);
  },
  
  updateFOVHelper: function() {
    if (this.fovHelper) {
      this.fovHelper.update();
    }
  },
  
  onKeyDown: function(e) {
    // Toggle FOV helper on/off with 'V' key
    if (e.key === 'v' || e.key === 'V') {
      this.toggleHelper();
    }
  },
  
  toggleHelper: function() {
    if (!this.fovHelper || !this.frustumGroup) return;
    
    this.fovHelper.visible = !this.fovHelper.visible;
    this.frustumGroup.visible = !this.frustumGroup.visible;
    
    console.log(`FOV helper visibility: ${this.fovHelper.visible}`);
  },
  
  tick: function() {
    if (this.data.enabled && this.fovHelper) {
      this.updateFOVHelper();
    }
  },
  
  remove: function() {
    // Clean up
    window.removeEventListener('keydown', this.onKeyDown);
    
    if (this.fovHelper) {
      this.el.sceneEl.object3D.remove(this.fovHelper);
    }
    
    if (this.frustumGroup && this.cameraEl) {
      this.cameraEl.object3D.remove(this.frustumGroup);
    }
  }
});