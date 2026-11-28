const PALETTES = {
  Technology: ["#4c1d95", "#1d4ed8"],
  Sports: ["#065f46", "#0e7490"],
  "Arts & Culture": ["#831843", "#6d28d9"],
  Literary: ["#78350f", "#9d174d"],
  Business: ["#1e3a8a", "#0f766e"],
  "Social Welfare": ["#14532d", "#4d7c0f"],
  Entertainment: ["#6b21a8", "#be185d"],
  Workshops: ["#3730a3", "#0369a1"],
  Academic: ["#1e40af", "#5b21b6"],
  Coding: ["#312e81", "#0e7490"],
  Quiz: ["#7c2d12", "#4338ca"],
  Debate: ["#1f2937", "#6d28d9"],
  Photography: ["#4a044e", "#1e40af"],
  Creative: ["#7e22ce", "#c026d3"],
};

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function wrapTitle(title, maxChars = 15) {
  const words = title.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    if ((line + " " + word).trim().length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = (line + " " + word).trim();
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

export function posterSvg({ title, category, kicker = "CAMPUS EVENT HUB", variant = 0 }) {
  const [from, to] = PALETTES[category] || ["#312e81", "#6d28d9"];
  const lines = wrapTitle(title);
  const fontSize = lines.length > 2 ? 74 : 88;
  const lineHeight = fontSize * 1.02;
  const baseline = 760;
  const titleSvg = lines
    .map(
      (line, index) =>
        `<text x="84" y="${baseline + index * lineHeight}" font-family="Sora, Inter, sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff" letter-spacing="-2">${esc(
          line
        )}</text>`
    )
    .join("");

  const blobs = [
    `<circle cx="${variant % 2 === 0 ? 980 : 220}" cy="260" r="300" fill="url(#glowA)" opacity="0.85"/>`,
    `<circle cx="${variant % 2 === 0 ? 200 : 1020}" cy="840" r="260" fill="url(#glowB)" opacity="0.75"/>`,
    `<circle cx="600" cy="480" r="420" fill="none" stroke="#ffffff" stroke-opacity="0.09" stroke-width="1.4"/>`,
    `<circle cx="600" cy="480" r="300" fill="none" stroke="#ffffff" stroke-opacity="0.07" stroke-width="1"/>`,
    `<path d="M-100 980 Q 320 520 760 940 T 1320 760" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="1.5"/>`,
    `<path d="M-60 1060 Q 380 640 820 1010 T 1360 860" fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="1"/>`,
  ].join("");

  const dots = Array.from({ length: 26 })
    .map((_, index) => {
      const x = 60 + ((index * 137) % 1080);
      const y = 90 + ((index * 211) % 700);
      const r = index % 5 === 0 ? 2.6 : 1.5;
      return `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" opacity="${index % 3 === 0 ? 0.32 : 0.16}"/>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="900" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#06060f"/>
      <stop offset="0.55" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
    <radialGradient id="glowA" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#a78bfa" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#a78bfa" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="shade" x1="0" y1="380" x2="0" y2="900" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#05060f" stop-opacity="0"/>
      <stop offset="0.65" stop-color="#05060f" stop-opacity="0.72"/>
      <stop offset="1" stop-color="#05060f" stop-opacity="0.92"/>
    </linearGradient>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.05"/></feComponentTransfer>
      <feComposite operator="over" in2="SourceGraphic"/>
    </filter>
  </defs>
  <rect width="1200" height="900" fill="url(#bg)"/>
  ${blobs}
  ${dots}
  <rect width="1200" height="900" fill="url(#shade)"/>
  <rect width="1200" height="900" filter="url(#grain)" fill="none"/>
  <g transform="translate(84,110)">
    <rect x="0" y="0" width="46" height="46" rx="14" fill="#ffffff" fill-opacity="0.08" stroke="#ffffff" stroke-opacity="0.24"/>
    <text x="23" y="31" text-anchor="middle" font-family="Sora, sans-serif" font-size="22" font-weight="700" fill="#ffffff">K</text>
    <text x="62" y="20" font-family="Inter, sans-serif" font-size="15" font-weight="600" fill="#ffffff" letter-spacing="0.5">KIPS COLLEGE</text>
    <text x="62" y="38" font-family="Inter, sans-serif" font-size="10.5" fill="#ffffff" fill-opacity="0.62" letter-spacing="3">CAMPUS EVENT HUB</text>
  </g>
  <g transform="translate(84,190)">
    <rect x="0" y="0" width="${Math.max(150, category.length * 11 + 34)}" height="34" rx="17" fill="#ffffff" fill-opacity="0.1" stroke="#ffffff" stroke-opacity="0.26"/>
    <text x="${Math.max(150, category.length * 11 + 34) / 2}" y="22" text-anchor="middle" font-family="Inter, sans-serif" font-size="12.5" font-weight="600" fill="#e9e6ff" letter-spacing="1.6">${esc(
      category.toUpperCase()
    )}</text>
  </g>
  ${titleSvg}
  <g transform="translate(84,${baseline + lines.length * lineHeight + 6})">
    <rect x="0" y="0" width="64" height="3" rx="1.5" fill="#c4b5fd"/>
    <text x="80" y="8" font-family="Inter, sans-serif" font-size="13" fill="#ffffff" fill-opacity="0.7" letter-spacing="4">${esc(
      kicker.toUpperCase()
    )}</text>
  </g>
</svg>`;
}

export async function writePoster(fs, path, dir, slug, payload) {
  const svg = posterSvg(payload);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${slug}.svg`), svg, "utf8");
  return `/uploads/posters/${slug}.svg`;
}

const LIGHT_PALETTES = {
  "College Events": ["#ede9fe", "#dbeafe"],
  "Society Events": ["#f5f3ff", "#e0f2fe"],
  Entertainment: ["#fdf2f8", "#ede9fe"],
  Cultural: ["#fef3c7", "#ede9fe"],
  Sports: ["#ecfdf5", "#dbeafe"],
  Workshops: ["#eff6ff", "#f5f3ff"],
  Seminars: ["#f0f9ff", "#eef2ff"],
  Competitions: ["#fff7ed", "#ede9fe"],
  Celebrations: ["#fdf4ff", "#eff6ff"],
  Charity: ["#f0fdf4", "#ecfeff"],
  Other: ["#f8fafc", "#ede9fe"],
};

export function lightPosterSvg({ title, category, kicker = "KIPS CAMPUS EVENT HUB", variant = 0 }) {
  const [from, to] = LIGHT_PALETTES[category] || ["#f5f3ff", "#dbeafe"];
  const lines = wrapTitle(title, 13);
  const fontSize = lines.length > 2 ? 78 : 94;
  const lineHeight = fontSize * 1.04;
  const baseline = 590;
  const titleSvg = lines
    .map(
      (line, index) =>
        `<text x="92" y="${baseline + index * lineHeight}" font-family="Sora, Inter, sans-serif" font-size="${fontSize}" font-weight="700" fill="#1b1633" letter-spacing="-2.5">${esc(
          line
        )}</text>`
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2="1200" y2="900" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
    </linearGradient>
    <linearGradient id="royal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6d28d9"/><stop offset="1" stop-color="#2563eb"/>
    </linearGradient>
    <radialGradient id="orb" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#8b5cf6" stop-opacity="0.5"/><stop offset="1" stop-color="#8b5cf6" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="orb2" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#3b82f6" stop-opacity="0.45"/><stop offset="1" stop-color="#3b82f6" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="#6d28d9" stroke-opacity="0.07"/>
    </pattern>
  </defs>
  <rect width="1200" height="900" fill="url(#paper)"/>
  <rect width="1200" height="900" fill="url(#grid)"/>
  <circle cx="${variant % 2 === 0 ? 1000 : 190}" cy="210" r="300" fill="url(#orb)"/>
  <circle cx="${variant % 2 === 0 ? 230 : 1010}" cy="780" r="330" fill="url(#orb2)"/>
  <circle cx="${variant % 2 === 0 ? 940 : 260}" cy="${variant % 2 === 0 ? 700 : 160}" r="150" fill="none" stroke="#6d28d9" stroke-opacity="0.14" stroke-width="1.4"/>
  <rect x="92" y="84" width="56" height="56" rx="18" fill="url(#royal)"/>
  <text x="120" y="123" text-anchor="middle" font-family="Sora, sans-serif" font-size="26" font-weight="700" fill="#ffffff">K</text>
  <text x="166" y="108" font-family="Inter, sans-serif" font-size="17" font-weight="700" fill="#2a2350" letter-spacing="1">KIPS COLLEGE</text>
  <text x="166" y="128" font-family="Inter, sans-serif" font-size="10.5" font-weight="600" fill="#7c6fa8" letter-spacing="3.4">CAMPUS EVENT HUB</text>
  <g transform="translate(92,196)">
    <rect width="${Math.max(160, category.length * 11 + 40)}" height="38" rx="19" fill="#ffffff" stroke="#d8cffb"/>
    <rect width="8" height="38" rx="4" fill="url(#royal)"/>
    <text x="26" y="24" font-family="Inter, sans-serif" font-size="12.5" font-weight="700" fill="#4c1d95" letter-spacing="1.8">${esc(category.toUpperCase())}</text>
  </g>
  ${titleSvg}
  <g transform="translate(92,${baseline + lines.length * lineHeight + 10})">
    <rect width="66" height="4" rx="2" fill="url(#royal)"/>
    <text x="84" y="8" font-family="Inter, sans-serif" font-size="12" font-weight="600" fill="#7c6fa8" letter-spacing="4.5">${esc(kicker.toUpperCase())}</text>
  </g>
  <circle cx="${variant % 2 === 0 ? 1010 : 190}" cy="${variant % 2 === 0 ? 760 : 120}" r="84" fill="#ffffff" fill-opacity="0.7" stroke="#e3dbfb"/>
  <path d="${variant % 2 === 0 ? "M980 760l20 20 40-44" : "M160 120l20 20 40-44"}" fill="none" stroke="#6d28d9" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

export function societyCoverSvg({ name, color = "#6d28d9", variant = 0 }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="760" viewBox="0 0 1600 760">
  <defs>
    <linearGradient id="c" x1="0" y1="0" x2="1600" y2="760" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="#2563eb"/>
    </linearGradient>
    <radialGradient id="w" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.4"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1600" height="760" fill="url(#c)"/>
  <rect width="1600" height="760" fill="#1b1633" opacity="0.14"/>
  <circle cx="${variant % 2 === 0 ? 1320 : 280}" cy="170" r="340" fill="url(#w)"/>
  <circle cx="${variant % 2 === 0 ? 240 : 1380}" cy="640" r="300" fill="url(#w)" opacity="0.6"/>
  <circle cx="800" cy="380" r="290" fill="none" stroke="#ffffff" stroke-opacity="0.16" stroke-width="1.5"/>
  <circle cx="800" cy="380" r="210" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="1.2"/>
  <text x="110" y="120" font-family="Inter, sans-serif" font-size="15" font-weight="700" fill="#ffffff" fill-opacity="0.8" letter-spacing="4">KIPS COLLEGE · SOCIETY</text>
  <text x="110" y="620" font-family="Sora, Inter, sans-serif" font-size="64" font-weight="700" fill="#ffffff" letter-spacing="-1.5">${esc(name)}</text>
  <rect x="110" y="656" width="86" height="5" rx="2.5" fill="#ffffff" fill-opacity="0.85"/>
</svg>`;
}

export function societyLogoSvg({ name, color = "#6d28d9" }) {
  const letters = name
    .split(" ")
    .filter((word) => !["and", "&", "of", "the"].includes(word.toLowerCase()))
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="l" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="#2563eb"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="132" fill="url(#l)"/>
  <circle cx="256" cy="256" r="168" fill="none" stroke="#ffffff" stroke-opacity="0.22" stroke-width="2"/>
  <text x="256" y="300" text-anchor="middle" font-family="Sora, Inter, sans-serif" font-size="150" font-weight="700" fill="#ffffff">${esc(letters)}</text>
</svg>`;
}

async function writeFileSafe(fs, path, filePath, contents) {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, contents, "utf8");
  } catch (err) {
    // Serverless filesystems are read-only; the committed SVGs are served instead.
    console.warn(`poster write skipped for ${filePath}: ${err.code || err.message}`);
  }
}

export async function writeLightPoster(fs, path, dir, slug, payload) {
  const svg = lightPosterSvg(payload);
  await writeFileSafe(fs, path, path.join(dir, `${slug}.svg`), svg);
  return `/uploads/posters/${slug}.svg`;
}

export async function writeSocietyArt(fs, path, root, slug, society) {
  const dir = path.join(root, "societies");
  await writeFileSafe(fs, path, path.join(dir, `${slug}-cover.svg`), societyCoverSvg({ name: society.name, color: society.color }));
  await writeFileSafe(fs, path, path.join(dir, `${slug}-logo.svg`), societyLogoSvg({ name: society.name, color: society.color }));
  return {
    cover: `/uploads/societies/${slug}-cover.svg`,
    logo: `/uploads/societies/${slug}-logo.svg`,
  };
}
