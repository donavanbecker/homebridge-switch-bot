import { Service, PlatformAccessory } from 'homebridge';
import { SwitchBotPlatform } from '../platform';
import { interval, Subject } from 'rxjs';
import { debounceTime, skipWhile, tap } from 'rxjs/operators';
import { DeviceURL } from '../settings';
import { device, deviceStatusResponse } from '../configTypes';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class Meter {
  private service: Service;
  temperatureservice: Service;
  humidityservice: Service;

  CurrentRelativeHumidity!: number;
  CurrentTemperature!: number;
  BatteryLevel!: number;
  ChargingState!: number;
  StatusLowBattery!: number;
  Active!: number;
  WaterLevel!: number;
  deviceStatus!: deviceStatusResponse;
  humidity!: number;

  meterUpdateInProgress!: boolean;
  doMeterUpdate!: any;

  constructor(
    private readonly platform: SwitchBotPlatform,
    private accessory: PlatformAccessory,
    public device: device,
  ) {
    // default placeholders
    this.BatteryLevel= 100;
    this.ChargingState;
    this.StatusLowBattery = this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;
    this.CurrentRelativeHumidity = 100;
    this.CurrentTemperature = 100;

    // this is subject we use to track when we need to POST changes to the SwitchBot API
    this.doMeterUpdate = new Subject();
    this.meterUpdateInProgress = false;

    // Retrieve initial values and updateHomekit
    this.refreshStatus();

    // set accessory information
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'SwitchBot')
      .setCharacteristic(this.platform.Characteristic.Model, 'SWITCHBOT-METERTH-S1')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.device.deviceId);

    // get the BatteryService service if it exists, otherwise create a new Battery service
    // you can create multiple services for each accessory
    (this.service =
      this.accessory.getService(this.platform.Service.BatteryService) ||
      this.accessory.addService(this.platform.Service.BatteryService)),
    `${this.device.deviceName} ${this.device.deviceType}`;

    // To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
    // when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
    // this.accessory.getService('NAME') ?? this.accessory.addService(this.platform.Service.Battery, 'NAME', 'USER_DEFINED_SUBTYPE');

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      `${this.device.deviceName} ${this.device.deviceType}`,
    );

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/BatteryService

    // create handlers for required characteristics
    this.service.setCharacteristic(this.platform.Characteristic.ChargingState, 2);

    // create a new Humidity Sensor service
    (this.humidityservice =
      this.accessory.getService(this.platform.Service.HumiditySensor) ||
      this.accessory.addService(this.platform.Service.HumiditySensor)),
    `${this.device.deviceName} ${this.device.deviceType}`;

    // create a new Temperature Sensor service
    (this.temperatureservice =
      this.accessory.getService(this.platform.Service.TemperatureSensor) ||
      this.accessory.addService(this.platform.Service.TemperatureSensor)),
    `${this.device.deviceName} ${this.device.deviceType}`;

    // Retrieve initial values and updateHomekit
    this.updateHomeKitCharacteristics();

    // Start an update interval
    interval(this.platform.config.options!.refreshRate! * 1000)
      .pipe(skipWhile(() => this.meterUpdateInProgress))
      .subscribe(() => {
        this.refreshStatus();
      });

    // Watch for Meter change events
    // We put in a debounce of 100ms so we don't make duplicate calls
    this.doMeterUpdate
      .pipe(
        tap(() => {
          this.meterUpdateInProgress = true;
        }),
        debounceTime(100),
      )
      .subscribe(async () => {
        this.meterUpdateInProgress = false;
      });
  }

  /**
   * Parse the device status from the SwitchBot api
   */
  parseStatus() {
    // Set Room Sensor State
    if (this.deviceStatus.body) {
      this.BatteryLevel = 100;
    } else {
      this.BatteryLevel = 10;
    }
    if (this.BatteryLevel < 15) {
      this.StatusLowBattery = 1;
    } else {
      this.StatusLowBattery = 0;
    }
    // Current Relative Humidity
    this.CurrentRelativeHumidity = this.deviceStatus.body.humidity;
    // Current Temperature
    this.CurrentTemperature = this.deviceStatus.body.temperature;
    this.platform.log.debug(
      'Meter %s - %s°c, %s%',
      this.accessory.displayName,
      this.CurrentTemperature,
      this.CurrentRelativeHumidity,
    );
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
        this.platform.log.debug(
          'Meter %s refreshStatus -',
          this.accessory.displayName,
          JSON.stringify(this.deviceStatus),
        );

        this.parseStatus();
        this.updateHomeKitCharacteristics();
      }
    } catch (e) {
      this.platform.log.error(
        'Meter - Failed to update status of',
        this.device.deviceName,
        JSON.stringify(e.message),
        this.platform.log.debug('Meter %s -', this.accessory.displayName, JSON.stringify(e)),
      );
    }
  }

  /**
   * Updates the status for each of the HomeKit Characteristics
   */
  updateHomeKitCharacteristics() {
    this.service.updateCharacteristic(this.platform.Characteristic.StatusLowBattery, this.StatusLowBattery);
    this.service.updateCharacteristic(this.platform.Characteristic.BatteryLevel, this.BatteryLevel);
    this.humidityservice.updateCharacteristic(
      this.platform.Characteristic.CurrentRelativeHumidity,
      this.CurrentRelativeHumidity,
    );
    this.temperatureservice.updateCharacteristic(
      this.platform.Characteristic.CurrentTemperature,
      this.CurrentTemperature,
    );
  }
}
