# Changelog

All notable changes to this project will be documented in this file. This project uses [Semantic Versioning](https://semver.org/)

## [Version 1.2.2](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v1.2.1...v1.2.2) (2021-01-12)

### Changes

- Add Logging for [SwitchBot Hub Mini](https://www.switch-bot.com/products/switchbot-hub-mini), When discovered.
- Add Logging for [SwitchBot Hub Plus](https://www.switch-bot.com/products/switchbot-hub-plus), When discovered.

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
