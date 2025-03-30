/* global AFRAME, THREE */

AFRAME.registerComponent('error-handler', {
  schema: {
    enabled: { type: 'boolean', default: true }
  },
  
  init: function() {
    if (!this.data.enabled) return;
    
    // Create UI for error messages
    this.createErrorUI();
    
    // Set up global error handler
    this.setupErrorHandler();
    
    // Delay component error handling setup until scene is loaded
    this.el.sceneEl.addEventListener('loaded', () => {
      // Give components time to register
      setTimeout(() => {
        this.setupComponentErrorHandling();
      }, 2000);
    });
    
    console.log('Error handler initialized');
  },
  
  createErrorUI: function() {
    // Create error overlay if it doesn't exist
    let errorOverlay = document.getElementById('error-overlay');
    
    if (!errorOverlay) {
      errorOverlay = document.createElement('div');
      errorOverlay.id = 'error-overlay';
      errorOverlay.style.cssText = `
        position: absolute;
        bottom: 60px;
        right: 20px;
        max-width: 400px;
        max-height: 200px;
        overflow-y: auto;
        background-color: rgba(255,0,0,0.7);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-family: monospace;
        z-index: 2000;
        border: 2px solid #f55;
        display: none;
      `;
      
      errorOverlay.innerHTML = `
        <div><strong>Error Information:</strong></div>
        <div id="error-message" style="margin-top: 5px;"></div>
        <div style="margin-top: 10px;">
          <button id="dismiss-error">Dismiss</button>
          <button id="reload-page">Reload Page</button>
        </div>
      `;
      
      document.body.appendChild(errorOverlay);
      
      // Add event listeners to buttons
      document.getElementById('dismiss-error').addEventListener('click', () => {
        errorOverlay.style.display = 'none';
      });
      
      document.getElementById('reload-page').addEventListener('click', () => {
        window.location.reload();
      });
    }
  },
  
  setupErrorHandler: function() {
    // Store original console.error
    this.originalConsoleError = console.error;
    
    // Catch and handle uncaught errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error || new Error(event.message), event.filename, event.lineno);
      // Prevent default browser error handling
      event.preventDefault();
    });
    
    // Catch and handle promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason || new Error('Unhandled Promise Rejection'), '', 0);
      // Prevent default browser error handling
      event.preventDefault();
    });
    
    // Override console.error
    console.error = (...args) => {
      this.originalConsoleError.apply(console, args);
      const errorMessage = args.map(arg => {
        if (arg instanceof Error) {
          return arg.message + '\n' + arg.stack;
        } else {
          return String(arg);
        }
      }).join(' ');
      this.showError(errorMessage);
    };
    
    // Set up component error handling
    this.setupComponentErrorHandling();
  },
  
  setupComponentErrorHandling() {
    // Only attempt to wrap methods if AFRAME is fully initialized
    if (!AFRAME || !AFRAME.components) {
      console.warn('Error handler: AFRAME.components not available yet');
      return;
    }
    
    // Wrap critical A-Frame component methods to catch errors
    const wrapComponentMethod = (componentName, methodName) => {
      if (!AFRAME.components[componentName]) {
        console.warn(`Error handler: Component ${componentName} not found`);
        return;
      }
      
      const originalMethod = AFRAME.components[componentName].prototype[methodName];
      if (!originalMethod) return;
      
      AFRAME.components[componentName].prototype[methodName] = function(...args) {
        try {
          return originalMethod.apply(this, args);
        } catch (e) {
          console.error(`Error in ${componentName}.${methodName}():`, e);
          // Continue execution to prevent A-Frame from breaking completely
          return null;
        }
      };
    };
    
    // List of components and methods to wrap
    const criticalComponents = [
      'enhanced-position-debug',
      'enhanced-camera-test',
      'camera-fov-helper',
      'control-mode-tester',
      'test-pattern-grid'
    ];
    
    const criticalMethods = [
      'init',
      'update',
      'tick',
      'remove'
    ];
    
    // Wrap all specified methods for all specified components
    criticalComponents.forEach(component => {
      criticalMethods.forEach(method => {
        wrapComponentMethod(component, method);
      });
    });
  },
  
  handleError: function(error, filename, lineNumber) {
    // Construct error message
    let errorMessage = error.message || String(error);
    
    // Add file information if available
    if (filename) {
      errorMessage += `\nFile: ${filename}`;
      if (lineNumber) {
        errorMessage += `:${lineNumber}`;
      }
    }
    
    // Add stack trace if available
    if (error.stack) {
      errorMessage += `\n\nStack Trace:\n${error.stack}`;
    }
    
    this.showError(errorMessage);
  },
  
  showError: function(errorMessage) {
    const errorOverlay = document.getElementById('error-overlay');
    const errorMessageEl = document.getElementById('error-message');
    
    if (errorOverlay && errorMessageEl) {
      errorMessageEl.textContent = errorMessage;
      errorOverlay.style.display = 'block';
      
      // Auto-hide after 10 seconds
      setTimeout(() => {
        errorOverlay.style.display = 'none';
      }, 10000);
    }
  }
});