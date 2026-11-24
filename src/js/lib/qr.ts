// qr.ts
// A small QR encoder for the QR code component: byte mode, error correction level M, versions 1 to 15, which hold up to 412 bytes, enough for a URL or a short config file. None of it is exported from the bundle.

// Data codewords and error correction codewords per block at level M, and the block counts, for versions 1 to 15.
var EC_PER_BLOCK: number[] = [10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24];
var BLOCKS: number[][] = [
    [1, 16], [1, 28], [1, 44], [2, 32], [2, 43], [4, 27], [4, 31], [2, 38, 2, 39], [3, 36, 2, 37], [4, 43, 1, 44],
    [1, 50, 4, 51], [6, 36, 2, 37], [8, 37, 1, 38], [4, 40, 5, 41], [5, 41, 5, 42]
];
var ALIGN: number[][] = [
    [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
    [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70]
];

/** The highest version the encoder draws. */
var MAX_VERSION: number = BLOCKS.length;

/** The most bytes a QR code holds at level M in version 15. */
export var QR_MAX_BYTES: number = 412;

// The data codewords a version holds.
function dataCapacity(version: number): number {
    var b = BLOCKS[version - 1];
    return b[0] * b[1] + (b.length > 2 ? b[2] * b[3] : 0);
}

// Multiplies in GF(256) with the QR polynomial.
function gfMul(x: number, y: number): number {
    var z = 0;
    for (var i = 7; i >= 0; i--) {
        z = (z << 1) ^ ((z >>> 7) * 0x11d);
        z ^= ((y >>> i) & 1) * x;
    }
    return z & 0xff;
}

function rsDivisor(degree: number): number[] {
    var result: number[] = [];
    for (var i = 0; i < degree - 1; i++) result.push(0);
    result.push(1);
    var root = 1;
    for (var j = 0; j < degree; j++) {
        for (var k = 0; k < result.length; k++) {
            result[k] = gfMul(result[k], root);
            if (k + 1 < result.length) result[k] ^= result[k + 1];
        }
        root = gfMul(root, 0x02);
    }
    return result;
}

function rsRemainder(data: number[], divisor: number[]): number[] {
    var result: number[] = divisor.map(function () { return 0; });
    data.forEach(function (b) {
        var factor = b ^ (result.shift() as number);
        result.push(0);
        divisor.forEach(function (coef, i) { result[i] ^= gfMul(coef, factor); });
    });
    return result;
}

/**
 * Lists the centers of the alignment patterns of a code, as [row, column], leaving out the three that would sit on a finder.
 * Internal to the QR code, which draws each one solid so a dense code still scans.
 *
 * @param size the code's width in modules
 * @returns the centers, none below version 2
 */
export function alignmentCenters(size: number): number[][] {
    var align = ALIGN[(size - 17) / 4 - 1] || [];
    var last = align[align.length - 1];
    var out: number[][] = [];
    align.forEach(function (ar) {
        align.forEach(function (ac) {
            // An alignment pattern never sits on a finder.
            if ((ar === 6 && ac === 6) || (ar === 6 && ac === last) || (ar === last && ac === 6)) return;
            out.push([ar, ac]);
        });
    });
    return out;
}

/**
 * Turns text into its UTF-8 bytes.
 * Internal to the QR code.
 */
export function utf8Bytes(text: string): number[] {
    var out: number[] = [];
    var encoded = encodeURIComponent(text);
    for (var i = 0; i < encoded.length; i++) {
        if (encoded.charAt(i) === '%') { out.push(parseInt(encoded.substr(i + 1, 2), 16)); i += 2; }
        else out.push(encoded.charCodeAt(i));
    }
    return out;
}

// The codewords of the data with the mode, the length, the terminator, and the padding.
function dataCodewords(bytes: number[], version: number): number[] {
    var bits: number[] = [];
    function put(value: number, length: number): void {
        for (var i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
    }
    put(4, 4);
    put(bytes.length, version < 10 ? 8 : 16);
    bytes.forEach(function (b) { put(b, 8); });
    var capacity = dataCapacity(version) * 8;
    put(0, Math.min(4, capacity - bits.length));
    put(0, (8 - bits.length % 8) % 8);
    for (var pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) put(pad, 8);
    var words: number[] = [];
    for (var j = 0; j < bits.length; j += 8) {
        var w = 0;
        for (var k = 0; k < 8; k++) w = (w << 1) | bits[j + k];
        words.push(w);
    }
    return words;
}

// Splits the data into blocks, adds each block's error correction, and interleaves them.
function interleave(data: number[], version: number): number[] {
    var spec = BLOCKS[version - 1];
    var ec = EC_PER_BLOCK[version - 1];
    var divisor = rsDivisor(ec);
    var blocks: number[][] = [];
    var at = 0;
    for (var g = 0; g < spec.length; g += 2) {
        for (var n = 0; n < spec[g]; n++) {
            blocks.push(data.slice(at, at + spec[g + 1]));
            at += spec[g + 1];
        }
    }
    var ecBlocks = blocks.map(function (b) { return rsRemainder(b, divisor); });
    var out: number[] = [];
    var longest = Math.max.apply(null, blocks.map(function (b) { return b.length; }));
    for (var i = 0; i < longest; i++) blocks.forEach(function (b) { if (i < b.length) out.push(b[i]); });
    for (var e = 0; e < ec; e++) ecBlocks.forEach(function (b) { out.push(b[e]); });
    return out;
}

// The BCH code of the format or version bits.
function bch(value: number, poly: number, bitsOfPoly: number): number {
    var v = value << (bitsOfPoly - 1);
    for (var i = 31; i >= bitsOfPoly - 1; i--) if ((v >>> i) & 1) v ^= poly << (i - (bitsOfPoly - 1));
    return (value << (bitsOfPoly - 1)) | v;
}

function maskBit(mask: number, r: number, c: number): boolean {
    switch (mask) {
        case 0: return (r + c) % 2 === 0;
        case 1: return r % 2 === 0;
        case 2: return c % 3 === 0;
        case 3: return (r + c) % 3 === 0;
        case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
        case 5: return (r * c) % 2 + (r * c) % 3 === 0;
        case 6: return ((r * c) % 2 + (r * c) % 3) % 2 === 0;
        default: return ((r + c) % 2 + (r * c) % 3) % 2 === 0;
    }
}

// Scores a finished grid by the four penalty rules, lower being easier to read.
function penalty(m: boolean[][]): number {
    var size = m.length;
    var score = 0;
    var dark = 0;
    function runs(get: (a: number, b: number) => boolean): void {
        for (var a = 0; a < size; a++) {
            var run = 1;
            for (var b = 1; b < size; b++) {
                if (get(a, b) === get(a, b - 1)) run++;
                else { if (run >= 5) score += run - 2; run = 1; }
            }
            if (run >= 5) score += run - 2;
            for (var c = 0; c + 10 < size; c++) {
                var line = '';
                for (var d = 0; d < 11; d++) line += get(a, c + d) ? '1' : '0';
                if (line === '10111010000' || line === '00001011101') score += 40;
            }
        }
    }
    runs(function (r, c) { return m[r][c]; });
    runs(function (c, r) { return m[r][c]; });
    for (var r = 0; r < size; r++) {
        for (var c = 0; c < size; c++) {
            if (m[r][c]) dark++;
            if (r + 1 < size && c + 1 < size && m[r][c] === m[r][c + 1] && m[r][c] === m[r + 1][c] && m[r][c] === m[r + 1][c + 1]) score += 3;
        }
    }
    score += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
    return score;
}

/**
 * Encodes text as a QR code at error correction level M, in the smallest version from 1 to 15 that holds it.
 * Internal to the QR code.
 *
 * @param text the text, such as a URL
 * @returns the grid of modules, true for dark, or null when the text is longer than version 15 holds
 */
export function encodeQr(text: string): boolean[][] | null {
    var bytes = utf8Bytes(text);
    var version = 0;
    for (var v = 1; v <= MAX_VERSION; v++) {
        if (4 + (v < 10 ? 8 : 16) + bytes.length * 8 <= dataCapacity(v) * 8) { version = v; break; }
    }
    if (!version) return null;
    var size = version * 4 + 17;
    var modules: boolean[][] = [];
    var fixed: boolean[][] = [];
    for (var i = 0; i < size; i++) {
        modules.push([]);
        fixed.push([]);
        for (var j = 0; j < size; j++) { modules[i].push(false); fixed[i].push(false); }
    }
    function set(r: number, c: number, dark: boolean): void {
        modules[r][c] = dark;
        fixed[r][c] = true;
    }
    function finder(r: number, c: number): void {
        for (var dr = -1; dr <= 7; dr++) {
            for (var dc = -1; dc <= 7; dc++) {
                var rr = r + dr;
                var cc = c + dc;
                if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
                var ring = Math.max(Math.abs(dr - 3), Math.abs(dc - 3));
                set(rr, cc, ring !== 2 && ring !== 4);
            }
        }
    }
    finder(0, 0);
    finder(0, size - 7);
    finder(size - 7, 0);
    for (var t = 8; t < size - 8; t++) {
        set(6, t, t % 2 === 0);
        set(t, 6, t % 2 === 0);
    }
    alignmentCenters(size).forEach(function (center) {
        for (var dr = -2; dr <= 2; dr++) for (var dc = -2; dc <= 2; dc++) set(center[0] + dr, center[1] + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
    });
    // The format bits are reserved now and drawn with the chosen mask.
    function drawFormat(mask: number): void {
        var bits = bch((0 << 3) | mask, 0x537, 11) ^ 0x5412;
        for (var a = 0; a <= 5; a++) set(a, 8, ((bits >>> a) & 1) === 1);
        set(7, 8, ((bits >>> 6) & 1) === 1);
        set(8, 8, ((bits >>> 7) & 1) === 1);
        set(8, 7, ((bits >>> 8) & 1) === 1);
        for (var b = 9; b < 15; b++) set(8, 14 - b, ((bits >>> b) & 1) === 1);
        for (var c = 0; c < 8; c++) set(8, size - 1 - c, ((bits >>> c) & 1) === 1);
        for (var d = 8; d < 15; d++) set(size - 15 + d, 8, ((bits >>> d) & 1) === 1);
        set(size - 8, 8, true);
    }
    drawFormat(0);
    if (version >= 7) {
        var vbits = bch(version, 0x1f25, 13);
        for (var x = 0; x < 18; x++) {
            var on = ((vbits >>> x) & 1) === 1;
            var a1 = size - 11 + x % 3;
            var b1 = Math.floor(x / 3);
            set(a1, b1, on);
            set(b1, a1, on);
        }
    }
    var codewords = interleave(dataCodewords(bytes, version), version);
    var bitIndex = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (var vert = 0; vert < size; vert++) {
            for (var k = 0; k < 2; k++) {
                var col = right - k;
                var upward = ((right + 1) & 2) === 0;
                var row = upward ? size - 1 - vert : vert;
                if (fixed[row][col] || bitIndex >= codewords.length * 8) continue;
                modules[row][col] = ((codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) === 1;
                bitIndex++;
            }
        }
    }
    var best: boolean[][] | null = null;
    var bestScore = Infinity;
    for (var mask = 0; mask < 8; mask++) {
        var copy = modules.map(function (rowMods) { return rowMods.slice(); });
        for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) if (!fixed[r][c] && maskBit(mask, r, c)) copy[r][c] = !copy[r][c];
        var saved = modules;
        modules = copy;
        drawFormat(mask);
        modules = saved;
        var score = penalty(copy);
        if (score < bestScore) { bestScore = score; best = copy; }
    }
    return best;
}
