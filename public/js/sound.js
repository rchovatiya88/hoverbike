
// Sound functionality disabled to prevent encoding errors
console.log('Sound system disabled');

// Empty sound system implementation
const SoundSystem = {
  init: function() {
    console.log('Sound system initialization bypassed');
  },
  playSound: function(soundName) {
    console.log(`Sound playback disabled: ${soundName}`);
  }
};

// Export empty sound system if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SoundSystem;
}
