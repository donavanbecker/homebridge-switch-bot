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
export class AirPurifier {
  service!: Service;

  Active!: CharacteristicValue;
  RotationSpeed!: number;
  lastTemperature!: number;
  currentTemperature!: number;
  currentMode!: number;
  currentFanSpeed!: number;
  busy: any;
  timeout: any = null;
  static PURIFYING_AIR: number;
  static IDLE: number;
  static INACTIVE: number;


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
      this.accessory.getService(this.platform.Service.AirPurifier) ||
      this.accessory.addService(this.platform.Service.AirPurifier)),
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
        this.platform.log.debug('%s %s Set Active: %s', this.device.remoteType, this.accessory.displayName, value);
        try {
          if (value === this.platform.Characteristic.Active.INACTIVE) {
            this.pushAirConditionerOffChanges();
          } else {
            this.pushAirConditionerOnChanges();
          }
          this.Active = value;
          this.service.updateCharacteristic(this.platform.Characteristic.Active, this.Active);
          callback(null);
        } catch (errror) {
          callback(errror);
        }
      });

    this.service.getCharacteristic(this.platform.Characteristic.CurrentAirPurifierState)
      .on(CharacteristicEventTypes.GET, this.getCurrentAirPurifierState.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.TargetAirPurifierState)
      .on(CharacteristicEventTypes.SET, this.setCurrentAirPurifierState.bind(this));  
  
  }

  setCurrentAirPurifierState(state, callback: CharacteristicGetCallback) {
    switch(state){
      case this.platform.Characteristic.CurrentAirPurifierState.PURIFYING_AIR:
        this.currentMode = AirPurifier.PURIFYING_AIR;
        break;
      case this.platform.Characteristic.CurrentAirPurifierState.IDLE:  
        this.currentMode = AirPurifier.IDLE;
        break;
      case this.platform.Characteristic.CurrentAirPurifierState.INACTIVE:
        this.currentMode = AirPurifier.INACTIVE;
        break;
      default:
        break;
    }
    //this.pushAirConditionerStatusChanges();
    callback(null);
  }

  getCurrentAirPurifierState(callback: CharacteristicGetCallback) {
    if (this.Active === 1) {
      callback(null, this.platform.Characteristic.CurrentAirPurifierState.PURIFYING_AIR);
    } else {
      callback(null, this.platform.Characteristic.CurrentAirPurifierState.INACTIVE);
    }
  }

  /**
	 * Pushes the requested changes to the SwitchBot API
	 * deviceType				commandType     Command	          command parameter	         Description
	 * AirPurifier:        "command"       "turnOn"         "default"	        =        every home appliance can be turned on by default
	 * AirPurifier:        "command"       "turnOff"        "default"	        =        every home appliance can be turned off by default
   * AirPurifier:        "command"       "swing"          "default"	        =        swing
	 * AirPurifier:        "command"       "timer"          "default"	        =        timer
	 * AirPurifier:        "command"       "lowSpeed"       "default"	        =        fan speed to low
	 * AirPurifier:        "command"       "middleSpeed"    "default"	        =        fan speed to medium
	 * AirPurifier:        "command"       "highSpeed"      "default"	        =        fan speed to high
	 */
  async pushAirConditionerOnChanges() {
    if (this.Active !== 1) {
      const payload = {
        commandType: 'command',
        parameter: 'default',
        command: 'turnOn',
      } as any;
      await this.pushChanges(payload);
    }
  }

  async pushAirConditionerOffChanges() {
    if (this.Active !== 0) {
      const payload = {
        commandType: 'command',
        parameter: 'default',
        command: 'turnOff',
      } as any;
      await this.pushChanges(payload);
    }
  }

  async pushAirConditionerStatusChanges() {
    if (!this.busy) {
      this.busy = true;
      this.service.updateCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState,
        this.platform.Characteristic.CurrentHeaterCoolerState.IDLE);
    }
    clearTimeout(this.timeout);

    // Make a new timeout set to go off in 1000ms (1 second)
    this.timeout = setTimeout(this.pushAirConditionerDetailsChanges.bind(this), 1500);
  }

  async pushAirConditionerDetailsChanges() {
    const payload = {
      commandType: 'command',
      parameter: `${this.currentTemperature || 24},${this.currentMode || 1},${this.currentFanSpeed || 1},${this.Active === 1 ? 'on':'off'}`,
      command: 'setAll',
    } as any;

    if (this.Active === 1) {
      if ((this.currentTemperature || 24) < (this.lastTemperature || 30)) {
        this.service.updateCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState,
          this.platform.Characteristic.CurrentHeaterCoolerState.COOLING);
      } else {
        this.service.updateCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState,
          this.platform.Characteristic.CurrentHeaterCoolerState.HEATING);
      }
    } else {
      this.service.updateCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState,
        this.platform.Characteristic.CurrentHeaterCoolerState.INACTIVE);
    }

    await this.pushChanges(payload);
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
    this.platform.log.debug('%s %s pushChanges -', this.device.remoteType, this.accessory.displayName, JSON.stringify(payload));

    // Make the API request
    const push = await this.platform.axios.post(`${DeviceURL}/${this.device.deviceId}/commands`, payload);
    this.platform.log.debug('%s %s Changes pushed -', this.device.remoteType, this.accessory.displayName, push.data);
  }
}
