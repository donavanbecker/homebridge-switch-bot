import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, Service, Characteristic } from 'homebridge';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { PLATFORM_NAME, PLUGIN_NAME, DeviceURL } from './settings';
import { Humidifier } from './Devices/Humidifier';
import { Bot } from './Devices/Bot';
import { Meter } from './Devices/Meter';
import { Curtain } from './Devices/Curtain';
import { TV } from './irDevices/TV';
import { irdevice, device, SwitchBotPlatformConfig, deviceResponses, deviceStatusResponse } from './configTypes';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class SwitchBotPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  public axios: AxiosInstance = axios.create({
    responseType: 'json',
  });

  constructor(public readonly log: Logger, public readonly config: SwitchBotPlatformConfig, public readonly api: API) {
    this.log.debug('Finished initializing platform:', this.config.name);
    // only load if configured
    if (!this.config) {
      return;
    }

    // verify the config
    try {
      this.verifyConfig();
      this.log.debug('Config OK');
    } catch (e) {
      this.log.error(JSON.stringify(e.message));
      this.log.debug(JSON.stringify(e));
      return;
    }

    // setup axios interceptor to add headers / api key to each request
    this.axios.interceptors.request.use((request: AxiosRequestConfig) => {
      request.headers.Authorization = this.config.credentials?.openToken;
      request.headers['Content-Type'] = 'application/json; charset=utf8';
      return request;
    });

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', async () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      try {
        this.discoverDevices();
      } catch (e) {
        this.log.error('Failed to Discover Devices.', JSON.stringify(e.message));
        this.log.debug(JSON.stringify(e));
      }
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * Verify the config passed to the plugin is valid
   */
  verifyConfig() {
    /**
     * Hidden Device Discovery Option
     * This will disable adding any device and will just output info.
     */
    this.config.devicediscovery;

    this.config.options = this.config.options || {};

    if (this.config.options) {
      // Hide Devices by DeviceID
      this.config.options.hide_device = this.config.options.hide_device || [];

      // Bot Config Options
      if (this.config.options?.bot) {
        this.config.options.bot.device_press;
        this.config.options.bot.device_switch;
      }
      
      // Meter Config Options
      if (this.config.options?.meter) {
        this.config.options.meter.hide_temperature;
        this.config.options.meter.hide_humidity;
      }

      // Humidifier Config Options
      if (this.config.options?.humidifier) {
        this.config.options.humidifier.hide_temperature;
      }

      // Curtain Config Options
      if (this.config.options?.curtain) {
        this.config.options.curtain.set_minStep;
        this.config.options.curtain.set_min;
        this.config.options.curtain.set_max;
      }

      if (this.config.options!.refreshRate! < 120) {
        throw new Error('Refresh Rate must be above 120 (2 minutes).');
      }

      if (!this.config.options.refreshRate) {
      this.config.options!.refreshRate! = 300;
      this.log.warn('Using Default Refresh Rate.');
      }
      
    }
  
    if (!this.config.credentials) {
      throw new Error('Missing Credentials');
    }
    if (!this.config.credentials.openToken) {
      throw new Error('Missing openToken');
    }
  }

  /**
   * this method discovers the Locations
   */
  async discoverDevices() {
    try {
      const devices = (await this.axios.get(DeviceURL)).data;

      if (this.config.devicediscovery) {
        this.deviceListInfo(devices);
      } else {
        this.log.debug(JSON.stringify(devices));
      }
      this.log.info('Total Devices Found:', devices.body.deviceList.length);
      for (const device of devices.body.deviceList) {
        if (this.config.devicediscovery && !this.config.options?.hide_device.includes(device.deviceId)) {
          this.deviceInfo(device);
        } else {
          this.log.debug(JSON.stringify(device));
        }
        // For Future Devices
        switch (device.deviceType) {
          case 'Humidifier':
            if (!this.config.options?.hide_device.includes(device.deviceId)) {
              this.log.info('Discovered %s %s', device.deviceName, device.deviceType);
            }
            this.createHumidifier(device, devices);
            break;
          case 'Hub Mini':
            if (!this.config.options?.hide_device.includes(device.deviceId)) {  
              this.log.info('Discovered a %s', device.deviceType);
            }
            break;
          case 'Hub Plus':
            if (!this.config.options?.hide_device.includes(device.deviceId)) {  
              this.log.info('Discovered a %s', device.deviceType);
            }
            break;
          case 'Bot':
            if (!this.config.options?.hide_device.includes(device.deviceId)) {
              this.log.info('Discovered %s %s', device.deviceName, device.deviceType);
            }
            this.createBot(device, devices);
            break;
          case 'Meter':
            if (!this.config.options?.hide_device.includes(device.deviceId)) {  
              this.log.info('Discovered %s %s', device.deviceName, device.deviceType);
            }
            this.createMeter(device, devices);
            break;
          case 'Curtain':
            if (!this.config.options?.hide_device.includes(device.deviceId)) {
              this.log.info('Discovered %s %s', device.deviceName, device.deviceType);
            }
            this.createCurtain(device, devices);
            break;
          case 'Remote':
            if (!this.config.options?.hide_device.includes(device.deviceId)) {
              this.log.debug('Discovered %s, %s is Not Supported.', device.deviceName, device.deviceType);
            }
            break;
          default:
            this.log.info(
              'Device: %s with Device Type: %s, is currently not supported.',
              device.deviceName,
              device.deviceType,
              'Submit Feature Requests Here: https://git.io/JL14Z',
            );
        }
      }
      for (const device of devices.body.infraredRemoteList) {
        if (this.config.devicediscovery) {
          this.deviceInfo(device);
        } else {
          this.log.debug(JSON.stringify(device));
        }
        // For Future Devices
        switch (device.remoteType) {
          case 'TV':
            if (!this.config.options?.hide_device.includes(device.deviceId)) {
              this.log.info('Discovered %s %s', device.deviceName, device.remoteType);
            }
            this.createTV(device);
            break;
          default:
            this.log.info(
              'Device: %s with Device Type: %s, is currently not supported.',
              device.deviceName,
              device.remoteType,
              'Submit Feature Requests Here: https://git.io/JL14Z',
            );
        }
      }
    } catch (e) {
      this.log.error('Failed to Discover Devices.', JSON.stringify(e.message));
      this.log.debug(JSON.stringify(e));
    }
  }

  private async createHumidifier(device: device, devices: deviceResponses) {
    const uuid = this.api.hap.uuid.generate(
      `${device.deviceName}-${device.deviceId}-${device.deviceType}`,
    );

    // see if an accessory with the same uuid has already been registered and restored from
    // the cached devices we stored in the `configureAccessory` method above
    const existingAccessory = this.accessories.find((accessory) => accessory.UUID === uuid);

    if (existingAccessory) {
      // the accessory already exists
      if (!this.config.options?.hide_device.includes(device.deviceId) && devices.statusCode === 100) {
        this.log.info(
          'Restoring existing accessory from cache: %s DeviceID: %s',
          existingAccessory.displayName,
          device.deviceId,
        );

        // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
        //existingAccessory.context.firmwareRevision = firmware;
        this.api.updatePlatformAccessories([existingAccessory]);
        // create the accessory handler for the restored accessory
        // this is imported from `platformAccessory.ts`
        new Humidifier(this, existingAccessory, device);
        this.log.debug(
          `Humidifier UDID: ${device.deviceName}-${device.deviceId}-${device.deviceType}`,
        );
      } else {
        this.unregisterPlatformAccessories(existingAccessory);
      }
    } else if (!this.config.options?.hide_device.includes(device.deviceId)) {
      // the accessory does not yet exist, so we need to create it
      this.log.info(
        'Adding new accessory: %s %s DeviceID: %s',
        device.deviceName,
        device.deviceType,
        device.deviceId,
      );

      // create a new accessory
      const accessory = new this.api.platformAccessory(`${device.deviceName} ${device.deviceType}`, uuid);

      // store a copy of the device object in the `accessory.context`
      // the `context` property can be used to store any data about the accessory you may need
      //accessory.context.firmwareRevision = firmware;
      accessory.context.device = device;
      // accessory.context.firmwareRevision = findaccessories.accessoryAttribute.softwareRevision;
      // create the accessory handler for the newly create accessory
      // this is imported from `platformAccessory.ts`
      new Humidifier(this, accessory, device);
      this.log.debug(
        `Humidifier UDID: ${device.deviceName}-${device.deviceId}-${device.deviceType}`,
      );

      // link the accessory to your platform
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      this.accessories.push(accessory);
    } else {
      if (!this.config.options?.hide_device.includes(device.deviceId)) {
        this.log.error(
          'Unable to Register new device: %s %s - %s',
          device.deviceName,
          device.deviceType,
          device.deviceId,
        );
      }
    }
  }

  private async createBot(device: device, devices: deviceResponses) {
    const uuid = this.api.hap.uuid.generate(
      `${device.deviceName}-${device.deviceId}-${device.deviceType}`,
    );

    // see if an accessory with the same uuid has already been registered and restored from
    // the cached devices we stored in the `configureAccessory` method above
    const existingAccessory = this.accessories.find((accessory) => accessory.UUID === uuid);

    if (existingAccessory) {
      // the accessory already exists
      if (!this.config.options?.hide_device.includes(device.deviceId) && devices.statusCode === 100) {
        this.log.info(
          'Restoring existing accessory from cache: %s DeviceID: %s',
          existingAccessory.displayName,
          device.deviceId,
        );

        // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
        //existingAccessory.context.firmwareRevision = firmware;
        this.api.updatePlatformAccessories([existingAccessory]);
        // create the accessory handler for the restored accessory
        // this is imported from `platformAccessory.ts`
        new Bot(this, existingAccessory, device);
        this.log.debug(
          `Bot UDID: ${device.deviceName}-${device.deviceId}-${device.deviceType}`,
        );
      } else {
        this.unregisterPlatformAccessories(existingAccessory);
      }
    } else if (!this.config.options?.hide_device.includes(device.deviceId)) {
      // the accessory does not yet exist, so we need to create it
      this.log.info(
        'Adding new accessory: %s %s DeviceID: %s',
        device.deviceName,
        device.deviceType,
        device.deviceId,
      );

      if (!this.config.options?.bot?.device_press && !this.config.options?.bot?.device_switch) {
        this.log.error('You must set your Bot to Press or Switch Mode');
      }
      // create a new accessory
      const accessory = new this.api.platformAccessory(`${device.deviceName} ${device.deviceType}`, uuid);

      // store a copy of the device object in the `accessory.context`
      // the `context` property can be used to store any data about the accessory you may need
      //accessory.context.firmwareRevision = firmware;
      accessory.context.device = device;
      // accessory.context.firmwareRevision = findaccessories.accessoryAttribute.softwareRevision;
      // create the accessory handler for the newly create accessory
      // this is imported from `platformAccessory.ts`
      new Bot(this, accessory, device);
      this.log.debug(
        `Bot UDID: ${device.deviceName}-${device.deviceId}-${device.deviceType}`,
      );

      // link the accessory to your platform
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      this.accessories.push(accessory);
    } else {      
      if (!this.config.options?.hide_device.includes(device.deviceId)) {
        this.log.error(
          'Unable to Register new device: %s %s - %s',
          device.deviceName,
          device.deviceType,
          device.deviceId,
        );
      }
    }
  }

  private async createMeter(device: device, devices: deviceResponses) {
    const uuid = this.api.hap.uuid.generate(
      `${device.deviceName}-${device.deviceId}-${device.deviceType}`,
    );

    // see if an accessory with the same uuid has already been registered and restored from
    // the cached devices we stored in the `configureAccessory` method above
    const existingAccessory = this.accessories.find((accessory) => accessory.UUID === uuid);

    if (existingAccessory) {
      // the accessory already exists
      if (!this.config.options?.hide_device.includes(device.deviceId) && devices.statusCode === 100) {
        this.log.info(
          'Restoring existing accessory from cache: %s DeviceID: %s',
          existingAccessory.displayName,
          device.deviceId,
        );

        // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
        //existingAccessory.context.firmwareRevision = firmware;
        this.api.updatePlatformAccessories([existingAccessory]);
        // create the accessory handler for the restored accessory
        // this is imported from `platformAccessory.ts`
        new Meter(this, existingAccessory, device);
        this.log.debug(
          `Meter UDID: ${device.deviceName}-${device.deviceId}-${device.deviceType}`,
        );
      } else {
        this.unregisterPlatformAccessories(existingAccessory);
      }
    } else if (!this.config.options?.hide_device.includes(device.deviceId)) {
      // the accessory does not yet exist, so we need to create it
      this.log.info(
        'Adding new accessory: %s %s DeviceID: %s',
        device.deviceName,
        device.deviceType,
        device.deviceId,
      );

      // create a new accessory
      const accessory = new this.api.platformAccessory(`${device.deviceName} ${device.deviceType}`, uuid);

      // store a copy of the device object in the `accessory.context`
      // the `context` property can be used to store any data about the accessory you may need
      //accessory.context.firmwareRevision = firmware;
      accessory.context.device = device;
      // accessory.context.firmwareRevision = findaccessories.accessoryAttribute.softwareRevision;
      // create the accessory handler for the newly create accessory
      // this is imported from `platformAccessory.ts`
      new Meter(this, accessory, device);
      this.log.debug(
        `Meter UDID: ${device.deviceName}-${device.deviceId}-${device.deviceType}`,
      );

      // link the accessory to your platform
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      this.accessories.push(accessory);
    } else {
      if (!this.config.options?.hide_device.includes(device.deviceId)) {
        this.log.error(
          'Unable to Register new device: %s %s - %s',
          device.deviceName,
          device.deviceType,
          device.deviceId,
        );
      }
    }
  }

  private async createCurtain(device: device, devices: deviceResponses) {
    const uuid = this.api.hap.uuid.generate(
      `${device.deviceName}-${device.deviceId}-${device.deviceType}`,
    );

    // see if an accessory with the same uuid has already been registered and restored from
    // the cached devices we stored in the `configureAccessory` method above
    const existingAccessory = this.accessories.find((accessory) => accessory.UUID === uuid);

    if (existingAccessory) {
      // the accessory already exists
      if (!this.config.options?.hide_device.includes(device.deviceId) && devices.statusCode === 100) {
        this.log.info(
          'Restoring existing accessory from cache: %s DeviceID: %s',
          existingAccessory.displayName,
          device.deviceId,
        );

        // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
        //existingAccessory.context.firmwareRevision = firmware;
        this.api.updatePlatformAccessories([existingAccessory]);
        // create the accessory handler for the restored accessory
        // this is imported from `platformAccessory.ts`
        new Curtain(this, existingAccessory, device);
        this.log.debug(
          `Curtain UDID: ${device.deviceName}-${device.deviceId}-${device.deviceType}`,
        );
      } else {
        this.unregisterPlatformAccessories(existingAccessory);
      }
    } else if (!this.config.options?.hide_device.includes(device.deviceId)) {
      // the accessory does not yet exist, so we need to create it
      this.log.info(
        'Adding new accessory: %s %s DeviceID: %s',
        device.deviceName,
        device.deviceType,
        device.deviceId,
      );

      // create a new accessory
      const accessory = new this.api.platformAccessory(`${device.deviceName} ${device.deviceType}`, uuid);

      // store a copy of the device object in the `accessory.context`
      // the `context` property can be used to store any data about the accessory you may need
      //accessory.context.firmwareRevision = firmware;
      accessory.context.device = device;
      // accessory.context.firmwareRevision = findaccessories.accessoryAttribute.softwareRevision;
      // create the accessory handler for the newly create accessory
      // this is imported from `platformAccessory.ts`
      new Curtain(this, accessory, device);
      this.log.debug(
        `Curtain UDID: ${device.deviceName}-${device.deviceId}-${device.deviceType}`,
      );

      // link the accessory to your platform
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      this.accessories.push(accessory);
    } else {
      if (!this.config.options?.hide_device.includes(device.deviceId)) {
        this.log.error(
          'Unable to Register new device: %s %s - %s',
          device.deviceName,
          device.deviceType,
          device.deviceId,
        );
      }
    }
  }

  private async createTV(device: irdevice) {
    const uuid = this.api.hap.uuid.generate(
      `${device.deviceName}-${device.deviceId}-${device.remoteType}-${device.hubDeviceId}`,
    );

    // see if an accessory with the same uuid has already been registered and restored from
    // the cached devices we stored in the `configureAccessory` method above
    const existingAccessory = this.accessories.find((accessory) => accessory.UUID === uuid);

    if (existingAccessory && !this.config.options?.hide_device.includes(device.deviceId)) {
      this.log.info(
        'Restoring existing accessory from cache: %s DeviceID: %s',
        existingAccessory.displayName,
        device.deviceId,
      );

      // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
      //existingAccessory.context.firmwareRevision = firmware;
      this.api.updatePlatformAccessories([existingAccessory]);
      // create the accessory handler for the restored accessory
      // this is imported from `platformAccessory.ts`
      new TV(this, existingAccessory, device);
      this.log.debug(
        `TV UDID: ${device.deviceName}-${device.deviceId}-${device.remoteType}-${device.hubDeviceId}`,
      );
      
    } else if (!this.config.options?.hide_device.includes(device.deviceId)) {
      // the accessory does not yet exist, so we need to create it
      this.log.info(
        'TV Accessory: %s %s DeviceID: %s',
        device.deviceName,
        device.remoteType,
        device.deviceId,
      );

      // create a new accessory
      const accessory = new this.api.platformAccessory(`${device.deviceName} ${device.remoteType}`, uuid);

      // store a copy of the device object in the `accessory.context`
      // the `context` property can be used to store any data about the accessory you may need
      //accessory.context.firmwareRevision = firmware;
      accessory.context.device = device;
      // accessory.context.firmwareRevision = findaccessories.accessoryAttribute.softwareRevision;
      // create the accessory handler for the newly create accessory
      // this is imported from `platformAccessory.ts`
      new TV(this, accessory, device);
      this.log.debug(
        `TV UDID: ${device.deviceName}-${device.deviceId}-${device.remoteType}-${device.hubDeviceId}`,
      );

      /**
     * Publish as external accessory
     * Only one TV can exist per bridge, to bypass this limitation, you should
     * publish your TV as an external accessory.
     */
      this.api.publishExternalAccessories(PLUGIN_NAME, [accessory]);
      this.accessories.push(accessory);
    } else {
      if (!this.config.options?.hide_device.includes(device.deviceId)) {
        this.log.error(
          'Unable to Register new device: %s %s - %s',
          device.deviceName,
          device.remoteType,
          device.deviceId,
        );
      }
    }
  }

  public unregisterPlatformAccessories(existingAccessory: PlatformAccessory) {
    // remove platform accessories when no longer present
    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
    this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
  }

  public deviceListInfo(devices: deviceResponses) {
    this.log.warn(JSON.stringify(devices));
  }

  public async deviceInfo(device: irdevice | device) {
    this.log.warn(JSON.stringify(device));
    const deviceStatus: deviceStatusResponse = (await this.axios.get(`${DeviceURL}/${device.deviceId}/status`)).data;
    if (deviceStatus.message === 'success') {
      this.log.warn('deviceStatus -', device.deviceName, JSON.stringify(deviceStatus));
    } else {
      this.log.warn('deviceStatus -', device.deviceName, JSON.stringify(deviceStatus.message));
      this.log.error('Unable to retreive device status.');
    }
  }
}
