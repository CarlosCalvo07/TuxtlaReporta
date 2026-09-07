import { deflateSync } from "node:zlib";
import { writeFile, mkdir } from "node:fs/promises";
function crc(b) {
  let c = 0xffffffff;
  for (const x of b) {
    c ^= x;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type),
    length = Buffer.alloc(4),
    checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  checksum.writeUInt32BE(crc(Buffer.concat([t, data])));
  return Buffer.concat([length, t, data, checksum]);
}
function png(size) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xx = x / size,
        yy = y / size;
      const on =
        (xx > 0.25 && xx < 0.75 && yy > 0.25 && yy < 0.39) ||
        (xx > 0.435 && xx < 0.565 && yy > 0.35 && yy < 0.75) ||
        (xx - 0.76) ** 2 + (yy - 0.73) ** 2 < 0.055 ** 2;
      const color = on ? [214, 228, 185] : [23, 63, 53];
      for (let c = 0; c < 3; c++)
        raw[y * (size * 3 + 1) + 1 + x * 3 + c] = color[c];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
await mkdir("apps/mobile/assets", { recursive: true });
for (const size of [192, 512])
  await writeFile(`apps/web/public/icon-${size}.png`, png(size));
await writeFile("apps/mobile/assets/icon.png", png(1024));
