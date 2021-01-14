import { Service, PlatformAccessory, CharacteristicEventTypes, CharacteristicSetCallback } from 'homebridge';
import { SwitchBotPlatform } from '../platform';
import { interval, Subject } from 'rxjs';
import { debounceTime, skipWhile, tap } from 'rxjs/operators';
import { DeviceURL } from '../settings';
import { device } from '../configTypes';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class Bot {
  private service: Service;

  On!: boolean;
  OutletInUse!: boolean;
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
    this.OutletInUse = true;

    // this is subject we use to track when we need to POST changes to the SwitchBot API
    this.doBotUpdate = new Subject();
    this.botUpdateInProgress = false;

    // Retrieve initial values and updateHomekit
    this.parseStatus();

    // set accessory information
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'SwitchBot')
      .setCharacteristic(this.platform.Characteristic.Model, 'SWITCHBOT-BOT-S1')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.device.deviceId);

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    (this.service =
      this.accessory.getService(this.platform.Service.Outlet) ||
      this.accessory.addService(this.platform.Service.Outlet)),
    `${this.device.deviceName} ${this.device.deviceType}`;

    // To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
    // when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
    // this.accessory.getService('NAME') ?? this.accessory.addService(this.platform.Service.Outlet, 'NAME', 'USER_DEFINED_SUBTYPE');

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      `${this.device.deviceName} ${this.device.deviceType}`,
    );

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Outlet

    this.service
      .getCharacteristic(this.platform.Characteristic.On)
      .on(CharacteristicEventTypes.SET, this.handleOnSet.bind(this));  

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
          this.platform.log.debug('Bot %s -', this.accessory.displayName, JSON.stringify(e));
        }
        this.botUpdateInProgress = false;
      });
  }

  /**
   * Parse the device status from the SwitchBot api
   */
  parseStatus() {
    this.OutletInUse = true;
    if (this.platform.config.options?.bot?.device_press?.includes(this.device.deviceId)){
      this.On = false;
    }
    this.platform.log.debug(
      'Bot %s OutletInUse: %s On: %s',
      this.accessory.displayName,
      this.OutletInUse,
      this.On,
    );
  }

  /**
   * Asks the SwitchBot API for the latest device information
   */
  async refreshStatus() {
    try {
      // this.platform.log.error('Bot - Reading', `${DeviceURL}/${this.device.deviceID}/devices`);
      const deviceStatus: any = {
        statusCode:100,
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
    this.refreshStatus();
  }

  /**
   * Updates the status for each of the HomeKit Characteristics
   */
  updateHomeKitCharacteristics() {
    this.service.updateCharacteristic(
      this.platform.Characteristic.On,
      this.On,
    );
    this.service.updateCharacteristic(
      this.platform.Characteristic.OutletInUse,
      this.OutletInUse,
    );
  }

  /**
   * Handle requests to set the "On" characteristic
   */
  handleOnSet(value: any, callback: CharacteristicSetCallback) {
    this.platform.log.debug('Bot %s -', this.accessory.displayName, `Set On: ${value}`);
    this.doBotUpdate.next();
    this.On = value;
    this.service.updateCharacteristic(this.platform.Characteristic.On, this.On);
    callback(null);
  }

}
