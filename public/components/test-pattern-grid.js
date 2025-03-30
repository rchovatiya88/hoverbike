/* global AFRAME, THREE */

AFRAME.registerComponent('test-pattern-grid', {
  schema: {
    enabled: { type: 'boolean', default: true },
    size: { type: 'number', default: 100 },
    divisions: { type: 'number', default: 20 },
    centerMarkerSize: { type: 'number', default: 5 },
    gridHeight: { type: 'number', default: 0.05 },
    colorCenterX: { type: 'color', default: '#ff0000' },
    colorCenterZ: { type: 'color', default: '#0000ff' },
    colorGrid: { type: 'color', default: '#888888' },
    showAxes: { type: 'boolean', default: true },
    showCardinalMarkers: { type: 'boolean', default: true }
  },
  
  init: function() {
    // Initialize with default visibility off
    this.isVisible = false;
    
    if (!this.data.enabled) return;
    
    // Add key handler for toggling test pattern
    this.onKeyDown = this.onKeyDown.bind(this);
    window.addEventListener('keydown', this.onKeyDown);
    
    // Create parent group for the grid
    this.gridGroup = new THREE.Group();
    if (this.gridGroup) {
      this.gridGroup.visible = false;
      this.el.sceneEl.object3D.add(this.gridGroup);
    }
    
    // Delay grid creation until scene is loaded
    const setupGrid = () => {
      setTimeout(() => {
        try {
          // Create grid and position helpers
          this.createGrid();
          
          if (this.data.showAxes) {
            this.createAxes();
          }
          
          if (this.data.showCardinalMarkers) {
            this.createCardinalMarkers();
          }
          
          console.log('Test pattern grid initialized');
        } catch (e) {
          console.error('Error initializing test pattern grid:', e);
        }
      }, 2000);
    };
    
    if (this.el.sceneEl.hasLoaded) {
      setupGrid();
    } else {
      this.el.sceneEl.addEventListener('loaded', setupGrid);
    }
  },
  
  createGrid: function() {
    // Check if we already have a grid group
    if (!this.gridGroup) {
      console.warn('Grid group not initialized, creating a new one');
      this.gridGroup = new THREE.Group();
      this.el.sceneEl.object3D.add(this.gridGroup);
    }
    
    // Create main grid
    const gridHelper = new THREE.GridHelper(
      this.data.size, 
      this.data.divisions,
      new THREE.Color(this.data.colorGrid),
      new THREE.Color(this.data.colorGrid)
    );
    gridHelper.position.y = this.data.gridHeight;
    
    // Create colored centerlines
    const halfSize = this.data.size / 2;
    
    // X center line (red)
    const xCenterGeometry = new THREE.BufferGeometry();
    const xCenterVertices = new Float32Array([
      -halfSize, this.data.gridHeight, 0,
      halfSize, this.data.gridHeight, 0
    ]);
    xCenterGeometry.setAttribute('position', new THREE.BufferAttribute(xCenterVertices, 3));
    const xCenterMaterial = new THREE.LineBasicMaterial({ color: this.data.colorCenterX, linewidth: 2 });
    const xCenterLine = new THREE.Line(xCenterGeometry, xCenterMaterial);
    
    // Z center line (blue)
    const zCenterGeometry = new THREE.BufferGeometry();
    const zCenterVertices = new Float32Array([
      0, this.data.gridHeight, -halfSize,
      0, this.data.gridHeight, halfSize
    ]);
    zCenterGeometry.setAttribute('position', new THREE.BufferAttribute(zCenterVertices, 3));
    const zCenterMaterial = new THREE.LineBasicMaterial({ color: this.data.colorCenterZ, linewidth: 2 });
    const zCenterLine = new THREE.Line(zCenterGeometry, zCenterMaterial);
    
    // Center marker
    const centerMarkerGeometry = new THREE.PlaneGeometry(
      this.data.centerMarkerSize, 
      this.data.centerMarkerSize
    );
    const centerMarkerMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffffff,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    const centerMarker = new THREE.Mesh(centerMarkerGeometry, centerMarkerMaterial);
    centerMarker.rotation.x = Math.PI / 2;
    centerMarker.position.y = this.data.gridHeight + 0.01;
    
    // Add distance markers every 10 units
    const textMarkers = new THREE.Group();
    const markerStep = 10; // Place a marker every 10 units
    
    for (let x = -halfSize; x <= halfSize; x += markerStep) {
      if (x === 0) continue; // Skip center which already has colored lines
      
      for (let z = -halfSize; z <= halfSize; z += markerStep) {
        if (z === 0) continue; // Skip center which already has colored lines
        
        // Create distance text
        const distance = Math.sqrt(x * x + z * z).toFixed(1);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 64;
        
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.font = '24px Arial';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(`(${x}, ${z})`, canvas.width / 2, canvas.height / 3);
        context.fillText(`${distance}m`, canvas.width / 2, canvas.height * 2/3);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide
        });
        
        const geometry = new THREE.PlaneGeometry(4, 2);
        const textMesh = new THREE.Mesh(geometry, material);
        textMesh.position.set(x, this.data.gridHeight + 0.1, z);
        textMesh.rotation.x = -Math.PI / 2;
        
        textMarkers.add(textMesh);
      }
    }
    
    // Add all elements to grid group
    this.gridGroup.add(gridHelper);
    this.gridGroup.add(xCenterLine);
    this.gridGroup.add(zCenterLine);
    this.gridGroup.add(centerMarker);
    this.gridGroup.add(textMarkers);
    
    // Add grid group to scene
    this.el.sceneEl.object3D.add(this.gridGroup);
  },
  
  createAxes: function() {
    // Create larger axes helpers
    const axisLength = this.data.size / 2;
    const axisWidth = 0.2;
    
    // X axis (red)
    const xAxisGeometry = new THREE.BoxGeometry(axisLength, axisWidth, axisWidth);
    const xAxisMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const xAxis = new THREE.Mesh(xAxisGeometry, xAxisMaterial);
    xAxis.position.set(axisLength / 2, this.data.gridHeight + 0.5, 0);
    
    // Y axis (green)
    const yAxisGeometry = new THREE.BoxGeometry(axisWidth, axisLength, axisWidth);
    const yAxisMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const yAxis = new THREE.Mesh(yAxisGeometry, yAxisMaterial);
    yAxis.position.set(0, axisLength / 2, 0);
    
    // Z axis (blue)
    const zAxisGeometry = new THREE.BoxGeometry(axisWidth, axisWidth, axisLength);
    const zAxisMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const zAxis = new THREE.Mesh(zAxisGeometry, zAxisMaterial);
    zAxis.position.set(0, this.data.gridHeight + 0.5, axisLength / 2);
    
    // Add axis labels
    const createAxisLabel = (text, position, color) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 128;
      canvas.height = 64;
      
      context.fillStyle = 'rgba(0, 0, 0, 0.7)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      context.font = '48px Arial';
      context.fillStyle = color;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, canvas.width / 2, canvas.height / 2);
      
      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
      });
      
      const geometry = new THREE.PlaneGeometry(2, 1);
      const textMesh = new THREE.Mesh(geometry, material);
      textMesh.position.copy(position);
      
      return textMesh;
    };
    
    const xLabel = createAxisLabel('X', new THREE.Vector3(axisLength + 2, 1, 0), '#ff0000');
    const yLabel = createAxisLabel('Y', new THREE.Vector3(0, axisLength + 2, 0), '#00ff00');
    const zLabel = createAxisLabel('Z', new THREE.Vector3(0, 1, axisLength + 2), '#0000ff');
    
    // Look at origin
    xLabel.lookAt(0, xLabel.position.y, 0);
    yLabel.lookAt(0, 0, 0);
    zLabel.lookAt(0, zLabel.position.y, 0);
    
    // Add to grid group
    this.gridGroup.add(xAxis);
    this.gridGroup.add(yAxis);
    this.gridGroup.add(zAxis);
    this.gridGroup.add(xLabel);
    this.gridGroup.add(yLabel);
    this.gridGroup.add(zLabel);
  },
  
  createCardinalMarkers: function() {
    const halfSize = this.data.size / 2;
    const cardinalPoints = [
      { direction: 'N', position: new THREE.Vector3(0, 0, -halfSize), rotation: 0 },
      { direction: 'S', position: new THREE.Vector3(0, 0, halfSize), rotation: Math.PI },
      { direction: 'E', position: new THREE.Vector3(halfSize, 0, 0), rotation: Math.PI / 2 },
      { direction: 'W', position: new THREE.Vector3(-halfSize, 0, 0), rotation: -Math.PI / 2 },
      { direction: 'NE', position: new THREE.Vector3(halfSize, 0, -halfSize), rotation: Math.PI / 4 },
      { direction: 'NW', position: new THREE.Vector3(-halfSize, 0, -halfSize), rotation: -Math.PI / 4 },
      { direction: 'SE', position: new THREE.Vector3(halfSize, 0, halfSize), rotation: 3 * Math.PI / 4 },
      { direction: 'SW', position: new THREE.Vector3(-halfSize, 0, halfSize), rotation: -3 * Math.PI / 4 }
    ];
    
    const cardinalGroup = new THREE.Group();
    
    cardinalPoints.forEach(point => {
      // Create text canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 128;
      canvas.height = 128;
      
      context.fillStyle = 'rgba(0, 0, 0, 0.7)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      context.font = '64px Arial';
      context.fillStyle = 'white';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(point.direction, canvas.width / 2, canvas.height / 2);
      
      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
      });
      
      const geometry = new THREE.PlaneGeometry(5, 5);
      const marker = new THREE.Mesh(geometry, material);
      
      // Position and rotate marker
      marker.position.copy(point.position);
      marker.position.y = this.data.gridHeight + 5; // Raise it up
      marker.rotation.y = point.rotation;
      marker.rotation.x = -Math.PI / 2; // Lay flat
      
      cardinalGroup.add(marker);
    });
    
    this.gridGroup.add(cardinalGroup);
  },
  
  onKeyDown: function(e) {
    // Toggle grid visibility with G key
    if (e.key === 'g' || e.key === 'G') {
      this.toggleGrid();
    }
  },
  
  toggleGrid: function() {
    if (!this.gridGroup) {
      console.warn('Cannot toggle grid: Grid group not initialized');
      return;
    }
    
    this.isVisible = !this.isVisible;
    this.gridGroup.visible = this.isVisible;
    
    console.log(`Grid visibility: ${this.isVisible}`);
  },
  
  remove: function() {
    // Clean up
    window.removeEventListener('keydown', this.onKeyDown);
    
    if (this.gridGroup && this.el.sceneEl) {
      this.el.sceneEl.object3D.remove(this.gridGroup);
    }
  }
});