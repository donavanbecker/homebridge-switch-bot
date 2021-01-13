import { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import { SwitchBotPlatform } from '../platform';
import { interval, Subject } from 'rxjs';
import { debounceTime, skipWhile, tap } from 'rxjs/operators';
import { DeviceURL } from '../settings';
import { irdevice, deviceStatusResponse } from '../configTypes';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class TV {
  tvService!: Service;

  deviceStatus!: deviceStatusResponse;

  tvUpdateInProgress!: boolean;
  doTVUpdate!: any;
  Active!: CharacteristicValue;

  constructor(
    private readonly platform: SwitchBotPlatform,
    private accessory: PlatformAccessory,
    public device: irdevice,
  ) {
    // default placeholders

    // this is subject we use to track when we need to POST changes to the SwitchBot API
    this.doTVUpdate = new Subject();
    this.tvUpdateInProgress = false;

    // Retrieve initial values and updateHomekit
    this.refreshStatus();

    // set accessory information
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'SwitchBot')
      .setCharacteristic(this.platform.Characteristic.Model, this.device.remoteType)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.device.deviceId);

    // get the name
    const tvName = this.device.deviceName || 'SwitchBot TV';

    // set the accessory category
    this.accessory.category = this.platform.api.hap.Categories.TELEVISION;

    // add the tv service
    const tvService = this.accessory.addService(this.platform.Service.Television);

    // set the tv name
    tvService.setCharacteristic(this.platform.Characteristic.ConfiguredName, tvName);

    // set sleep discovery characteristic
    tvService.setCharacteristic(
      this.platform.Characteristic.SleepDiscoveryMode,
      this.platform.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE,
    );

    // handle on / off events using the Active characteristic
    tvService.getCharacteristic(this.platform.Characteristic.Active).on('set', (newValue, callback) => {
      this.platform.log.info('set Active => setNewValue: ' + newValue);
      tvService.updateCharacteristic(this.platform.Characteristic.Active, 1);
      callback(null);
    });

    tvService.setCharacteristic(this.platform.Characteristic.ActiveIdentifier, 1);

    // handle input source changes
    tvService.getCharacteristic(this.platform.Characteristic.ActiveIdentifier).on('set', (newValue, callback) => {
      // the value will be the value you set for the Identifier Characteristic
      // on the Input Source service that was selected - see input sources below.

      this.platform.log.info('set Active Identifier => setNewValue: ' + newValue);
      callback(null);
    });

    // handle remote control input
    tvService.getCharacteristic(this.platform.Characteristic.RemoteKey).on('set', (newValue, callback) => {
      switch (newValue) {
        case this.platform.Characteristic.RemoteKey.REWIND: {
          this.platform.log.info('set Remote Key Pressed: REWIND');
          break;
        }
        case this.platform.Characteristic.RemoteKey.FAST_FORWARD: {
          this.platform.log.info('set Remote Key Pressed: FAST_FORWARD');
          break;
        }
        case this.platform.Characteristic.RemoteKey.NEXT_TRACK: {
          this.platform.log.info('set Remote Key Pressed: NEXT_TRACK');
          break;
        }
        case this.platform.Characteristic.RemoteKey.PREVIOUS_TRACK: {
          this.platform.log.info('set Remote Key Pressed: PREVIOUS_TRACK');
          break;
        }
        case this.platform.Characteristic.RemoteKey.ARROW_UP: {
          this.platform.log.info('set Remote Key Pressed: ARROW_UP');
          break;
        }
        case this.platform.Characteristic.RemoteKey.ARROW_DOWN: {
          this.platform.log.info('set Remote Key Pressed: ARROW_DOWN');
          break;
        }
        case this.platform.Characteristic.RemoteKey.ARROW_LEFT: {
          this.platform.log.info('set Remote Key Pressed: ARROW_LEFT');
          break;
        }
        case this.platform.Characteristic.RemoteKey.ARROW_RIGHT: {
          this.platform.log.info('set Remote Key Pressed: ARROW_RIGHT');
          break;
        }
        case this.platform.Characteristic.RemoteKey.SELECT: {
          this.platform.log.info('set Remote Key Pressed: SELECT');
          break;
        }
        case this.platform.Characteristic.RemoteKey.BACK: {
          this.platform.log.info('set Remote Key Pressed: BACK');
          break;
        }
        case this.platform.Characteristic.RemoteKey.EXIT: {
          this.platform.log.info('set Remote Key Pressed: EXIT');
          break;
        }
        case this.platform.Characteristic.RemoteKey.PLAY_PAUSE: {
          this.platform.log.info('set Remote Key Pressed: PLAY_PAUSE');
          break;
        }
        case this.platform.Characteristic.RemoteKey.INFORMATION: {
          this.platform.log.info('set Remote Key Pressed: INFORMATION');
          break;
        }
      }

      // don't forget to callback!
      callback(null);
    });

    /**
     * Create a speaker service to allow volume control
     */

    const speakerService = this.accessory.addService(this.platform.Service.TelevisionSpeaker);

    speakerService
      .setCharacteristic(this.platform.Characteristic.Active, this.platform.Characteristic.Active.ACTIVE)
      .setCharacteristic(
        this.platform.Characteristic.VolumeControlType,
        this.platform.Characteristic.VolumeControlType.ABSOLUTE,
      );

    // handle volume control
    speakerService.getCharacteristic(this.platform.Characteristic.VolumeSelector).on('set', (newValue, callback) => {
      this.platform.log.info('set VolumeSelector => setNewValue: ' + newValue);
      callback(null);
    });

    // Retrieve initial values and updateHomekit
    this.updateHomeKitCharacteristics();

    // Start an update interval
    interval(this.platform.config.options!.refreshRate! * 1000)
      .pipe(skipWhile(() => this.tvUpdateInProgress))
      .subscribe(() => {
        this.refreshStatus();
      });

    // Watch for TV change events
    // We put in a debounce of 100ms so we don't make duplicate calls
    this.doTVUpdate
      .pipe(
        tap(() => {
          this.tvUpdateInProgress = true;
        }),
        debounceTime(100),
      )
      .subscribe(async () => {
        try {
          await this.pushChanges();
        } catch (e) {
          this.platform.log.error(JSON.stringify(e.message));
          this.platform.log.debug('TV %s -', this.accessory.displayName, JSON.stringify(e));
        }
        this.tvUpdateInProgress = false;
      });
  }

  /**
   * Parse the device status from the SwitchBot api
   */
  parseStatus() {
    this.platform.log.debug('TV %s Active: %s', this.accessory.displayName, this.Active);
  }

  /**
   * Asks the SwitchBot API for the latest device information
   */
  async refreshStatus() {
    try {
      const deviceStatus: deviceStatusResponse = (
        await this.platform.axios.get(`${DeviceURL}/${this.device.deviceId}/status`)
      ).data;
      if (deviceStatus.message === 'success') {
        this.deviceStatus = deviceStatus;
        this.platform.log.debug('TV %s refreshStatus -', this.accessory.displayName, JSON.stringify(this.deviceStatus));

        this.parseStatus();
        this.updateHomeKitCharacteristics();
      }
    } catch (e) {
      this.platform.log.error(
        `TV - Failed to update status of ${this.device.deviceName}`,
        JSON.stringify(e.message),
        this.platform.log.debug('TV %s -', this.accessory.displayName, JSON.stringify(e)),
      );
    }
  }

  /**
   * Pushes the requested changes to the SwitchBot API
   * deviceType	commandType	  Command	    command parameter	  Description
   * TV   -    "command"     "turnOff"   "default"	  =        set to OFF state
   * TV   -    "command"     "turnOn"    "default"	  =        set to ON state
   * TV   -    "command"     "press"     "default"	  =        trigger press
   */
  async pushChanges() {
    const payload = {
      commandType: 'command',
      parameter: 'default',
      command: '',
    } as any;

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
    this.refreshStatus();
  }

  /**
   * Updates the status for each of the HomeKit Characteristics
   */
  updateHomeKitCharacteristics() {
    //this.tvService.updateCharacteristic(this.platform.Characteristic.Active, this.Active);
  }

}
