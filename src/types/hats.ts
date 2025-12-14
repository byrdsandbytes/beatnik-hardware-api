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
    // Kernel >= 6.1.77 requires specific overlays
    overlay: 'dtoverlay=hifiberry-dacplus,slave', 
    eepromMatch: 'HiFiBerry DAC+',
    camilla: {
      device: 'hw:1,0',
      format: 'S32LE'
    }
  },
  'hifiberry-amp': {
    id: 'hifiberry-amp',
    name: 'HiFiBerry Amp2 / Amp4',
    // Kernel >= 6.1.77 requires hifiberry-dacplus-std for Amp2
    overlay: 'dtoverlay=hifiberry-dacplus-std',
    eepromMatch: 'HiFiBerry Amp',
    camilla: {
      device: 'hw:1,0',
      format: 'S32LE'
    }
  },
  'hifiberry-amp4pro': {
    id: 'hifiberry-amp4pro',
    name: 'HiFiBerry Amp4 Pro',
    overlay: 'dtoverlay=hifiberry-amp4pro',
    eepromMatch: 'HiFiBerry Amp4 Pro',
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
  'iqaudio-dacplus': {
    id: 'iqaudio-dacplus',
    name: 'IQaudIO Pi-DAC PRO / DAC+',
    overlay: 'dtoverlay=iqaudio-dacplus',
    eepromMatch: 'Pi-DAC PRO',
    camilla: {
      device: 'hw:1,0',
      format: 'S32LE'
    }
  },
  'rpi-digiamp-plus': {
    id: 'rpi-digiamp-plus',
    name: 'Raspberry Pi DigiAMP+',
    overlay: 'dtoverlay=iqaudio-digiamp-plus,unmute_amp',
    eepromMatch: 'Raspberry Pi DigiAMP+',
    camilla: {
      device: 'hw:1,0',
      format: 'S32LE'
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