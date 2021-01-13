<span align="center">

<a href="https://github.com/homebridge/verified/blob/master/verified-plugins.json"><img alt="homebridge-verified" src="https://raw.githubusercontent.com/OpenWonderLabs/homebridge-switchbot-openapi/main/switchbot/Homebridge_x_SwitchBot.svg?sanitize=true" width="500px"></a>

# Homebridge SwitchBot OpenAPI

<a href="https://www.npmjs.com/package/homebridge-switchbot-openapi"><img title="npm version" src="https://badgen.net/npm/v/homebridge-switchbot-openapi" ></a>
<a href="https://www.npmjs.com/package/homebridge-switchbot-openapi"><img title="npm downloads" src="https://badgen.net/npm/dt/homebridge-switchbot-openapi" ></a>

<p>The Homebridge <a href="https://www.switch-bot.com">SwitchBot</a>  OpenAPI
plugin allows you to access your SwitchBot Device(s) from HomeKit with
  <a href="https://homebridge.io">Homebridge</a>. 
</p>

</span>

## Installation

1. Search for "SwitchBot" on the plugin screen of [Homebridge Config UI X](https://github.com/oznu/homebridge-config-ui-x)
2. Click **Install**

## Configuration

1. Download SwitchBot App on App Store or Google Play Store
2. Register a SwitchBot account and log in into your account
3. Generate an Open Token within the App
    - Click Bottom Profile Tab
    - Click Preference
    - Click App version 10 Times, this will enable Developer Options
    - Click Developer Options
    - Click Copy to Clipboard
4. Input your `Token` into the config paramter

<p align="center">

<img src="" width="1px">

</p>

## Supported Devices

- [SwitchBot Humidifier](https://www.switch-bot.com/products/switchbot-smart-humidifier)
- [SwitchBot Meter](https://www.switch-bot.com/products/switchbot-meter)
    - [SwitchBot Hub Mini](https://www.switch-bot.com/products/switchbot-hub-mini) or [SwitchBot Hub Plus](https://www.switch-bot.com/products/switchbot-hub-plus) Required
    - Enable Cloud Services for Device on SwitchBot App
- [SwitchBot Curtain](https://www.switch-bot.com/products/switchbot-curtain)
    - [SwitchBot Hub Mini](https://www.switch-bot.com/products/switchbot-hub-mini) or [SwitchBot Hub Plus](https://www.switch-bot.com/products/switchbot-hub-plus) Required
    - Enable Cloud Services for Device on SwitchBot App
- [SwitchBot Bot](https://www.switch-bot.com/products/switchbot-bot)
    - [SwitchBot Hub Mini](https://www.switch-bot.com/products/switchbot-hub-mini) or [SwitchBot Hub Plus](https://www.switch-bot.com/products/switchbot-hub-plus) Required
    - Enable Cloud Services for Device on SwitchBot App
    - You must set your Bot's Device ID in the Press Mode or Switch Mode Bot Settings (Advanced Settings > Bot Settings)
        - Press Mode - Turns on then instantly turn it off
        - Switch Mode - Turns on and keep it on until it is turned off
            - This can get out of sync, since API doesn't give me a status
            - To Correct you must go into the SwitchBot App and correct the status of either `On` or `Off`

## SwitchBotAPI

- [OpenWonderLabs/SwitchBotAPI](https://github.com/OpenWonderLabs/SwitchBotAPI)

## Community

* [SwitchBot (Official website)](https://www.switch-bot.com/)
* [Facebook @SwitchBotRobot](https://www.facebook.com/SwitchBotRobot/) 
* [Twitter @SwitchBot](https://twitter.com/switchbot) 
