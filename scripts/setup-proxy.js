#!/usr/bin/env node
/**
 * scripts/setup-proxy.js
 *
 * Cross-platform Node.js script to start the ShipStack nginx reverse proxy.
 * Use this if you prefer npm scripts over PowerShell.
 *
 * Usage:
 *   node scripts/setup-proxy.js           # Start the proxy
 *   node scripts/setup-proxy.js --down    # Stop the proxy
 *   node scripts/setup-proxy.js --status  # Check proxy status
 *
 * Add to package.json:
 *   "proxy:up":     "node scripts/setup-proxy.js"
 *   "proxy:down":   "node scripts/setup-proxy.js --down"
 *   "proxy:status": "node scripts/setup-proxy.js --status"
 */

const { execFileSync, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const COMPOSE_FILE = path.join(PROJECT_ROOT, "docker-compose.proxy.yml");
const CONF_DIR = path.join(PROJECT_ROOT, "infra", "nginx", "conf.d");

const args = process.argv.slice(2);
const isDown = args.includes("--down");
const isStatus = args.includes("--status");

function run(cmd, args, options = {}) {
  try {
    return execFileSync(cmd, args, {
      stdio: "inherit",
      encoding: "utf-8",
      ...options,
    });
  } catch (err) {
    if (!options.ignoreError) throw err;
    return null;
  }
}

function runCapture(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: "utf-8", stdio: "pipe" }).trim();
  } catch {
    return null;
  }
}

function ensureConfDir() {
  if (!fs.existsSync(CONF_DIR)) {
    fs.mkdirSync(CONF_DIR, { recursive: true });
    console.log(`✓ Created conf.d: ${CONF_DIR}`);
  }
}

function checkDocker() {
  const result = runCapture("docker", ["info"]);
  if (!result) {
    console.error("✗ Docker is not running. Please start Docker Desktop.");
    process.exit(1);
  }
  console.log("✓ Docker is running");
}

if (isStatus) {
  const status = runCapture("docker", [
    "inspect",
    "--format",
    "{{.State.Status}}",
    "shipstack-proxy",
  ]);
  if (!status) {
    console.log("ℹ Proxy container is not running");
  } else {
    console.log(`ℹ Proxy container status: ${status}`);
  }
  process.exit(0);
}

if (isDown) {
  console.log("Stopping proxy...");
  run("docker", ["compose", "-f", COMPOSE_FILE, "down"]);
  console.log("✓ Proxy stopped");
  process.exit(0);
}

// ── Start ─────────────────────────────────────────────────────────────────────
console.log("\n🚀 Starting ShipStack reverse proxy...\n");

checkDocker();
ensureConfDir();

run("docker", ["compose", "-f", COMPOSE_FILE, "up", "-d", "--pull", "always"]);

// Brief wait for container to settle
const start = Date.now();
let running = false;
while (Date.now() - start < 5000) {
  execSync("sleep 1 || timeout /t 1 /nobreak > nul", {
    shell: true,
    stdio: "ignore",
  });
  const status = runCapture("docker", [
    "inspect",
    "--format",
    "{{.State.Status}}",
    "shipstack-proxy",
  ]);
  if (status === "running") {
    running = true;
    break;
  }
}

if (!running) {
  console.error("\n✗ Proxy failed to start. Run: docker logs shipstack-proxy");
  process.exit(1);
}

console.log("\n✅ Proxy is running!");
console.log("   Deployments will be available at: http://<name>.localhost\n");
