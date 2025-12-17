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
      
      console.log(`[Detection] Found EEPROM Product: "${productName}"`);

      // 3. In unserer Liste suchen (Best Match / Longest Match)
      let bestMatch: HatProfile | null = null;

      for (const hat of Object.values(SUPPORTED_HATS)) {
        if (hat.eepromMatch && productName.includes(hat.eepromMatch)) {
          // Wenn wir noch keinen Match haben, oder dieser Match spezifischer (länger) ist
          if (!bestMatch || (hat.eepromMatch.length > (bestMatch.eepromMatch?.length || 0))) {
            bestMatch = hat;
          }
        }
      }

      if (bestMatch) {
        console.log(`[Detection] Match found: ${bestMatch.id} (${bestMatch.name})`);
        return bestMatch;
      }
      
      console.warn(`[Detection] Unknown HAT: "${productName}" - No matching profile found.`);
      return null; // HAT da, aber nicht in unserer Liste
    } catch (e: any) {
      if (e.code === 'ENOENT') {
        console.log(`[Detection] No HAT EEPROM detected at ${HAT_PRODUCT_PATH}.`);
        // Optional: Check if /proc/device-tree/hat exists at all
        try {
            await fs.access('/proc/device-tree/hat');
            console.log('[Detection] /proc/device-tree/hat exists, but product file is missing.');
        } catch {
            console.log('[Detection] /proc/device-tree/hat directory does not exist.');
        }
      } else {
        console.error('[Detection] Error reading HAT info:', e.message);
      }
      return null; 
    }
  }
}