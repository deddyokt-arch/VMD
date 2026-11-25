// Code 128 Barcode Generator & Scanner Service

/**
 * Code 128 B pattern table
 */
const CODE128_PATTERNS: { [char: string]: string } = {
  ' ': '11011001100', '!': '11001101100', '"': '11001100110', '#': '10010011000',
  '$': '10010001100', '%': '10001001100', '&': '10011001000', "'": '10011000100',
  '(': '10001100100', ')': '11001001000', '*': '11001000100', '+': '11000100100',
  ',': '10110011100', '-': '10011011100', '.': '10011001110', '/': '10111001100',
  '0': '10011101100', '1': '10011100110', '2': '11001110010', '3': '11001011100',
  '4': '11001001110', '5': '11011100100', '6': '11001110100', '7': '11101101110',
  '8': '11101001100', '9': '11100101100', ':': '11100100110', ';': '11101100100',
  '<': '11100110100', '=': '11100110010', '>': '11011011000', '?': '11011000110',
  '@': '11000110110', 'A': '10100011000', 'B': '10001011000', 'C': '10001000110',
  'D': '10110001000', 'E': '10001101000', 'F': '10001100010', 'G': '11010001000',
  'H': '11000101000', 'I': '11000100010', 'J': '10110111000', 'K': '10110001110',
  'L': '10001101110', 'M': '10111011000', 'N': '10111000110', 'O': '10001110110',
  'P': '11101110110', 'Q': '11010001110', 'R': '11000101110', 'S': '11011101000',
  'T': '11011100010', 'U': '11011101110', 'V': '11101011000', 'W': '11101000110',
  'X': '11100010110', 'Y': '11101101000', 'Z': '11101100010',
  'a': '10110010000', 'b': '10110000100', 'c': '10001101000', 'd': '10001100010',
  'e': '11010001000', 'f': '11000101000', 'g': '11000100010', 'h': '10110111000',
  'i': '10110001110', 'j': '10001101110', 'k': '10111011000', 'l': '10111000110',
  'm': '10001110110', 'n': '11101110110', 'o': '11010001110', 'p': '11000101110',
  'q': '11011101000', 'r': '11011100010', 's': '11011101110', 't': '11101011000',
  'u': '11101000110', 'v': '11100010110', 'w': '11101101000', 'x': '11101100010',
  'y': '11011011000', 'z': '11011000110'
};

const START_B = '11010010000';
const STOP = '1100011101011';

/**
 * Generate SVG string for Code 128 Barcode
 */
export function generateBarcodeSVG(code: string, width = 240, height = 70): string {
  let binary = START_B;
  const sanitized = code.trim();

  for (let i = 0; i < sanitized.length; i++) {
    const char = sanitized[i];
    binary += CODE128_PATTERNS[char] || '10101010101';
  }
  binary += STOP;

  const barWidth = width / binary.length;
  let rects = '';

  for (let i = 0; i < binary.length; i++) {
    if (binary[i] === '1') {
      const x = (i * barWidth).toFixed(2);
      rects += `<rect x="${x}" y="0" width="${barWidth.toFixed(2)}" height="${height - 18}" fill="#000000"/>`;
    }
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
      <rect width="${width}" height="${height}" fill="#FFFFFF"/>
      ${rects}
      <text x="${width / 2}" y="${height - 4}" text-anchor="middle" font-family="monospace" font-size="11" fill="#111827" letter-spacing="1.5">
        ${sanitized}
      </text>
    </svg>
  `;
}

/**
 * Generate a new unique Barcode & SKU for products
 */
export function generateNewProductCode(prefix = 'VAI'): { barcode: string; sku: string } {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  const barcode = '899' + randomNum.toString().slice(0, 7);
  const sku = `${prefix}-${randomNum.toString().slice(-4)}`;
  return { barcode, sku };
}
