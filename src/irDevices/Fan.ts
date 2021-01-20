import {
  Characteristic,
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  CharacteristicValue,
  PlatformAccessory,
  Service,
} from 'homebridge';
import { SwitchBotPlatform } from '../platform';
import { DeviceURL } from '../settings';
import { irdevice, deviceStatusResponse } from '../configTypes';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class Fan {
  service!: Service;

  Active!: CharacteristicValue;
  ActiveIdentifier!: CharacteristicValue;
  deviceStatus!: deviceStatusResponse;
  RotationSpeed: any;
  SwingMode: any;
  RotationDirection!: CharacteristicValue;
  minStep: number | undefined;
  minValue: number | undefined;
  maxValue: number | undefined;
  rotationSpeedCharacteristic!: Characteristic;
  swingModeCharacteristic!: Characteristic;

  constructor(
    private readonly platform: SwitchBotPlatform,
    private accessory: PlatformAccessory,
    public device: irdevice,
  ) {
    // set accessory information
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'SwitchBot')
      .setCharacteristic(this.platform.Characteristic.Model, this.device.remoteType)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.device.deviceId);

    // get the Television service if it exists, otherwise create a new Television service
    // you can create multiple services for each accessory
    (this.service =
      this.accessory.getService(this.platform.Service.Fanv2) || this.accessory.addService(this.platform.Service.Fanv2)),
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

    // handle on / off events using the Active characteristic
    this.service
      .getCharacteristic(this.platform.Characteristic.Active)
      .on(CharacteristicEventTypes.SET, (value: any, callback: CharacteristicGetCallback) => {
        this.platform.log.debug('Fan %s Set Active: %s', this.accessory.displayName, value);
        if (value === this.platform.Characteristic.Active.INACTIVE) {
          this.pushFanOffChanges();
        } else {
          this.pushFanOnChanges();
        }
        this.Active = value;
        this.service.updateCharacteristic(this.platform.Characteristic.Active, this.Active);
        callback(null);
      });

    if (this.platform.config.options?.fan?.rotation_speed?.includes(device.deviceId)) {
      if (this.platform.config.options?.fan?.set_minStep?.set_minStep_device) {
        this.minStep = this.platform.config.options?.fan?.set_minStep?.set_minStep;
      } else {
        this.minStep = 1;
      }
      if (this.platform.config.options?.fan?.set_min?.set_min_device) {
        this.minValue = this.platform.config.options?.fan?.set_min?.set_min;
      } else {
        this.minValue = 1;
      }
      if (this.platform.config.options?.fan?.set_max?.set_max_device) {
        this.maxValue = this.platform.config.options?.fan?.set_max?.set_max;
      } else {
        this.maxValue = 100;
      }
      // handle Roation Speed events using the RotationSpeed characteristic
      this.service
        .getCharacteristic(this.platform.Characteristic.RotationSpeed)
        .setProps({
          minStep: this.minStep,
          minValue: this.minValue,
          maxValue: this.maxValue,
        })
        .on(CharacteristicEventTypes.SET, (value: any, callback: CharacteristicGetCallback) => {
          this.platform.log.debug('Fan %s Set Active: %s', this.accessory.displayName, value);
          if (value > this.RotationSpeed) {
            this.RotationSpeed = 1;
            this.pushFanSpeedUpChanges();
            this.pushFanOnChanges();
          } else {
            this.RotationSpeed = 0;
            this.pushFanSpeedDownChanges();
          }
          this.Active = value;
          this.service.updateCharacteristic(this.platform.Characteristic.RotationSpeed, this.RotationSpeed);
          callback(null);
        });
    } else if (
      this.service.testCharacteristic(this.platform.Characteristic.RotationSpeed) &&
      !this.platform.config.options?.fan?.swing_mode?.includes(device.deviceId)
    ) {
      const characteristic = this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed);
      this.service.removeCharacteristic(characteristic);
      this.platform.log.warn('Rotation Speed Characteristic was removed.');
    } else {
      this.platform.log.debug(
        'Rotation Speed Characteristic was not removed or not added. To Remove Chracteristic, Clear Cache on this Accessory.',
      );
    }

    if (this.platform.config.options?.fan?.swing_mode?.includes(device.deviceId)) {
      // handle Osolcation events using the SwingMode characteristic
      this.service
        .getCharacteristic(this.platform.Characteristic.SwingMode)
        .on(CharacteristicEventTypes.SET, (value: any, callback: CharacteristicGetCallback) => {
          this.platform.log.debug('Fan %s Set Active: %s', this.accessory.displayName, value);
          if (value > this.SwingMode) {
            this.SwingMode = 1;
            this.pushFanOnChanges();
            this.pushFanSwingChanges();
          } else {
            this.SwingMode = 0;
            this.pushFanOnChanges();
            this.pushFanSwingChanges();
          }
          this.Active = value;
          this.service.updateCharacteristic(this.platform.Characteristic.SwingMode, this.SwingMode);
          callback(null);
        });
    } else if (
      this.service.testCharacteristic(this.platform.Characteristic.SwingMode) &&
      !this.platform.config.options?.fan?.swing_mode?.includes(device.deviceId)
    ) {
      const characteristic = this.service.getCharacteristic(this.platform.Characteristic.SwingMode);
      this.service.removeCharacteristic(characteristic);
      this.platform.log.warn('Swing Mode Characteristic was removed.');
    } else {
      this.platform.log.debug(
        'Swing Mode Characteristic was not removed or not added. To Remove Chracteristic, Clear Cache on this Accessory.',
      );
    }
  }

  /**
   * Pushes the requested changes to the SwitchBot API
   * deviceType	commandType     Command	          command parameter	         Description
   * Fan:        "command"       "swing"          "default"	        =        swing
   * Fan:        "command"       "timer"          "default"	        =        timer
   * Fan:        "command"       "lowSpeed"       "default"	        =        fan speed to low
   * Fan:        "command"       "middleSpeed"    "default"	        =        fan speed to medium
   * Fan:        "command"       "highSpeed"      "default"	        =        fan speed to high
   */
  async pushFanOnChanges() {
    if (this.Active !== 1) {
      const payload = {
        commandType: 'command',
        parameter: 'default',
        command: 'turnOn',
      } as any;
      await this.pushTVChanges(payload);
    }
  }

  async pushFanOffChanges() {
    const payload = {
      commandType: 'command',
      parameter: 'default',
      command: 'turnOff',
    } as any;
    await this.pushTVChanges(payload);
  }

  async pushFanSpeedUpChanges() {
    const payload = {
      commandType: 'command',
      parameter: 'default',
      command: 'highSpeed',
    } as any;
    await this.pushTVChanges(payload);
  }

  async pushFanSpeedDownChanges() {
    const payload = {
      commandType: 'command',
      parameter: 'default',
      command: 'lowSpeed',
    } as any;
    await this.pushTVChanges(payload);
  }

  async pushFanSwingChanges() {
    const payload = {
      commandType: 'command',
      parameter: 'default',
      command: 'swing',
    } as any;
    await this.pushTVChanges(payload);
  }

  public async pushTVChanges(payload: any) {
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
    this.platform.log.debug('TV %s pushChanges -', this.accessory.displayName, JSON.stringify(payload));

    // Make the API request
    const push = await this.platform.axios.post(`${DeviceURL}/${this.device.deviceId}/commands`, payload);
    this.platform.log.debug('TV %s Changes pushed -', this.accessory.displayName, push.data);
  }
}
