import { UAParser } from "ua-parser-js";

const UNKNOWN_DEVICE = "未知设备";
const UNKNOWN_BROWSER = "未知浏览器";
const UNKNOWN_SYSTEM = "未知系统";

function majorVersion(version) {
  return String(version || "").split(".")[0] || null;
}

function normalizeDeviceType(type) {
  return ["mobile", "tablet"].includes(type) ? type : "desktop";
}

export function parseDeviceInfo(userAgent) {
  const rawUserAgent = String(userAgent || "").trim();

  if (!rawUserAgent) {
    return {
      deviceName: UNKNOWN_DEVICE,
      browserName: UNKNOWN_BROWSER,
      browserVersion: null,
      osName: UNKNOWN_SYSTEM,
      osVersion: null,
      deviceType: "desktop"
    };
  }

  const parser = new UAParser(rawUserAgent);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();
  const browserName = browser.name || UNKNOWN_BROWSER;
  const browserVersion = majorVersion(browser.version);
  const osName = os.name || UNKNOWN_SYSTEM;
  const osVersion = majorVersion(os.version);
  const deviceType = normalizeDeviceType(device.type);
  const deviceName = browserName === UNKNOWN_BROWSER && osName === UNKNOWN_SYSTEM ? UNKNOWN_DEVICE : `${browserName} on ${osName}`;

  return {
    deviceName,
    browserName,
    browserVersion,
    osName,
    osVersion,
    deviceType
  };
}
