import { Service, PlatformAccessory, CharacteristicEventTypes } from 'homebridge';
import { SwitchBotPlatform } from '../platform';
import { interval, Subject } from 'rxjs';
import { debounceTime, skipWhile, tap } from 'rxjs/operators';
import { DeviceURL } from '../settings';
import { device, deviceStatusResponse } from '../configTypes';

export class Curtain {
  private service: Service;

  CurrentPosition!: number;
  PositionState!: number;
  TargetPosition!: number;
  deviceStatus!: deviceStatusResponse;

  curtainUpdateInProgress!: boolean;
  doCurtainUpdate!: any;

  setNewTarget!: boolean;
  setNewTargetTimer!: NodeJS.Timeout;

  constructor(
    private readonly platform: SwitchBotPlatform,
    private accessory: PlatformAccessory,
    public device: device,
  ) {
    // default placeholders
    this.CurrentPosition = 100;
    this.PositionState = this.platform.Characteristic.PositionState.STOPPED;
    this.TargetPosition = 100;

    // this is subject we use to track when we need to POST changes to the SwitchBot API
    this.doCurtainUpdate = new Subject();
    this.curtainUpdateInProgress = false;
    this.setNewTarget = false;

    // Retrieve initial values and updateHomekit
    this.refreshStatus();

    // set accessory information
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'SwitchBot')
      .setCharacteristic(this.platform.Characteristic.Model, 'SWITCHBOT-CURTAIN-W0701600')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.device.deviceId);

    // get the WindowCovering service if it exists, otherwise create a new WindowCovering service
    // you can create multiple services for each accessory
    (this.service =
      this.accessory.getService(this.platform.Service.WindowCovering) ||
      this.accessory.addService(this.platform.Service.WindowCovering)),
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

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/WindowCovering

    // create handlers for required characteristics
    this.service.setCharacteristic(this.platform.Characteristic.PositionState, this.PositionState);

    this.service.setCharacteristic(this.platform.Characteristic.CurrentPosition, this.CurrentPosition);

    this.service
      .getCharacteristic(this.platform.Characteristic.TargetPosition)
      .setProps({
        minStep: this.platform.config.options?.curtain?.set_minStep || 1,
        minValue: this.platform.config.options?.curtain?.set_min || 0,
        maxValue: this.platform.config.options?.curtain?.set_max || 100,
        validValueRanges: [0, 100],
      })
      .on(CharacteristicEventTypes.SET, this.handleTargetPositionSet.bind(this));

    // Update Homekit
    this.updateHomeKitCharacteristics();

    // Start an update interval
    interval(this.platform.config.options!.refreshRate! * 1000)
      .pipe(skipWhile(() => this.curtainUpdateInProgress))
      .subscribe(() => {
        this.refreshStatus();
      });

    // update slide progress
    interval(1000)
      .pipe(skipWhile(() => this.curtainUpdateInProgress))
      .subscribe(() => {
        if (this.PositionState === this.platform.Characteristic.PositionState.STOPPED) {
          return;
        }
        this.platform.log.debug('Refresh status when moving', this.PositionState);
        this.refreshStatus();
      });

    // Watch for Curtain change events
    // We put in a debounce of 100ms so we don't make duplicate calls
    this.doCurtainUpdate
      .pipe(
        tap(() => {
          this.curtainUpdateInProgress = true;
        }),
        debounceTime(100),
      )
      .subscribe(async () => {
        try {
          await this.pushChanges();
        } catch (e) {
          this.platform.log.error(JSON.stringify(e.message));
          this.platform.log.debug('Curtain %s -', this.accessory.displayName, JSON.stringify(e));
        }
        this.curtainUpdateInProgress = false;
      });
  }

  parseStatus() {
    // CurrentPosition
    this.CurrentPosition = this.set_maxCurrentOption() - this.deviceStatus.body.slidePosition;
    this.platform.log.debug(
      'Curtain %s CurrentPosition -',
      this.accessory.displayName,
      'Device is Currently: ',
      this.CurrentPosition,
    );

    // this.platform.log.info(
    //   'Curtain %s -',
    //   this.accessory.displayName,
    //   'Current position:',
    //   this.CurrentPosition,
    //   'target position',
    //   this.TargetPosition,
    //   'moving',
    //   this.deviceStatus.body.moving,
    //   'setNewTarget',
    //   this.setNewTarget,
    //   'state',
    //   this.PositionState
    // );
    // PositionState
    if (this.deviceStatus.body.moving) {
      this.setNewTarget = false;
      if (this.TargetPosition > this.CurrentPosition) {
        this.platform.log.debug(
          'Curtain %s -',
          this.accessory.displayName,
          'Current position:',
          this.CurrentPosition,
          'closing',
        );
        this.PositionState = this.platform.Characteristic.PositionState.INCREASING;
      } else if (this.TargetPosition < this.CurrentPosition) {
        this.platform.log.debug(
          'Curtain %s -',
          this.accessory.displayName,
          'Current position:',
          this.CurrentPosition,
          'opening',
        );
        this.PositionState = this.platform.Characteristic.PositionState.DECREASING;
      } else {
        this.platform.log.debug('Curtain %s -', this.CurrentPosition, 'standby');
        this.PositionState = this.platform.Characteristic.PositionState.STOPPED;
      }
    } else {
      this.platform.log.debug(
        'Curtain %s -',
        this.accessory.displayName,
        'Current position:',
        this.CurrentPosition,
        'standby',
      );
      if (!this.setNewTarget) {
        /*If Curtain calibration distance is short, there will be an error between the current percentage and the target percentage.*/
        this.TargetPosition = this.CurrentPosition;
        this.PositionState = this.platform.Characteristic.PositionState.STOPPED;
      }
    }
  }

  async refreshStatus() {
    try {
      this.platform.log.debug('Curtain - Reading', `${DeviceURL}/${this.device.deviceId}/status`);
      const deviceStatus: deviceStatusResponse = (
        await this.platform.axios.get(`${DeviceURL}/${this.device.deviceId}/status`)
      ).data;
      if (deviceStatus.message === 'success') {
        this.deviceStatus = deviceStatus;
        this.platform.log.debug(
          'Curtain %s refreshStatus -',
          this.accessory.displayName,
          JSON.stringify(this.deviceStatus),
        );

        this.parseStatus();
        this.updateHomeKitCharacteristics();
      }
    } catch (e) {
      this.platform.log.error(
        `Curtain - Failed to refresh status of ${this.device.deviceName}`,
        JSON.stringify(e.message),
        this.platform.log.debug('Curtain %s -', this.accessory.displayName, JSON.stringify(e)),
      );
    }
  }

  async pushChanges() {
    if (this.TargetPosition !== this.CurrentPosition) {
      this.platform.log.debug(`Pushing ${this.TargetPosition}`);
      const adjustedTargetPosition = this.set_maxCurrentOption() - this.TargetPosition;
      const payload = {
        commandType: 'command',
        command: 'setPosition',
        parameter: `0,ff,${adjustedTargetPosition}`,
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
      this.platform.log.debug('Curtain %s pushChanges -', this.accessory.displayName, JSON.stringify(payload));

      // Make the API request
      const push = await this.platform.axios.post(`${DeviceURL}/${this.device.deviceId}/commands`, payload);
      this.platform.log.debug('Curtain %s Changes pushed -', this.accessory.displayName, push.data);
    }
  }

  private set_maxCurrentOption() {
    return this.platform.config.options?.curtain?.set_max || 100;
  }

  updateHomeKitCharacteristics() {
    this.platform.log.debug(
      'Curtain %s updateHomeKitCharacteristics -',
      this.accessory.displayName,
      JSON.stringify({
        CurrentPosition: this.CurrentPosition,
        PositionState: this.PositionState,
        TargetPosition: this.TargetPosition,
      }),
    );
    this.service.updateCharacteristic(this.platform.Characteristic.CurrentPosition, this.CurrentPosition);
    this.service.updateCharacteristic(this.platform.Characteristic.PositionState, this.PositionState);
    this.service.updateCharacteristic(this.platform.Characteristic.TargetPosition, this.TargetPosition);
  }

  handleTargetPositionSet(value, callback) {
    this.platform.log.debug('Curtain %s -', this.accessory.displayName, `Set TargetPosition: ${value}`);

    this.TargetPosition = value;
    this.service.updateCharacteristic(this.platform.Characteristic.TargetPosition, this.TargetPosition);

    if (value > this.CurrentPosition) {
      this.PositionState = this.platform.Characteristic.PositionState.INCREASING;
      this.setNewTarget = true;
    } else if (value < this.CurrentPosition) {
      this.PositionState = this.platform.Characteristic.PositionState.DECREASING;
      this.setNewTarget = true;
    } else {
      this.PositionState = this.platform.Characteristic.PositionState.STOPPED;
      this.setNewTarget = false;
    }
    this.service.setCharacteristic(this.platform.Characteristic.PositionState, this.PositionState);

    /**
     * If Curtain movement time is short, the moving flag from backend is always false.
     * The minimum time depends on the network control latency.
     */
    clearTimeout(this.setNewTargetTimer);
    if (this.setNewTarget) {
      this.setNewTargetTimer = setTimeout(() => {
        this.platform.log.debug(
          'Curtain %s -',
          this.accessory.displayName,
          'setNewTarget',
          this.setNewTarget,
          'timeout',
        );
        this.setNewTarget = false;
      }, 10000);
    }

    this.doCurtainUpdate.next();
    callback(null);
  }
}
