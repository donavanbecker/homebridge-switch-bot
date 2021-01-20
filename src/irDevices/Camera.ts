import {
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  CharacteristicValue,
  PlatformAccessory,
  Service,
} from 'homebridge';
import { SwitchBotPlatform } from '../platform';
import { DeviceURL } from '../settings';
import { irdevice } from '../configTypes';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class Camera {
  service!: Service;

  On!: CharacteristicValue;
  Brightness!: number;

  constructor(
    private readonly platform: SwitchBotPlatform,
    private accessory: PlatformAccessory,
    public device: irdevice,
  ) {
    this.Brightness = 0;
    // set accessory information
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'SwitchBot')
      .setCharacteristic(this.platform.Characteristic.Model, this.device.remoteType)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.device.deviceId);

    // get the Television service if it exists, otherwise create a new Television service
    // you can create multiple services for each accessory
    (this.service =
      this.accessory.getService(this.platform.Service.Switch) ||
      this.accessory.addService(this.platform.Service.Switch)),
    `${this.device.deviceName} ${this.device.remoteType}`;

    // To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
    // when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
    // this.accessory.getService('NAME') ?? this.accessory.addService(this.platform.Service.Outlet, 'NAME', 'USER_DEFINED_SUBTYPE');

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      `${this.device.deviceName} ${this.device.remoteType}`,
    );

    // handle on / off events using the On characteristic
    this.service
      .getCharacteristic(this.platform.Characteristic.On)
      .on(CharacteristicEventTypes.SET, (value: any, callback: CharacteristicGetCallback) => {
        this.platform.log.debug('%s %s Set On: %s', this.device.remoteType, this.accessory.displayName, value);
        this.On = value;
        if (this.On) {
          this.pushOnChanges();
        } else {
          this.pushOffChanges();
        }
        callback(null);
      });
  }

  /**
   * Pushes the requested changes to the SwitchBot API
   * deviceType	commandType     Command	          command parameter	         Description
   * Light:        "command"       "turnOff"         "default"	        =        set to OFF state
   * Light:        "command"       "turnOn"          "default"	        =        set to ON state
   * Light:        "command"       "volumeAdd"       "default"	        =        volume up
   * Light:        "command"       "volumeSub"       "default"	        =        volume down
   * Light:        "command"       "channelAdd"      "default"	        =        next channel
   * Light:        "command"       "channelSub"      "default"	        =        previous channel
   */
  async pushOnChanges() {
    if (this.On) {
      const payload = {
        commandType: 'command',
        parameter: 'default',
        command: 'turnOn',
      } as any;
      await this.pushChanges(payload);
    }
  }

  async pushOffChanges() {
    if (!this.On) {
      const payload = {
        commandType: 'command',
        parameter: 'default',
        command: 'turnOff',
      } as any;
      await this.pushChanges(payload);
    }
  }

  public async pushChanges(payload: any) {
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
    this.platform.log.debug('Light %s pushChanges -', this.accessory.displayName, JSON.stringify(payload));

    // Make the API request
    const push = await this.platform.axios.post(`${DeviceURL}/${this.device.deviceId}/commands`, payload);
    this.platform.log.debug('Light %s Changes pushed -', this.accessory.displayName, push.data);
  }
}
