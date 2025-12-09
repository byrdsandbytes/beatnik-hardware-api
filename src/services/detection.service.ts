import fs from 'fs/promises';
import { SUPPORTED_HATS, HatProfile } from '../types/hats';

// Pfad wo der Pi den HAT Namen speichert
const HAT_PRODUCT_PATH = '/proc/device-tree/hat/product';

export class DetectionService {

  /**
   * Versucht den angeschlossenen HAT via EEPROM zu erkennen
   */
  async detectConnectedHat(): Promise<HatProfile | null> {
    try {
      // 1. Prüfen ob die Datei existiert (bedeutet: HAT ist physisch da)
      await fs.access(HAT_PRODUCT_PATH);
      
      // 2. Inhalt lesen (z.B. "HiFiBerry DAC+ Pro\0")
      const productNameRaw = await fs.readFile(HAT_PRODUCT_PATH, 'utf-8');
      // Null-Bytes und Whitespace entfernen
      const productName = productNameRaw.replace(/\0/g, '').trim();
      
      console.log(`Hardware Detection: Found EEPROM Product: "${productName}"`);

      // 3. In unserer Liste suchen
      for (const hat of Object.values(SUPPORTED_HATS)) {
        if (hat.eepromMatch && productName.includes(hat.eepromMatch)) {
          return hat;
        }
      }
      
      return null; // HAT da, aber nicht in unserer Liste
    } catch (e) {
      // Kein HAT erkannt oder Datei nicht lesbar (Normalfall bei USB oder keinem HAT)
      return null; 
    }
  }
}