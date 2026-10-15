// One-off generator for the app icons (dumbbell on dark). Writes PNGs + SVG to public/.
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(out, { recursive: true });

const BG = [0x11, 0x12, 0x14];
const FG = [0xd4, 0xff, 0x3a];
// Shapes on a 100x100 grid: [x, y, w, h, radius]
const shapes = [
  [22, 47, 56, 6, 2], // bar
  [14, 32, 10, 36, 3], // left outer plate
  [25, 26, 9, 48, 3], // left inner plate
  [66, 26, 9, 48, 3], // right inner plate
  [76, 32, 10, 36, 3], // right outer plate
];

function inside(px, py) {
  return shapes.some(([x, y, w, h, r]) => {
    if (px < x || px > x + w || py < y || py > y + h) return false;
    const cx = Math.min(Math.max(px, x + r), x + w - r);
    const cy = Math.min(Math.max(py, y + r), y + h - r);
    return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
  });
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size, scale) {
  // scale < 1 shrinks the artwork toward the center (safe zone for maskable icons)
  const raw = Buffer.alloc(size * (size * 3 + 1));
  const ss = 3; // supersampling for smooth edges
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let hits = 0;
      for (let sy = 0; sy < ss; sy++)
        for (let sx = 0; sx < ss; sx++) {
          const u = (((x + (sx + 0.5) / ss) / size) * 100 - 50) / scale + 50;
          const v = (((y + (sy + 0.5) / ss) / size) * 100 - 50) / scale + 50;
          if (inside(u, v)) hits++;
        }
      const a = hits / (ss * ss);
      const o = y * (size * 3 + 1) + 1 + x * 3;
      for (let i = 0; i < 3; i++) raw[o + i] = Math.round(BG[i] * (1 - a) + FG[i] * a);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

writeFileSync(join(out, "icon-192.png"), png(192, 0.8));
writeFileSync(join(out, "icon-512.png"), png(512, 0.8));
writeFileSync(join(out, "apple-touch-icon.png"), png(180, 0.8));

const hex = (c) => "#" + c.map((n) => n.toString(16).padStart(2, "0")).join("");
writeFileSync(
  join(out, "icon.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${hex(BG)}"/>` +
    shapes.map(([x, y, w, h, r]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${hex(FG)}"/>`).join("") +
    `</svg>\n`,
);
console.log("icons written");
