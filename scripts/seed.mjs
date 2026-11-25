const base = process.env.APP_URL || "http://localhost:3000";
const secret = process.env.SEED_SECRET || "kips-seed-2026";

const response = await fetch(`${base}/api/dev/seed`, {
  method: "POST",
  headers: { "x-seed-secret": secret },
});

const text = await response.text();
let data;
try {
  data = JSON.parse(text);
} catch {
  data = { raw: text };
}

if (!response.ok || !data.ok) {
  console.error("Seed failed:", response.status, data);
  process.exit(1);
}

console.log("Seed complete:", JSON.stringify(data.counts, null, 2));
console.log("Demo accounts:");
for (const [role, value] of Object.entries(data.credentials || {})) {
  console.log(`  ${role.padEnd(10)} ${value}`);
}
