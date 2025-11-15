export type OS = 'windows' | 'mac' | 'linux' | 'unknown';
export type Browser = 'chrome' | 'firefox' | 'safari' | 'edge' | 'unknown';

export interface PlatformInfo {
  os: OS;
  browser: Browser;
}

export const detectOS = (): OS => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform.toLowerCase();

  if (platform.includes('mac') || userAgent.includes('mac')) {
    return 'mac';
  }
  if (platform.includes('win') || userAgent.includes('win')) {
    return 'windows';
  }
  if (platform.includes('linux') || userAgent.includes('linux') || userAgent.includes('x11')) {
    return 'linux';
  }
  return 'unknown';
};

export const detectBrowser = (): Browser => {
  const userAgent = window.navigator.userAgent.toLowerCase();

  // Edge (must be checked before Chrome)
  if (userAgent.includes('edg/') || userAgent.includes('edge/')) {
    return 'edge';
  }
  // Chrome
  if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
    return 'chrome';
  }
  // Safari (must be checked after Chrome as Chrome includes 'safari' in UA)
  if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
    return 'safari';
  }
  // Firefox
  if (userAgent.includes('firefox')) {
    return 'firefox';
  }
  return 'unknown';
};

export const detectPlatform = (): PlatformInfo => {
  return {
    os: detectOS(),
    browser: detectBrowser(),
  };
};

export const getBrowserDisplayName = (browser: Browser): string => {
  const names: Record<Browser, string> = {
    chrome: 'Chrome',
    firefox: 'Firefox',
    safari: 'Safari',
    edge: 'Edge',
    unknown: 'Browser',
  };
  return names[browser];
};

export const getOSDisplayName = (os: OS): string => {
  const names: Record<OS, string> = {
    windows: 'Windows',
    mac: 'macOS',
    linux: 'Linux',
    unknown: 'Desktop',
  };
  return names[os];
};
