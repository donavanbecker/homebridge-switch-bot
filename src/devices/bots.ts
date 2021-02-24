import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { SwitchBotPlatform } from '../platform';
import { interval, Subject } from 'rxjs';
import { debounceTime, skipWhile, tap } from 'rxjs/operators';
import { DeviceURL, device, deviceStatusResponse } from '../settings';
import { AxiosResponse } from 'axios';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class Bot {
  private service: Service;

  On!: CharacteristicValue;
  OutletInUse!: CharacteristicValue;
  deviceStatus!: any;

  botUpdateInProgress!: boolean;
  doBotUpdate!: any;

  constructor(
    private readonly platform: SwitchBotPlatform,
    private accessory: PlatformAccessory,
    public device: device,
  ) {
    // default placeholders
    this.On = false;
    if (!this.platform.config.options?.bot?.switch) {
      this.OutletInUse = true;
    }

    // this is subject we use to track when we need to POST changes to the SwitchBot API
    this.doBotUpdate = new Subject();
    this.botUpdateInProgress = false;

    // Retrieve initial values and updateHomekit
    this.parseStatus();

    // set accessory information
    accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'SwitchBot')
      .setCharacteristic(this.platform.Characteristic.Model, 'SWITCHBOT-BOT-S1')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, device.deviceId);

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    if (this.platform.config.options?.bot?.switch) {
      (this.service =
        accessory.getService(this.platform.Service.Switch) ||
        accessory.addService(this.platform.Service.Switch)),
      `${device.deviceName} ${device.deviceType}`;
    } else {
      (this.service =
        accessory.getService(this.platform.Service.Outlet) ||
        accessory.addService(this.platform.Service.Outlet)),
      `${device.deviceName} ${device.deviceType}`;
    }

    // To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
    // when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
    // accessory.getService('NAME') ?? accessory.addService(this.platform.Service.Outlet, 'NAME', 'USER_DEFINED_SUBTYPE');

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      `${device.deviceName} ${device.deviceType}`,
    );

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Outlet

    this.service
      .getCharacteristic(this.platform.Characteristic.On)
      .onSet(async (value: CharacteristicValue) => {
        this.handleOnSet(value);
      });

    // Retrieve initial values and updateHomekit
    this.updateHomeKitCharacteristics();

    // Start an update interval
    interval(this.platform.config.options!.refreshRate! * 1000)
      .pipe(skipWhile(() => this.botUpdateInProgress))
      .subscribe(() => {
        this.refreshStatus();
      });

    // Watch for Bot change events
    // We put in a debounce of 100ms so we don't make duplicate calls
    this.doBotUpdate
      .pipe(
        tap(() => {
          this.botUpdateInProgress = true;
        }),
        debounceTime(100),
      )
      .subscribe(async () => {
        try {
          await this.pushChanges();
        } catch (e) {
          this.platform.log.error(JSON.stringify(e.message));
          this.platform.log.debug('Bot %s -', accessory.displayName, JSON.stringify(e));
          this.apiError(e);
        }
        this.botUpdateInProgress = false;
      });
  }

  /**
   * Parse the device status from the SwitchBot api
   */
  parseStatus() {
    if (!this.platform.config.options?.bot?.switch) {
      this.OutletInUse = true;
      if (this.platform.config.options?.bot?.device_press?.includes(this.device.deviceId)) {
        this.On = false;
      }
      this.platform.log.debug('Bot %s OutletInUse: %s On: %s', this.accessory.displayName, this.OutletInUse, this.On);
    } else {
      if (this.platform.config.options?.bot?.device_press?.includes(this.device.deviceId)) {
        this.On = false;
      }
      this.platform.log.debug('Bot %s On: %s', this.accessory.displayName, this.On);
    }
  }

  /**
   * Asks the SwitchBot API for the latest device information
   */
  async refreshStatus() {
    try {
      // this.platform.log.error('Bot - Reading', `${DeviceURL}/${this.device.deviceID}/devices`);
      const deviceStatus: deviceStatusResponse = {
        statusCode: 100,
        body: {
          deviceId: this.device.deviceId,
          deviceType: this.device.deviceType,
          hubDeviceId: this.device.hubDeviceId,
          power: 'on',
        },
        message: 'success',
      };
      this.deviceStatus = deviceStatus;
      this.parseStatus();
      this.updateHomeKitCharacteristics();
    } catch (e) {
      this.platform.log.error(
        `Bot - Failed to update status of ${this.device.deviceName}`,
        JSON.stringify(e.message),
        this.platform.log.debug('Bot %s -', this.accessory.displayName, JSON.stringify(e)),
      );
      this.apiError(e);
    }
  }

  /**
   * Pushes the requested changes to the SwitchBot API
   * deviceType	commandType	  Command	    command parameter	  Description
   * Bot   -    "command"     "turnOff"   "default"	  =        set to OFF state
   * Bot   -    "command"     "turnOn"    "default"	  =        set to ON state
   * Bot   -    "command"     "press"     "default"	  =        trigger press
   */
  async pushChanges() {
    const payload = {
      commandType: 'command',
      parameter: 'default',
    } as any;

    if (this.platform.config.options?.bot?.device_switch?.includes(this.device.deviceId) && this.On) {
      payload.command = 'turnOn';
      this.On = true;
      this.platform.log.debug('Switch Mode, Turning %s', this.On);
    } else if (this.platform.config.options?.bot?.device_switch?.includes(this.device.deviceId) && !this.On) {
      payload.command = 'turnOff';
      this.On = false;
      this.platform.log.debug('Switch Mode, Turning %s', this.On);
    } else if (this.platform.config.options?.bot?.device_press?.includes(this.device.deviceId)) {
      payload.command = 'press';
      this.platform.log.debug('Press Mode');
      this.On = false;
    } else {
      throw new Error('Bot Device Paramters not set for this Bot.');
    }

    this.platform.log.info(
      'Sending request for',
      this.accessory.displayName,
      'to SwitchBot API. command:',
      payload.command,
      'parameter:',
      payload.parameter,
      'commandType:',
      payload.commandType,
    );
    this.platform.log.debug('Bot %s pushChanges -', this.accessory.displayName, JSON.stringify(payload));

    // Make the API request
    const push = await this.platform.axios.post(`${DeviceURL}/${this.device.deviceId}/commands`, payload);
    this.platform.log.debug('Bot %s Changes pushed -', this.accessory.displayName, push.data);
    this.statusCode(push);
    this.refreshStatus();
  }

  /**
   * Updates the status for each of the HomeKit Characteristics
   */
  updateHomeKitCharacteristics() {
    if (this.On !== undefined) {
      this.service.updateCharacteristic(this.platform.Characteristic.On, this.On);
    }
    if (!this.platform.config.options?.bot?.switch && this.OutletInUse !== undefined) {
      this.service.updateCharacteristic(this.platform.Characteristic.OutletInUse, this.OutletInUse);
    }
  }

  public apiError(e: any) {
    this.service.updateCharacteristic(this.platform.Characteristic.On, e);
    if (!this.platform.config.options?.bot?.switch) {
      this.service.updateCharacteristic(this.platform.Characteristic.OutletInUse, e);
    }
  }

  private statusCode(push: AxiosResponse<any>) {
    switch (push.data.statusCode) {
      case 151:
        this.platform.log.error('Command not supported by this device type.');
        break;
      case 152:
        this.platform.log.error('Device not found.');
        break;
      case 160:
        this.platform.log.error('Command is not supported.');
        break;
      case 161:
        this.platform.log.error('Device is offline.');
        break;
      case 171:
        this.platform.log.error('Hub Device is offline.');
        break;
      case 190:
        this.platform.log.error('Device internal error due to device states not synchronized with server. Or command fomrat is invalid.');
        break;
      case 100:
        this.platform.log.debug('Command successfully sent.');
        break;  
      default:
        this.platform.log.debug('Unknown statusCode.');
    }
  }

  /**
   * Handle requests to set the "On" characteristic
   */
  private handleOnSet(value: CharacteristicValue) {
    this.platform.log.debug('Bot %s -', this.accessory.displayName, `Set On: ${value}`);
    this.doBotUpdate.next();
    this.On = value;
    this.service.updateCharacteristic(this.platform.Characteristic.On, this.On);
  }
}
