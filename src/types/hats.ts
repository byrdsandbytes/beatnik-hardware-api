export interface HatProfile {
  id: string;
  name: string;
  overlay: string;
  eepromMatch?: string;
  camilla: {
    device: string;
    format: string;
    channels?: number;
  };
}

export const SUPPORTED_HATS: Record<string, HatProfile> = {
  // --- HiFiBerry DACs ---

  'hifiberry-dac': {
    id: 'hifiberry-dac',
    name: 'HiFiBerry DAC / DAC Zero / MiniAmp / Beocreate / DAC+ Light',
    overlay: 'dtoverlay=hifiberry-dac',
    eepromMatch: 'HiFiBerry DAC',
    camilla: {
      device: 'plughw:CARD=sndrpihifiberry,DEV=0',
      format: 'S32LE'
    }
  },
  'hifiberry-dac8x': {
    id: 'hifiberry-dac8x',
    name: 'HiFiBerry DAC8x',
    overlay: 'dtoverlay=hifiberry-dac8x',
    eepromMatch: 'HiFiBerry DAC8x',
    camilla: {
      device: 'plughw:CARD=sndrpihifiberry,DEV=0',
      format: 'S32LE'
    }
  },
  'hifiberry-dacplus-std': {
    id: 'hifiberry-dacplus-std',
    name: 'HiFiBerry DAC+ Standard',
    overlay: 'dtoverlay=hifiberry-dacplus-std',
    eepromMatch: 'HiFiBerry DAC+', 
    camilla: {
      device: 'plughw:CARD=sndrpihifiberry,DEV=0',
      format: 'S32LE'
    }
  },
  'hifiberry-dacplus-pro': {
    id: 'hifiberry-dacplus-pro',
    name: 'HiFiBerry DAC+ Pro / DAC2 Pro',
    overlay: 'dtoverlay=hifiberry-dacplus-pro',
    eepromMatch: 'HiFiBerry DAC+ Pro',
    camilla: {
      device: 'plughw:CARD=sndrpihifiberry,DEV=0',
      format: 'S32LE'
    }
  },
  
  // Legacy / Aliases (optional, mapped to Pro)
  'hifiberry-dacplus': {
    id: 'hifiberry-dacplus',
    name: 'HiFiBerry DAC+ Pro (Legacy)',
    overlay: 'dtoverlay=hifiberry-dacplus-pro',
    eepromMatch: 'HiFiBerry DAC+',
    camilla: {
      device: 'plughw:CARD=sndrpihifiberry,DEV=0',
      format: 'S32LE'
    }
  },

  'hifiberry-dacplus-xr': {
    id: 'hifiberry-dacplus-xr',
    name: 'HiFiBerry DAC+ XR',
    overlay: 'dtoverlay=hifiberry-dacplus-xr',
    eepromMatch: 'HiFiBerry DAC+ XR',
    camilla: {
      device: 'plughw:CARD=sndrpihifiberry,DEV=0',
      format: 'S32LE'
    }
  },

  'hifiberry-dacplushd': {
    id: 'hifiberry-dacplushd',
    name: 'HiFiBerry DAC2 HD',
    overlay: 'dtoverlay=hifiberry-dacplushd',
    eepromMatch: 'HiFiBerry DAC2 HD',
    camilla: {
      device: 'plughw:CARD=sndrpihifiberry,DEV=0',
      format: 'S32LE'
    }
  },
  'hifiberry-dacplusadc': {
    id: 'hifiberry-dacplusadc',
    name: 'HiFiBerry DAC+ ADC',
    overlay: 'dtoverlay=hifiberry-dacplusadc',
    eepromMatch: 'HiFiBerry DAC+ ADC',
    camilla: {
      device: 'plughw:CARD=sndrpihifiberry,DEV=0',
      format: 'S32LE'
    }
  },
  'hifiberry-dacplusadcpro': {
    id: 'hifiberry-dacplusadcpro',
    name: 'HiFiBerry DAC+ ADC Pro / DAC2 ADC Pro',
    overlay: 'dtoverlay=hifiberry-dacplusadcpro',
    eepromMatch: 'HiFiBerry DAC+ ADC Pro',
    camilla: {
      device: 'plughw:CARD=sndrpihifiberry,DEV=0',
      format: 'S32LE'
    }
  },

  // --- HiFiBerry Amps ---

  'hifiberry-amp': {
    id: 'hifiberry-amp',
    name: 'HiFiBerry Amp+',
    overlay: 'dtoverlay=hifiberry-amp',
    eepromMatch: 'HiFiBerry Amp', 
    camilla: {
      device: 'plughw:CARD=sndrpihifiberry,DEV=0',
      format: 'S32LE'
    }
  },
  'hifiberry-amp2': {
    id: 'hifiberry-amp2',
    name: 'HiFiBerry Amp2 / Amp4',
    overlay: 'dtoverlay=hifiberry-dacplus-std',
    eepromMatch: 'HiFiBerry Amp2', 
    camilla: {
      device: 'plughw:CARD=sndrpihifiberry,DEV=0',
      format: 'S32LE'
    }
  },
  'hifiberry-amp3': {
    id: 'hifiberry-amp3',
    name: 'HiFiBerry Amp3',
    overlay: 'dtoverlay=hifiberry-amp3',
    eepromMatch: 'HiFiBerry Amp3',
    camilla: {
      device: 'plughw:CARD=sndrpihifiberry,DEV=0',
      format: 'S32LE'
    }
  },
  'hifiberry-amp4pro': {
    id: 'hifiberry-amp4pro',
    name: 'HiFiBerry Amp4 Pro',
    overlay: 'dtoverlay=hifiberry-amp4pro',
    eepromMatch: 'HiFiBerry Amp4 Pro',
    camilla: {
      device: 'plughw:CARD=sndrpihifiberry,DEV=0',
      format: 'S32LE'
    }
  },

  // --- HiFiBerry Digi ---

  'hifiberry-digi': {
    id: 'hifiberry-digi',
    name: 'HiFiBerry Digi / Digi+ / Digi 2 Standard',
    overlay: 'dtoverlay=hifiberry-digi',
    eepromMatch: 'HiFiBerry Digi',
    camilla: {
      device: 'plughw:CARD=sndrpihifiberry,DEV=0',
      format: 'S24LE3'
    }
  },
  'hifiberry-digi-pro': {
    id: 'hifiberry-digi-pro',
    name: 'HiFiBerry Digi+ Pro / Digi 2 Pro',
    overlay: 'dtoverlay=hifiberry-digi-pro',
    eepromMatch: 'HiFiBerry Digi+ Pro',
    camilla: {
      device: 'plughw:CARD=sndrpihifiberry,DEV=0',
      format: 'S24LE3'
    }
  },

  // --- Others ---

  'rpi-hdmi0': {
    id: 'rpi-hdmi0',
    name: 'Raspberry Pi HDMI 0',
    overlay: '# Beatnik HDMI0',
    camilla: {
      device: 'hdmi:1,0',
      format: 'S16LE'
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
  'iqaudio-dac': {
    id: 'iqaudio-dac',
    name: 'IQaudIO Pi-DAC Zero / Pi-DAC+ (non-Pro)',
    overlay: 'dtoverlay=iqaudio-dac',
    eepromMatch: 'IQaudIO Limited',
    camilla: {
      device: 'hw:1,0',
      format: 'S32LE'
    }
  },
  'iqaudio-digi': {
    id: 'iqaudio-digi',
    name: 'IQaudIO Pi-Digi+',
    overlay: 'dtoverlay=iqaudio-digi-wm8804',
    eepromMatch: 'IQaudIO Pi-Digi+',
    camilla: {
      device: 'hw:1,0',
      format: 'S24LE3'
    }
  },
  'iqaudio-codec': {
    id: 'iqaudio-codec',
    name: 'IQaudIO Pi-Codec / Pi-Codec+',
    overlay: 'dtoverlay=iqaudio-codec',
    eepromMatch: 'IQaudIO Pi-Codec',
    camilla: {
      device: 'hw:1,0',
      format: 'S32LE'
    }
  },
  'iqaudio-digiamp-plus': {
    id: 'iqaudio-digiamp-plus',
    name: 'IQaudIO Pi-DigiAMP+',
    overlay: 'dtoverlay=iqaudio-digiampplus,unmute_amp',
    eepromMatch: 'IQaudIO Pi-DigiAMP+',
    camilla: {
      device: 'hw:1,0',
      format: 'S32LE'
    }
  },
  'rpi-dacpro': {
    id: 'rpi-dacpro',
    name: 'Raspberry Pi DAC Pro',
    overlay: 'dtoverlay=rpi-dacpro',
    eepromMatch: 'Raspberry Pi DAC Pro',
    camilla: {
      device: 'hw:1,0',
      format: 'S32LE'
    }
  },
  'rpi-dacplus': {
    id: 'rpi-dacplus',
    name: 'Raspberry Pi DAC+',
    overlay: 'dtoverlay=rpi-dacplus',
    eepromMatch: 'Raspberry Pi DAC+',
    camilla: {
      device: 'hw:1,0',
      format: 'S32LE'
    }
  },
  'rpi-codeczero': {
    id: 'rpi-codeczero',
    name: 'Raspberry Pi Codec Zero',
    overlay: 'dtoverlay=rpi-codeczero',
    eepromMatch: 'Raspberry Pi Codec Zero',
    camilla: {
      device: 'hw:1,0',
      format: 'S32LE'
    }
  },
  'rpi-digiamp-plus': {
    id: 'rpi-digiamp-plus',
    name: 'Raspberry Pi DigiAMP+',
    // Official Raspberry Pi-branded overlay (green PCB), distinct from the IQaudIO (black PCB) variant
    overlay: 'dtoverlay=rpi-digiampplus,unmute_amp',
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
      device: 'plughw:Headphones',
      format: 'S16LE'
    }
  }
};