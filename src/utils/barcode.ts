/**
 * Pure SVG Code 128 (subset B) Barcode generator.
 * Works 100% offline, lightweight, producing standard scannable barcodes.
 */

// Code 128 patterns (Table B)
// Each pattern is 11 modules wide (except STOP which is 13)
const PATTERNS: number[] = [
  0x6cc, 0x66c, 0x666, 0x498, 0x48c, 0x44c, 0x4c8, 0x4c4, 0x464, 0x648, // 0-9
  0x644, 0x624, 0x59c, 0x4dc, 0x4ce, 0x5cc, 0x4ec, 0x4e6, 0x672, 0x65c, // 10-19
  0x64e, 0x6e4, 0x674, 0x76e, 0x74c, 0x72c, 0x726, 0x764, 0x734, 0x732, // 20-29
  0x6d8, 0x6c6, 0x636, 0x518, 0x458, 0x446, 0x588, 0x468, 0x462, 0x688, // 30-39
  0x628, 0x622, 0x5b8, 0x58e, 0x46e, 0x5d8, 0x5c6, 0x476, 0x776, 0x68e, // 40-49
  0x62e, 0x6e8, 0x6e2, 0x6ee, 0x758, 0x746, 0x716, 0x768, 0x762, 0x71a, // 50-59
  0x77a, 0x642, 0x78a, 0x530, 0x50c, 0x4b0, 0x486, 0x42c, 0x426, 0x590, // 60-69
  0x584, 0x4d0, 0x4c2, 0x434, 0x432, 0x612, 0x650, 0x7ba, 0x614, 0x47a, // 70-79
  0x53c, 0x4bc, 0x4be, 0x5dc, 0x4fc, 0x4fe, 0x70c, 0x706, 0x76c, 0x766, // 80-89
  0x7cc, 0x7c6, 0x684, 0x690, 0x696, 0x744, 0x74a, 0x7ca, 0x7a4, 0x7a2, // 90-99
  0x774, 0x752, 0x76a, 0x63a, 0x72a, 0x6ba // 100-105 (104=Start B)
];

const START_B = 104;
const STOP = 0x18eb; // 1100011101011 (13 bits)

export function generateCode128Modules(text: string): boolean[] {
  const clean = text.trim() || '000000';
  const codes: number[] = [START_B];

  // Encode ASCII chars (32 to 127) using Code 128 subset B (char code - 32)
  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    const value = charCode >= 32 && charCode <= 126 ? charCode - 32 : 0;
    codes.push(value);
  }

  // Calculate checksum
  let checksum = codes[0];
  for (let i = 1; i < codes.length; i++) {
    checksum += codes[i] * i;
  }
  codes.push(checksum % 103);

  // Convert to boolean bar pattern
  const modules: boolean[] = [];

  // Quiet zone at start (10 modules)
  for (let i = 0; i < 10; i++) modules.push(false);

  // Data + Checksum
  for (const c of codes) {
    const pattern = PATTERNS[c] ?? PATTERNS[0];
    for (let bit = 10; bit >= 0; bit--) {
      modules.push(Boolean((pattern >> bit) & 1));
    }
  }

  // Stop pattern (13 modules)
  for (let bit = 12; bit >= 0; bit--) {
    modules.push(Boolean((STOP >> bit) & 1));
  }

  // Quiet zone at end (10 modules)
  for (let i = 0; i < 10; i++) modules.push(false);

  return modules;
}

/**
 * Generate an SVG string or React-compatible data for barcode display
 */
export function getBarcodeSvgPaths(text: string, height: number = 48, moduleWidth: number = 2) {
  const modules = generateCode128Modules(text);
  const totalWidth = modules.length * moduleWidth;
  
  let currentStart = -1;
  const bars: { x: number; width: number }[] = [];

  for (let i = 0; i < modules.length; i++) {
    if (modules[i]) {
      if (currentStart === -1) currentStart = i;
    } else {
      if (currentStart !== -1) {
        bars.push({
          x: currentStart * moduleWidth,
          width: (i - currentStart) * moduleWidth,
        });
        currentStart = -1;
      }
    }
  }
  if (currentStart !== -1) {
    bars.push({
      x: currentStart * moduleWidth,
      width: (modules.length - currentStart) * moduleWidth,
    });
  }

  return {
    totalWidth,
    height,
    bars,
  };
}

/**
 * Generates an automatic 8 to 12 digit barcode for quick product creation
 */
export function generateRandomBarcode(prefix: string = '200'): string {
  const randomPart = Math.floor(10000000 + Math.random() * 90000000).toString();
  return `${prefix}${randomPart.slice(0, 7)}`;
}
