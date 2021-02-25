# Changelog

All notable changes to this project will be documented in this file. This project uses [Semantic Versioning](https://semver.org/)

## [Version 3.3.4](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v3.3.3...v3.3.4) (2021-02-25)

### Changes

- Fix issue where curtain refreshRate was being required when it's not required.

## [Version 3.3.3](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v3.3.2...v3.3.3) (2021-02-25)

### Changes

- Fix issue where curtain refreshRate was being required when it's not required.

## [Version 3.3.2](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v3.3.1...v3.3.2) (2021-02-25)

### Changes

- Fix issue where curtain refreshRate was being required when it's not required.

## [Version 3.3.1](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v3.3.0...v3.3.1) (2021-02-25)

### Changes

- Fix issue with not hiding sensors when not compatible with device or hidden with config.

## [Version 3.3.0](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v3.2.2...v3.3.0) (2021-02-24)

### Changes

- Added Support for `Others` IR Device Type.
  - Currently only displaying as a Fan... More can be added if requested.
- Added Logging for StatusCodes.

## [Version 3.2.2](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v3.2.1...v3.2.2) (2021-02-23)

### Changes

- Housekeeping and updated dependencies.
- Fixed Issue with TV accessories updating the display name every time Homebridge is restarted.

## [Version 3.2.1](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v3.2.0...v3.2.1) (2021-02-23)

### Changes

- Fixed CurrentPosition issue with `minValue` and `maxValue`, also set `validValueRange`.
- Updated BatteryService Characteristic to Battery to meeting Homebridge 1.3.0 Standards.
- Housekeeping and updated dependencies.

## [Version 3.2.0](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v3.1.0...v3.2.0) (2021-02-22)

### Changes

- Add curtain refresh option.
- Add support and set new requirement for Homebridge v1.3.0.
- Characteristics are now only updated if defined with a valid `CharacteristicValue`.

## [Version 3.1.0](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v3.0.1...v3.1.0) (2021-02-16)

### Changes

- Automatic Grouping for Grouped Curtains.
  - Added option to disable automatic Grouping of Grouped Curtains.
- Fixed Issue where temperature sensor wouldn't hide if config was set to hide for humidifier.

## [Version 3.0.2](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v3.0.1...v3.0.2) (2021-02-13)

### Changes

- Fixes issue with bots not pushing update to API.

## [Version 3.0.1](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v3.0.0...v3.0.1) (2021-02-12)

### Changes

- Fixes issue with curtains not pushing update to API.

## [Version 3.0.0](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v2.4.0...v3.0.0) (2021-02-12)

### Changes

- Added `pushRate` to set the amount of time inbetween pushes to API.
  - Works on Curtains and Humidifers Devices.
  - If set higher, changes take longer, prevents excessive pushes to API.
- Housekeeping and Update Dependencies.  

## [Version 2.4.0](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v2.3.0...v2.4.0) (2021-02-09)

### Changes

- Added options to hide temperature sensor or humidity sensor on SwitchBot Meter.
- Added options to convert temperature to Celsius or Fahrenheit of SwitchBot Meter.
- Removed LockPhysicalControls Characteristic since there is not a way to control it with the SwitchBot API.

## [Version 2.3.0](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v2.2.0...v2.3.0) (2021-02-08)

### Changes

- Added option to display bot as a switch instead of an outlet.

## [Version 2.2.0](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v2.1.0...v2.2.0) (2021-02-08)

### Changes

- Added `pushRate` to set the amount of time inbetween pushes to API.
  - This sets how many seconds to wait before pushing to API.
  - Currently only for Curtains.
- Added Error Handling, shows device as unresponsive if there is an API issues.
- Added option to Set `minStep` for SwitchBot Humidifiers.
- Added option to disable Auto Mode on IR Air Conditioners.
- Fix Issue with Curtain set_min and set_max config options not working.
- Removed Issue were Curtain was logging that it needed to be recalibrated.

## [Version 2.1.0](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v2.0.0...v2.1.0) (2021-01-20)

### Changes

- Refined Support for IR TV.
  - Now DIY TVs are Supported
  - Until an Update to the SwitchBot API, only Power and Volume will work.
- Adds Support for Projectors - Displayed As a TV.
  - Also Supports DIY Projectors.
- Adds Support for DVD - Displayed As a Set Top Box.
  - Also Supports DIY DVD.
- Adds Support for Set Top Box - Displayed As a Set Top Box.
  - Also Supports DIY Set Top Box.
- Adds Support for Streamer - Displayed As a Streaming Stick.
  - Also Supports DIY Streamer.
- Adds Support for Speaker - Displayed As a Speaker.
  - Also Supports DIY Speaker.
- Adds Support for IR Fans
  - Allows for Adding Rotation Speed Characteristic If Fan Supports it, This will effect all Fans.
  - Allows for Adding Swing Mode Characteristic If Fan Supports it, This will effect all Fans.
- Adds Support for IR Lights
- Adds Support for IR Cameras.
- Adds Support for IR Vacuum Cleaners.
- Adds Support for IR Air Conditioners.
- Adds Support for IR Air Purifiers.
- Adds Support for IR Water Heaters.
- Fixed Logging, where only SwitchBot Device Count was being logged and not IR Devices.
- Fixed Issue with Min/Max Values on Current Position of Curtains Working for Close and Open.

## [Version 2.0.0](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v1.2.4...v2.0.0) (2021-01-14)

### Major Changes

- _IMPORTANT_

  BEFORE UPDATING TO `v2.0.0`, YOU WILL NEED TO CLEAR CACHE ON ALL YOUR SWITCHBOT DEVICES

  IF YOU DON'T YOU WILL GET DUPLICATE DEVICES IN YOUR CACHE.

- Changes made to `uuid`, so it doesn't cause duplicate devices going forward if connecting to different Hub.
  - `uuid` is the Unique ID that is Generated to Create each Accessory.
    - Before `uuid` was using `deviceName`, `deviceId`, `deviceType`, and `hubDeviceId`
    - Now `uuid` is now using `deviceName`, `deviceId`, `deviceType`

### Changes

- Adds initial Support for IR TV.
  - Supports Volume Up and Down in Control Center.
  - Supports On and Off in Home App.
- Removed status update from Bots that was un-needed.

## [Version 1.2.4](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v1.2.3...v1.2.4) (2021-01-13)

### Changes

- Updated logging on `Hidden Devices` so that they are not displayed as discovered or as not able to register.

## [Version 1.2.3](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v1.2.2...v1.2.3) (2021-01-12)

### Changes

- Added logging for IR Devices when connected to a [SwitchBot Hub Mini](https://www.switch-bot.com/products/switchbot-hub-mini) or [SwitchBot Hub Plus](https://www.switch-bot.com/products/switchbot-hub-plus).

## [Version 1.2.2](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v1.2.1...v1.2.2) (2021-01-12)

### Changes

- Added logging for [SwitchBot Hub Mini](https://www.switch-bot.com/products/switchbot-hub-mini), When discovered.
- Added logging for [SwitchBot Hub Plus](https://www.switch-bot.com/products/switchbot-hub-plus), When discovered.

## [Version 1.2.1](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v1.2.0...v1.2.1) (2021-01-11)

### Changes

- Fixed unneeded logging for Bots.

## [Version 1.2.0](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v1.1.0...v1.2.0) (2021-01-11)

### Changes

- Adds Support for [SwitchBot Bot](https://www.switch-bot.com/products/switchbot-bot).
  - You must set your Bot's Device ID in the Press Mode or Switch Mode Bot Settings (Advanced Settings > Bot Settings)
    - Press Mode - Turns on then instantly turn it off.
    - Switch Mode - Turns on and keep it on until it is turned off.
      - This can get out of sync, since API doesn't give me a status.
      - To Correct you must go into the SwitchBot App and correct the status of either `On` or `Off`.
- Added option to set Mininum Step Config for [SwitchBot Curtain](https://www.switch-bot.com/products/switchbot-curtain), lower the ammount of commands being sent.

## [Version 1.1.0](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v1.0.1...v1.1.0) (2021-01-08)

### Changes

- Allow for Hiding Devices based off of `DeviceID` instead of `DeviceType`.
- Adds Support for [SwitchBot Meter](https://www.switch-bot.com/products/switchbot-meter).
- Adds Beta Support for [SwitchBot Curtain](https://www.switch-bot.com/products/switchbot-curtain).

## [Version 1.0.1](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v1.0.0...v1.0.1) (2020-12-25)

### Changes

- Fixed issue where humidifier wouldn't turn back on when adjusting relative humidity threshold if humdifier was off.

## [Version 1.0.0](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v0.1.0...v1.0.0) (2020-12-25)

### Changes

- Offical Release of OpenToken Switchbot API Support.
- Adds Support for [SwitchBot Humidifier](https://www.switch-bot.com/products/switchbot-smart-humidifier).

## [Version 0.1.0](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/releases/tag/v0.1.0) (2020-12-19)

### Changes

- Initial Release.
- This release will only valid that your Open Token Works.
