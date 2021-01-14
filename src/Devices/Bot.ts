import { Service, PlatformAccessory, CharacteristicEventTypes, CharacteristicSetCallback } from 'homebridge';
import { SwitchBotPlatform } from '../platform';
import { DeviceURL } from '../settings';
import { device, deviceStatusResponse } from '../configTypes';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class Bot {
  private service: Service;

  On!: boolean;
  OutletInUse!: boolean;
  deviceStatus!: deviceStatusResponse;

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
  }

  /**
   * Parse the device status from the SwitchBot api
   */
  parseStatus() {
    this.OutletInUse = true;
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
      true,
    );
  }

  /**
   * Handle requests to set the "On" characteristic
   */
  async handleOnSet(value: any, callback: CharacteristicSetCallback) {
    this.platform.log.debug('Bot %s -', this.accessory.displayName, `Set On: ${value}`);
    this.On = value;
    await this.pushChanges();
    this.service.updateCharacteristic(this.platform.Characteristic.On, this.On);
    callback(null);
  }

}
