import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const iconSvg = readFileSync(path.join(root, "public/icon.svg"));
const maskableSvg = readFileSync(path.join(root, "public/icon-maskable.svg"));

async function renderPng(svg, size) {
  return sharp(svg, { density: 384 })
    .resize(size, size, { fit: "contain" })
    .png()
    .toBuffer();
}

function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  const dir = [];
  const data = [];
  let offset = 6 + entries.length * 16;

  for (const { size, buffer } of entries) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += buffer.length;
    dir.push(entry);
    data.push(buffer);
  }

  return Buffer.concat([header, ...dir, ...data]);
}

const iconsDir = path.join(root, "public/icons");
mkdirSync(iconsDir, { recursive: true });

const icoEntries = [];
for (const size of [16, 32, 48]) {
  icoEntries.push({ size, buffer: await renderPng(iconSvg, size) });
}
writeFileSync(path.join(root, "src/app/favicon.ico"), buildIco(icoEntries));

writeFileSync(
  path.join(root, "src/app/apple-icon.png"),
  await renderPng(iconSvg, 180)
);

for (const size of [192, 512]) {
  writeFileSync(
    path.join(iconsDir, `icon-${size}.png`),
    await renderPng(iconSvg, size)
  );
}
writeFileSync(
  path.join(iconsDir, "icon-maskable-512.png"),
  await renderPng(maskableSvg, 512)
);
writeFileSync(
  path.join(iconsDir, "apple-touch-icon.png"),
  await renderPng(iconSvg, 180)
);
writeFileSync(
  path.join(iconsDir, "favicon-32.png"),
  await renderPng(iconSvg, 32)
);

const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="ogbg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#312e81"/>
      <stop offset="0.5" stop-color="#4f46e5"/>
      <stop offset="1" stop-color="#a21caf"/>
    </linearGradient>
    <linearGradient id="ogbox" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4f46e5"/>
      <stop offset="0.5" stop-color="#7c3aed"/>
      <stop offset="1" stop-color="#c026d3"/>
    </linearGradient>
    <linearGradient id="cap" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#e6e4ff"/>
    </linearGradient>
    <radialGradient id="ogglow" cx="0.15" cy="0.05" r="0.9">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.3"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.05"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#ogbg)"/>
  <rect width="1200" height="630" fill="url(#ogglow)"/>
  <circle cx="1090" cy="110" r="230" fill="#ffffff" opacity="0.05"/>
  <circle cx="110" cy="580" r="200" fill="#ffffff" opacity="0.05"/>

  <text x="96" y="250" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="78" font-weight="700" fill="#ffffff">Student App</text>
  <text x="98" y="312" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="34" font-weight="400" fill="#e9e7ff">Talabalar uchun aqlli platforma</text>

  <g font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="28" fill="#ffffff">
    <rect x="96" y="388" width="236" height="62" rx="31" fill="#ffffff" fill-opacity="0.14" stroke="#ffffff" stroke-opacity="0.3"/>
    <text x="128" y="428">Dars jadvali</text>
    <rect x="352" y="388" width="182" height="62" rx="31" fill="#ffffff" fill-opacity="0.14" stroke="#ffffff" stroke-opacity="0.3"/>
    <text x="384" y="428">Vazifalar</text>
    <rect x="554" y="388" width="236" height="62" rx="31" fill="#ffffff" fill-opacity="0.14" stroke="#ffffff" stroke-opacity="0.3"/>
    <text x="586" y="428">AI yordamchi</text>
  </g>

  <g transform="translate(812 158)">
    <rect width="292" height="292" rx="70" fill="url(#ogbox)" stroke="#ffffff" stroke-opacity="0.28" stroke-width="2"/>
    <g transform="translate(146 146) scale(0.53) translate(-272 -222)">
      <path d="M404 96l11 33 33 11-33 11-11 33-11-33-33-11 33-11 11-33z" fill="#fde68a"/>
      <path d="M256 138 88 214l168 76 168-76-168-76z" fill="url(#cap)"/>
      <path d="M156 256v56c0 27 45 49 100 49s100-22 100-49v-56l-100 45-100-45z" fill="#ffffff" opacity="0.88"/>
      <path d="M424 214v88" stroke="#fbbf24" stroke-width="17" stroke-linecap="round"/>
      <circle cx="424" cy="322" r="21" fill="#fbbf24"/>
    </g>
  </g>
</svg>`;

const ogPng = await sharp(Buffer.from(ogSvg), { density: 144 })
  .resize(1200, 630)
  .png()
  .toBuffer();
writeFileSync(path.join(root, "src/app/opengraph-image.png"), ogPng);
writeFileSync(path.join(root, "public/og-image.png"), ogPng);

console.log("Icons generated:");
console.log(" - src/app/favicon.ico (16/32/48)");
console.log(" - src/app/apple-icon.png (180)");
console.log(" - src/app/opengraph-image.png (1200x630)");
console.log(" - public/icons/icon-192.png, icon-512.png");
console.log(" - public/icons/icon-maskable-512.png");
console.log(" - public/icons/apple-touch-icon.png, favicon-32.png");
