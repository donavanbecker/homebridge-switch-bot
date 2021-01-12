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
export class HubMini {
  private service: Service;

  Reachable;
  LinkQuality;
  AccessoryIdentifier;
  Category;
  deviceStatus!: deviceStatusResponse;

  hubUpdateInProgress!: boolean;
  doHubUpdate!: any;

  constructor(
    private readonly platform: SwitchBotPlatform,
    private accessory: PlatformAccessory,
    public device: device,
  ) {
    // default placeholders
    this.Reachable = true;
    this.LinkQuality = 4;
    this.AccessoryIdentifier = this.device.deviceName;
    this.Category = 16;

    // this is subject we use to track when we need to POST changes to the SwitchBot API
    this.doHubUpdate = new Subject();
    this.hubUpdateInProgress = false;

    // Retrieve initial values and updateHomekit
    this.refreshStatus();

    // set accessory information
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'SwitchBot')
      .setCharacteristic(this.platform.Characteristic.Model, 'SWITCHBOT-HUBMINI')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.device.deviceId);

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    (this.service =
      this.accessory.getService(this.platform.Service.BridgingState) ||
      this.accessory.addService(this.platform.Service.BridgingState)),
    `${this.device.deviceName} ${this.device.deviceType}`;

    // To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
    // when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
    // this.accessory.getService('NAME') ?? this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE');

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      `${this.device.deviceName} ${this.device.deviceType}`,
    );

    // Retrieve initial values and updateHomekit
    this.updateHomeKitCharacteristics();

    // Start an update interval
    interval(this.platform.config.options!.refreshRate! * 1000)
      .pipe(skipWhile(() => this.hubUpdateInProgress))
      .subscribe(() => {
        this.refreshStatus();
      });

    // Watch for hub change events
    // We put in a debounce of 100ms so we don't make duplicate calls
    this.doHubUpdate
      .pipe(
        tap(() => {
          this.hubUpdateInProgress = true;
        }),
        debounceTime(100),
      )
      .subscribe(async () => {
        this.hubUpdateInProgress = false;
      });
  }

  /**
   * Parse the device status from the SwitchBot api
   */
  parseStatus() {
    if (this.deviceStatus.statusCode === 100 && this.deviceStatus.message === 'success') {
      this.Reachable = true;
      this.LinkQuality = 4;
      this.Category = 16;
    } else {
      this.Reachable = false;
      this.LinkQuality = 1;
      this.Category = 1;
    }
    this.AccessoryIdentifier = this.device.deviceName;
    
    this.platform.log.debug(
      'hub %s CurrentRelativeHumidity -',
      this.accessory.displayName,
      'Device Info: ',
      this.Reachable,
      this.LinkQuality,
      this.Category,
      this.AccessoryIdentifier,
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
          'hub %s refreshStatus -',
          this.accessory.displayName,
          JSON.stringify(this.deviceStatus),
        );

        this.parseStatus();
        this.updateHomeKitCharacteristics();
      }
    } catch (e) {
      this.platform.log.error(
        `hub - Failed to update status of ${this.device.deviceName}`,
        JSON.stringify(e.message),
        this.platform.log.debug('hub %s -', this.accessory.displayName, JSON.stringify(e)),
      );
    }
  }

  /**
   * Updates the status for each of the HomeKit Characteristics
   */
  updateHomeKitCharacteristics() {
    this.service.updateCharacteristic(
      this.platform.Characteristic.Reachable,
      this.Reachable,
    );
    this.service.updateCharacteristic(
      this.platform.Characteristic.LinkQuality,
      this.LinkQuality,
    );
    this.service.updateCharacteristic(
      this.platform.Characteristic.AccessoryIdentifier,
      this.AccessoryIdentifier,
    );
    this.service.updateCharacteristic(
      this.platform.Characteristic.Category,
      this.Category,
    );
  }
}
