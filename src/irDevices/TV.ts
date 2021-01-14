import {
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
export class TV {
  service!: Service;
  speakerService: Service;

  Active!: CharacteristicValue;
  ActiveIdentifier!: CharacteristicValue;
  deviceStatus!: deviceStatusResponse;

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

    // set the accessory category
    this.accessory.category = this.platform.api.hap.Categories.TELEVISION;

    // get the Television service if it exists, otherwise create a new Television service
    // you can create multiple services for each accessory
    (this.service =
      this.accessory.getService(this.platform.Service.Television) ||
      this.accessory.addService(this.platform.Service.Television)),
    `${this.device.deviceName} ${this.device.remoteType}`;

    // To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
    // when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
    // this.accessory.getService('NAME') ?? this.accessory.addService(this.platform.Service.Outlet, 'NAME', 'USER_DEFINED_SUBTYPE');

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(
      this.platform.Characteristic.ConfiguredName,
      `${this.device.deviceName} ${this.device.remoteType}`,
    );

    // set sleep discovery characteristic
    this.service.setCharacteristic(
      this.platform.Characteristic.SleepDiscoveryMode,
      this.platform.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE,
    );

    // handle on / off events using the Active characteristic
    this.service
      .getCharacteristic(this.platform.Characteristic.Active)
      .on(CharacteristicEventTypes.SET, (value: any, callback: CharacteristicGetCallback) => {
        this.platform.log.debug('TV %s Set Active: %s', this.accessory.displayName, value);
        this.platform.log.warn(value);
        if (value === this.platform.Characteristic.Active.INACTIVE){
          this.pushTVoffChanges();
        } else {
          this.pushTVonChanges();
        }
        this.Active = value;
        this.service.updateCharacteristic(this.platform.Characteristic.Active, this.Active);
        callback(null);
      });

    this.service.setCharacteristic(this.platform.Characteristic.ActiveIdentifier, 1);

    // handle input source changes
    this.service
      .getCharacteristic(this.platform.Characteristic.ActiveIdentifier)
      .on(CharacteristicEventTypes.SET, (value: any, callback: CharacteristicGetCallback) => {
        // the value will be the value you set for the Identifier Characteristic
        // on the Input Source service that was selected - see input sources below.

        this.platform.log.debug('TV %s Set Active Identifier: %s', this.accessory.displayName, value);
        callback(null);
      });

    // handle remote control input
    this.service
      .getCharacteristic(this.platform.Characteristic.RemoteKey)
      .on(CharacteristicEventTypes.SET, (value: any, callback: CharacteristicGetCallback) => {
        switch (value) {
          case this.platform.Characteristic.RemoteKey.REWIND: {
            this.platform.log.debug('TV %s Set Remote Key Pressed: REWIND', this.accessory.displayName);
            break;
          }
          case this.platform.Characteristic.RemoteKey.FAST_FORWARD: {
            this.platform.log.debug('TV %s Set Remote Key Pressed: FAST_FORWARD', this.accessory.displayName);
            break;
          }
          case this.platform.Characteristic.RemoteKey.NEXT_TRACK: {
            this.platform.log.debug('TV %s Set Remote Key Pressed: NEXT_TRACK', this.accessory.displayName);
            break;
          }
          case this.platform.Characteristic.RemoteKey.PREVIOUS_TRACK: {
            this.platform.log.debug('TV %s Set Remote Key Pressed: PREVIOUS_TRACK', this.accessory.displayName);
            break;
          }
          case this.platform.Characteristic.RemoteKey.ARROW_UP: {
            this.platform.log.debug('TV %s Set Remote Key Pressed: ARROW_UP', this.accessory.displayName);
            //this.pushUpChanges();
            break;
          }
          case this.platform.Characteristic.RemoteKey.ARROW_DOWN: {
            this.platform.log.debug('TV %s Set Remote Key Pressed: ARROW_DOWN', this.accessory.displayName);
            //this.pushDownChanges();
            break;
          }
          case this.platform.Characteristic.RemoteKey.ARROW_LEFT: {
            this.platform.log.debug('TV %s Set Remote Key Pressed: ARROW_LEFT', this.accessory.displayName);
            //this.pushLeftChanges();
            break;
          }
          case this.platform.Characteristic.RemoteKey.ARROW_RIGHT: {
            this.platform.log.debug('TV %s Set Remote Key Pressed: ARROW_RIGHT', this.accessory.displayName);
            //this.pushRightChanges();
            break;
          }
          case this.platform.Characteristic.RemoteKey.SELECT: {
            this.platform.log.debug('TV %s Set Remote Key Pressed: SELECT', this.accessory.displayName);
            //this.pushOkChanges();
            break;
          }
          case this.platform.Characteristic.RemoteKey.BACK: {
            this.platform.log.debug('TV %s Set Remote Key Pressed: BACK', this.accessory.displayName);
            //this.pushBackChanges();
            break;
          }
          case this.platform.Characteristic.RemoteKey.EXIT: {
            this.platform.log.debug('TV %s Set Remote Key Pressed: EXIT', this.accessory.displayName);
            break;
          }
          case this.platform.Characteristic.RemoteKey.PLAY_PAUSE: {
            this.platform.log.debug('TV %s Set Remote Key Pressed: PLAY_PAUSE', this.accessory.displayName);
            break;
          }
          case this.platform.Characteristic.RemoteKey.INFORMATION: {
            this.platform.log.debug('TV %s Set Remote Key Pressed: INFORMATION', this.accessory.displayName);
            //this.pushMenuChanges();
            break;
          }
        }

        // don't forget to callback!
        callback(null);
      });

    /**
     * Create a speaker service to allow volume control
     */
    // create a new Television Speaker service
    (this.speakerService =
      this.accessory.getService(this.platform.Service.TelevisionSpeaker) ||
      this.accessory.addService(this.platform.Service.TelevisionSpeaker)),
    `${this.device.deviceName} ${this.device.remoteType} Speaker`;

    this.speakerService
      .setCharacteristic(this.platform.Characteristic.Active, this.platform.Characteristic.Active.ACTIVE)
      .setCharacteristic(
        this.platform.Characteristic.VolumeControlType,
        this.platform.Characteristic.VolumeControlType.ABSOLUTE,
      );

    // handle volume control
    this.speakerService
      .getCharacteristic(this.platform.Characteristic.VolumeSelector)
      .on(CharacteristicEventTypes.SET, (value, callback: CharacteristicGetCallback) => {
        this.platform.log.debug('TV %s Set VolumeSelector: %s', this.accessory.displayName, value);
        if (value === this.platform.Characteristic.VolumeSelector.INCREMENT) {
          this.pushVolumeUpChanges();
        } else {
          this.pushVolumeDownChanges();
        }
        callback(null);
      });
  }

  /**
   * Pushes the requested changes to the SwitchBot API
   * deviceType	commandType     Command	          command parameter	         Description
   * TV:        "command"       "turnOff"         "default"	        =        set to OFF state
   * TV:        "command"       "turnOn"          "default"	        =        set to ON state
   * TV:        "command"       "volumeAdd"       "default"	        =        volume up
   * TV:        "command"       "volumeSub"       "default"	        =        volume down
   * TV:        "command"       "channelAdd"      "default"	        =        next channel
   * TV:        "command"       "channelSub"      "default"	        =        previous channel
   */
  async pushTVonChanges() {
    if (this.Active !== 1){
      const payload = {
        commandType: 'command',
        parameter: 'default',
        command: 'turnOn',
      } as any;
      await this.pushTVChanges(payload);
    }
  }

  async pushTVoffChanges() {
    const payload = {
      commandType: 'command',
      parameter: 'default',
      command: 'turnOff',
    } as any;
    await this.pushTVChanges(payload);
  }

  async pushOkChanges() {
    const payload = {
      commandType: 'command',
      parameter: 'default',
      command: 'Ok',
    } as any;
    await this.pushTVChanges(payload);
  }

  async pushBackChanges() {
    const payload = {
      commandType: 'command',
      parameter: 'default',
      command: 'Back',
    } as any;
    await this.pushTVChanges(payload);
  }

  async pushMenuChanges() {
    const payload = {
      commandType: 'command',
      parameter: 'default',
      command: 'Menu',
    } as any;
    await this.pushTVChanges(payload);
  }

  async pushUpChanges() {
    const payload = {
      commandType: 'command',
      parameter: 'default',
      command: 'Up',
    } as any;
    await this.pushTVChanges(payload);
  }

  async pushDownChanges() {
    const payload = {
      commandType: 'command',
      parameter: 'default',
      command: 'Down',
    } as any;
    await this.pushTVChanges(payload);
  }

  async pushRightChanges() {
    const payload = {
      commandType: 'command',
      parameter: 'default',
      command: 'Right',
    } as any;
    await this.pushTVChanges(payload);
  }

  async pushLeftChanges() {
    const payload = {
      commandType: 'command',
      parameter: 'default',
      command: 'Left',
    } as any;
    await this.pushTVChanges(payload);
  }

  async pushVolumeUpChanges() {
    const payload = {
      commandType: 'command',
      parameter: 'default',
      command: 'volumeAdd',
    } as any;
    await this.pushTVChanges(payload);
  }

  async pushVolumeDownChanges() {
    const payload = {
      commandType: 'command',
      parameter: 'default',
      command: 'volumeSub',
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
