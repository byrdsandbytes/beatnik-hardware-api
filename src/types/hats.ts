export interface HatProfile {
  id: string;
  name: string;
  overlay: string;
  // String oder Regex, um den Namen im /proc/device-tree/hat/product zu matchen
  eepromMatch?: string; 
  camilla: {
    device: string; // Das ALSA Playback Device, z.B. "hw:1,0" oder "hw:Headphones"
    format: string; // Das unterstützte Format, z.B. "S32LE" oder "S16LE"
    channels?: number; // Optional, default 2
  };
}

// Die zentrale Datenbank aller unterstützten Soundkarten
export const SUPPORTED_HATS: Record<string, HatProfile> = {
  'hifiberry-dac': {
    id: 'hifiberry-dac',
    name: 'HiFiBerry DAC / DAC+ Standard',
    overlay: 'dtoverlay=hifiberry-dac',
    eepromMatch: 'HiFiBerry DAC',
    camilla: {
      device: 'hw:1,0',
      format: 'S32LE'
    }
  },
  'hifiberry-dacplus': {
    id: 'hifiberry-dacplus',
    name: 'HiFiBerry DAC+ Pro / ADC',
    overlay: 'dtoverlay=hifiberry-dacplus',
    eepromMatch: 'HiFiBerry DAC+',
    camilla: {
      device: 'hw:1,0',
      format: 'S32LE'
    }
  },
  'hifiberry-amp': {
    id: 'hifiberry-amp',
    name: 'HiFiBerry Amp2 / Amp4',
    overlay: 'dtoverlay=hifiberry-amp',
    eepromMatch: 'HiFiBerry Amp',
    camilla: {
      device: 'hw:1,0',
      format: 'S32LE'
    }
  },
  'hifiberry-digi': {
    id: 'hifiberry-digi',
    name: 'HiFiBerry Digi / Digi+',
    overlay: 'dtoverlay=hifiberry-digi',
    eepromMatch: 'HiFiBerry Digi',
    camilla: {
      device: 'hw:1,0',
      format: 'S24LE3'
    }
  },
  'usb-dac': {
    id: 'usb-dac',
    name: 'Generic USB DAC',
    overlay: '# No overlay needed for USB',
    // Kein eepromMatch, da USB
    camilla: {
      device: 'hw:1,0',
      format: 'S16LE'
    }
  },
  'none': {
    id: 'none',
    name: 'No HAT (Headphone Jack)',
    overlay: '# No HAT configured',
    camilla: {
      device: 'hw:0,0',
      format: 'S16LE'
    }
  }
};