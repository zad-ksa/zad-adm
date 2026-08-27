const { v2: cloudinary } = require("cloudinary");
const { makePng } = require("./png.tmp.js");
require("dotenv").config({ path: ".env.local", quiet: true });
require("dotenv").config({ path: ".env", quiet: true });
cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
const MB = 1024 * 1024;

async function up(resourceType, name, bytes) {
  const ts = Math.round(Date.now()/1000);
  const pid = `probe_${Date.now()}`;
  const sig = cloudinary.utils.api_sign_request({ folder: "zad_probe", public_id: pid, timestamp: ts }, process.env.CLOUDINARY_API_SECRET);
  const form = new FormData();
  form.append("file", new Blob([bytes]), name);
  form.append("api_key", process.env.CLOUDINARY_API_KEY);
  form.append("timestamp", String(ts));
  form.append("signature", sig);
  form.append("folder", "zad_probe");
  form.append("public_id", pid);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`, { method: "POST", body: form });
  const body = await res.json();
  const mb = (bytes.length/MB).toFixed(1);
  if (res.ok) {
    console.log(`  ${resourceType.padEnd(6)} ${name.padEnd(12)} ${mb.padStart(6)} مB  OK  (خُزّن كـ${body.resource_type})`);
    await cloudinary.uploader.destroy(body.public_id, { resource_type: body.resource_type });
    return true;
  }
  const m = /Maximum is (\d+)/.exec(body?.error?.message || "");
  console.log(`  ${resourceType.padEnd(6)} ${name.padEnd(12)} ${mb.padStart(6)} مB  رُفض${m ? ` — السقف ${(Number(m[1])/MB).toFixed(0)} مB` : " — " + body?.error?.message}`);
  return false;
}

(async () => {
  console.log("صورة PNG صالحة فعلاً، بأنواع موارد مختلفة:\n");
  await up("image", "big.png", makePng(20 * MB));
  await up("auto",  "big.png", makePng(20 * MB));
  await up("video", "big.png", makePng(20 * MB));
  await up("image", "ok.png",  makePng(9 * MB));
})().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
