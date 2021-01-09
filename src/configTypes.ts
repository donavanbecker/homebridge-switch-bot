import { PlatformConfig } from 'homebridge';

//Config
export interface SwitchBotPlatformConfig extends PlatformConfig {
  credentials?: credentials;
  devicediscovery?: boolean;
  options?: options | Record<string, never>;
}

export type credentials = {
  openToken?: any;
};

export type options = {
  refreshRate?: number;
  hide_device: string[];
  bot?: bot;
  meter?: meter;
  humidifier?: humidifier;
  curtain?: curtain;
};

export type meter = {
  hide_temperature?: boolean;
  hide_humidity?: boolean;
};

export type bot = {
  device_switch: string[];
  device_press: string[];
};

export type humidifier = {
  hide_temperature?: boolean;
};

export type curtain = {
  set_max?: number;
  set_min?: number;
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
   //device ID.
  deviceId: string;
   //device name.
  deviceName: string;
  //device type.
  deviceType: string;
  //determines if Cloud Service is enabled or not for the current device.
  enableCloudService: boolean;
  //device's parent Hub ID.
  hubDeviceId: string;
  //only available for Curtain devices. a list of Curtain device IDs such that the Curtain devices are being paired or grouped.
  curtainDevicesIds: Array<string>;
  //only available for Curtain devices. determines if the open position and the close position of a Curtain have been properly calibrated or not.
  calibrate: boolean;
  //only available for Curtain devices. determines if a Curtain is paired with or grouped with another Curtain or not.
  group: boolean;
  //only available for Curtain devices. determines if a Curtain is the master device or not when paired with or grouped with another Curtain.
  master: boolean;
  //only available for Curtain devices. the opening direction of a Curtain.
  openDirection: string;
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
  //device ID.
  deviceId: string;
  //device type.
  deviceType: string;
  //device's parent Hub ID.
  hubDeviceId: string;
  //only available for Bot/Plug/Humidifier devices. ON/OFF state.
  power: string;
  //only available for Meter/Humidifier devices. humidity percentage.
  humidity: number;
  //only available for Meter/Humidifier devices. temperature in celsius.
  temperature: number; 
  //only available for Humidifier devices. atomization efficiency %.
  nebulizationEfficiency: number;
  //only available for Humidifier devices. determines if a Humidifier is in Auto Mode or not.
  auto: boolean;
  //only available for Humidifier devices. determines if a Humidifier's safety lock is on or not.
  childLock: boolean;
  //only available for Humidifier devices. determines if a Humidifier is muted or not.
  sound: boolean;
  //only available for Curtain devices. determines if a Curtain has been calibrated or not.
  calibrate: boolean;
  //only available for Curtain devices. determines if a Curtain is paired with or grouped with another Curtain or not.
  group: boolean;
  //only available for Curtain devices. determines if a Curtain is moving or not.
  moving: boolean; 
  //only available for Curtain devices. the percentage of the distance between the
  //calibrated open position and close position that a Curtain has moved to.
  slidePosition: number;
  //available for Smart Fan devices. the fan mode.
  mode: number;
  //available for Smart Fan devices. the fan speed.
  speed: number;
  //available for Smart Fan devices. determines if the fan is swinging or not.
  shaking: boolean; 
  //only available for Smart Fan devices. the fan's swing direciton.
  shakeCenter: string;
  //only available for Smart Fan devices. the fan's swing range, 0~120°.
  shakeRange: string;
};
