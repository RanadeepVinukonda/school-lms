module.exports = {
  testRunner: {
    args: {
      '$0': 'jest',
      config: 'e2e/jest.config.js'
    },
    retries: 120,
    bail: true
  },
  apps: {
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug'
    },
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/Genesis.app',
      build: 'xcodebuild -workspace ios/Genesis.xcworkspace -scheme Genesis -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build'
    }
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15'
      }
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_6_API_33'
      }
    }
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug'
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug'
    }
  }
};
