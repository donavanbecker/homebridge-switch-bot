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
export class AirConditioner {
  service!: Service;

  Active!: CharacteristicValue;
  RotationSpeed!: number;
  lastTemperature!: number;
  currentTemperature!: number;
  currentMode!: number;
  currentFanSpeed!: number;
  busy: any;
  timeout: any = null;
  static MODE_AUTO: number;
  static MODE_COOL: number;
  static MODE_HEAT: number;
  validValues: number[];


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
      this.accessory.getService(this.platform.Service.HeaterCooler) ||
      this.accessory.addService(this.platform.Service.HeaterCooler)),
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

    this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .setProps({
        minValue: 0,
        maxValue: 100,
        minStep: 0.01,
      })
      .on(CharacteristicEventTypes.GET, this.handleCurrentTemperatureGet.bind(this));

    if (this.platform.config.options?.irair?.hide_automode) {
      this.validValues = [1, 2];
    } else {
      this.validValues = [0, 1, 2];
    }
    this.service.getCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState)
      .setProps({
        validValues: this.validValues,
      })
      .on(CharacteristicEventTypes.SET, this.setMode.bind(this));
    

    this.service.getCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState)
      .on(CharacteristicEventTypes.GET, this.getCurrentHeaterCoolerState.bind(this));  

    this.service.getCharacteristic(this.platform.Characteristic.HeatingThresholdTemperature)
      .setProps({
        minValue: 16,
        maxValue: 30,
        minStep: 1,
      })
      .on(CharacteristicEventTypes.GET, this.getHeatingUpOrDwTemperature.bind(this))
      .on(CharacteristicEventTypes.SET, this.setHeatingUpOrDwTemperature.bind(this));
      
    this.service.getCharacteristic(this.platform.Characteristic.CoolingThresholdTemperature)
      .setProps({
        minValue: 16,
        maxValue: 30,
        minStep: 1,
      })
      .on(CharacteristicEventTypes.GET, this.getHeatingUpOrDwTemperature.bind(this))
      .on(CharacteristicEventTypes.SET, this.setHeatingUpOrDwTemperature.bind(this));
  
    this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .setProps({
        minStep: 1,
        minValue: 1,
        maxValue: 4,
      })
      .on(CharacteristicEventTypes.GET, (callback) => {
        if (!this.currentFanSpeed || this.currentFanSpeed === 1) {
          callback(null, 4);
        } else {
          callback(null, this.currentFanSpeed - 1);
        }
      })
      .on(CharacteristicEventTypes.SET, (value: any, callback) => {
        this.platform.log.debug('');
        if (value === 4) {
          this.currentFanSpeed = 1;
        } else {
          this.currentFanSpeed = value + 1;
        }
        this.pushAirConditionerStatusChanges();
        this.service.updateCharacteristic(this.platform.Characteristic.RotationSpeed, this.currentFanSpeed || 1);
        callback(null, this.currentFanSpeed || 1);
      });
  
  }

  handleCurrentTemperatureGet(callback: CharacteristicGetCallback) {
    this.platform.log.debug('Trigger Get CurrentTemperture');
    this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature).updateValue(this.currentTemperature || 24);
    callback(null, this.currentTemperature || 24);
  }

  setMode(state, callback: CharacteristicGetCallback) {
    switch(state){
      case this.platform.Characteristic.TargetHeaterCoolerState.AUTO:
        this.currentMode = AirConditioner.MODE_AUTO;
        break;
      case this.platform.Characteristic.TargetHeaterCoolerState.COOL:  
        this.currentMode = AirConditioner.MODE_COOL;
        break;
      case this.platform.Characteristic.TargetHeaterCoolerState.HEAT:
        this.currentMode = AirConditioner.MODE_HEAT;
        break;
      default:
        break;
    }
    this.pushAirConditionerStatusChanges();
    callback(null);
  }

  getCurrentHeaterCoolerState(callback: CharacteristicGetCallback) {
    if (this.Active === 1) {
      if ((this.currentTemperature || 24) < (this.lastTemperature || 30)){
        callback(null, this.platform.Characteristic.CurrentHeaterCoolerState.COOLING);
      } else {
        callback(null, this.platform.Characteristic.CurrentHeaterCoolerState.HEATING);
      }
    } else {
      callback(null, this.platform.Characteristic.CurrentHeaterCoolerState.INACTIVE);
    }
  }

  getHeatingUpOrDwTemperature(callback: CharacteristicGetCallback) {
    callback(null, this.currentTemperature || 24);
  }

  setHeatingUpOrDwTemperature(temp, callback: CharacteristicGetCallback) {
    try {
      this.pushAirConditionerStatusChanges();
      this.lastTemperature = this.currentTemperature;
      this.currentTemperature = parseInt(temp);
    } catch (error) {
      this.platform.log.error(error);
      callback(error);
    }
  }

  /**
	 * Pushes the requested changes to the SwitchBot API
	 * deviceType				commandType     Command	          command parameter	         Description
	 * AirConditioner:        "command"       "swing"          "default"	        =        swing
	 * AirConditioner:        "command"       "timer"          "default"	        =        timer
	 * AirConditioner:        "command"       "lowSpeed"       "default"	        =        fan speed to low
	 * AirConditioner:        "command"       "middleSpeed"    "default"	        =        fan speed to medium
	 * AirConditioner:        "command"       "highSpeed"      "default"	        =        fan speed to high
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
    try {
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
    } catch (e) {
      this.apiError(e);
    }
  }

  public apiError(e: any) {
    this.service.updateCharacteristic(this.platform.Characteristic.Active, e);
    this.service.updateCharacteristic(this.platform.Characteristic.RotationSpeed, e);
    this.service.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, e);
    this.service.updateCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState, e);
    this.service.updateCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState, e);
    this.service.updateCharacteristic(this.platform.Characteristic.HeatingThresholdTemperature, e);
  }

}
