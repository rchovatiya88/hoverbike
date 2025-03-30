# Hoverbike Camera and Player Position Testing Guide

This guide provides an overview of the camera and player position testing tools implemented in the hoverbike project. These tools were designed to help diagnose and fix issues related to camera positioning, player movement, and spatial orientation.

## Available Testing Tools

The following testing components have been added to the project:

1. **Enhanced Camera Test** (`enhanced-camera-test.js`)
   - Provides predefined test positions for camera and player
   - Tests different orientations relative to the environment
   - Includes an animated camera test

2. **Enhanced Position Debug** (`enhanced-position-debug.js`)
   - Displays detailed position and rotation information
   - Shows distance to ground and walls
   - Visualizes player trajectory
   - Provides additional debug UI elements

3. **Camera FOV Helper** (`camera-fov-helper.js`)
   - Visualizes camera field of view
   - Helps understand what the camera can see
   - Useful for diagnosing visibility issues

4. **Control Mode Tester** (`control-mode-tester.js`)
   - Tests different camera follow behaviors
   - Modifies player movement parameters
   - Includes modes like "racing", "cinematic", etc.

5. **Test Pattern Grid** (`test-pattern-grid.js`)
   - Creates a reference grid with measurements
   - Shows cardinal directions (N, S, E, W)
   - Includes axis visualization

## Keyboard Controls

| Key | Function |
|-----|----------|
| 1-8 | Apply different camera position tests |
| N | Test North Wall orientation |
| F1-F6 | Test different control modes |
| M | Show/hide control modes UI |
| V | Show/hide camera FOV visualization |
| G | Show/hide test pattern grid |
| R | Reset player and camera position |

## Test Scenarios

### Basic Camera Position Tests

1. **North Wall Test (Key: N)**
   - Positions player facing north wall (blue)
   - Camera positioned behind player
   - Tests proper orientation setup

2. **Cardinal Direction Tests (Keys: 1-4)**
   - Tests player facing each of the four walls
   - Ensures camera follows correctly in each direction
   - Verifies spatial orientation

3. **Advanced Position Tests (Keys: 5-7)**
   - Tests corner positioning
   - Tests high altitude
   - Tests low flight near ground

4. **Animated Test (Key: 8)**
   - Camera orbits around player
   - Tests dynamic camera movement
   - Useful for checking all angles

### Control Mode Tests (Keys: F1-F6)

1. **Standard Mode (F1)**
   - Default third-person camera settings
   - Balanced movement parameters

2. **Close Follow Mode (F2)**
   - Camera follows more closely
   - Slightly reduced speed

3. **Cinematic Mode (F3)**
   - Wider camera angle
   - Smoother, slower camera movement
   - Higher boost speed

4. **Racing Mode (F4)**
   - Lower camera angle
   - Faster player movement
   - Quicker camera response

5. **Top-Down Mode (F5)**
   - Bird's eye view of player
   - Standard movement speed

6. **First-Person Mode (F6)**
   - Camera positioned at player's head
   - Model partially transparent
   - Immersive perspective

## Debugging Tools

### Debug Overlay

The debug overlay shows real-time information about:
- Player position (X, Y, Z)
- Player rotation (X, Y, Z in degrees)
- Camera position (X, Y, Z)
- Camera rotation (X, Y, Z in degrees)
- Player velocity
- Camera's relative position to player
- Distance to ground
- Distance to surrounding walls

### Trajectory Visualization

The trajectory visualization shows:
- Recent player movement history
- Path traveled
- Useful for diagnosing movement issues

### Test Pattern Grid

The test pattern grid provides:
- Reference points with distance measurements
- Cardinal direction markers
- X, Y, Z axis visualization
- Grid for spatial reference

## Common Issues and Diagnosis

### Camera Orientation Problems

If the camera is incorrectly oriented:
1. Use the North Wall Test (N key) to reset to a known orientation
2. Check the camera rotation values in the debug overlay
3. Verify that the camera is correctly following the player

### Player Movement Issues

If player movement seems incorrect:
1. Enable the trajectory visualization
2. Check player velocity values
3. Test different control modes to isolate the issue

### Spatial Disorientation

If it's difficult to understand the environment orientation:
1. Enable the test pattern grid (G key)
2. Look for the cardinal direction markers
3. Use the walls' color coding for reference (North: Blue, South: Red, etc.)

## Advanced Testing

For more complex testing scenarios:

1. **Combined Tests**
   - Use the Camera FOV visualization with different control modes
   - Enable trajectory visualization during position tests

2. **Custom Testing**
   - Modify the test components to add custom test positions
   - Add specific tests for problematic scenarios

## Implementation Notes

The testing components are designed to be temporary tools for development and testing. They can be disabled or removed for production by:

1. Removing the component attributes from the `<a-scene>` tag in index.html
2. Commenting out or removing the script includes

## Conclusion

These testing tools provide a comprehensive framework for diagnosing and fixing camera and player positioning issues in the hoverbike project. They offer visual aids, detailed information, and various test scenarios to ensure correct spatial orientation and movement behavior.
