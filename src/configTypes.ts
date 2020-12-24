/* eslint-disable max-len */
import { PlatformConfig } from 'homebridge';

//Config
export interface SwitchBotPlatformConfig extends PlatformConfig {
  credentials?: credentials;
  devicediscovery?: boolean;
  options?: options;
}

export type credentials = {
  openToken?: any;
};

export type options = {
  ttl?: number;
  humidifier?: string;
};

export interface AxiosRequestConfig {
  params?: Record<string, unknown>;
  headers?: any;
}

export type deviceResponses = {
  statusCode: number | string;
  message: string;
  body: deviceList | infraredRemoteList;
};

//a list of physical devices.
export type deviceList = {
  device: Array<device>;
};

export type device = {
  deviceId: string; //device ID.
  deviceName: string; //device name.
  deviceType: string; //device type.
  enableCloudService: boolean; //determines if Cloud Service is enabled or not for the current device.
  hubDeviceId: string; //device's parent Hub ID.
  curtainDevicesIds: Array<string>; //only available for Curtain devices. a list of Curtain device IDs such that the Curtain devices are being paired or grouped.
  calibrate: boolean; //only available for Curtain devices. determines if the open position and the close position of a Curtain have been properly calibrated or not.
  group: boolean; //only available for Curtain devices. determines if a Curtain is paired with or grouped with another Curtain or not.
  master: boolean; //only available for Curtain devices. determines if a Curtain is the master device or not when paired with or grouped with another Curtain.
  openDirection: string; //only available for Curtain devices. the opening direction of a Curtain.
};

//a list of virtual infrared remote devices.
export type infraredRemoteList = {
  device: Array<irdevices>;
};

export type irdevices = {
  deviceId: string; //device ID
  deviceName: string; //device name
  remoteType: string; //device type
  hubDeviceId: string; //remote device's parent Hub ID
};

export type deviceStatusResponse = {
  statusCode: number;
  message: string;
  body: deviceStatus;
};

export type deviceStatus = {
  deviceId: string; //device ID.
  deviceType: string; //device type.
  hubDeviceId: string; //device's parent Hub ID.
  power: string; //only available for Bot/Plug/Humidifier devices. ON/OFF state.
  humidity: number; //only available for Meter/Humidifier devices. humidity percentage.
  temperature: number; //only available for Meter/Humidifier devices. temperature in celsius.
  nebulizationEfficiency: number; //only available for Humidifier devices. atomization efficiency %.
  auto: boolean; //only available for Humidifier devices. determines if a Humidifier is in Auto Mode or not.
  childLock: boolean; //only available for Humidifier devices. determines if a Humidifier's safety lock is on or not.
  sound: boolean; //only available for Humidifier devices. determines if a Humidifier is muted or not.
  calibrate: boolean; //only available for Curtain devices. determines if a Curtain has been calibrated or not.
  group: boolean; //only available for Curtain devices. determines if a Curtain is paired with or grouped with another Curtain or not.
  moving: boolean; //only available for Curtain devices. determines if a Curtain is moving or not.
  slidePosition: number; //only available for Curtain devices. the percentage of the distance between the calibrated open position and close position that a Curtain has moved to.
  mode: number; //available for Smart Fan devices. the fan mode.
  speed: number; //available for Smart Fan devices. the fan speed.
  shaking: boolean; //available for Smart Fan devices. determines if the fan is swinging or not.
  shakeCenter: string; //only available for Smart Fan devices. the fan's swing direciton.
  shakeRange: string; //only available for Smart Fan devices. the fan's swing range, 0~120°.
};
