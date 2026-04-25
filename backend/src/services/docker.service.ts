/**
 * docker.service.ts  (Phase 4 — production builds only)
 */

import fs from "fs/promises";
import path from "path";
import { runRepoCommand } from "./git.service";

interface FrameworkConfig {
  type: "vite" | "next" | "node" | "python";
  port: number;
  dockerfile: string;
  buildCommand: string;
  startCommand: string;
  healthCheckPath?: string;
}

export const buildDockerImageWithEnv = async (
  repoDir: string,
  imageTag: string,
  envVars: Array<{ key: string; value: string }>,
) => {
  const buildArgs = envVars.reduce((args, env) => {
    return [...args, "--build-arg", `${env.key}=${env.value}`];
  }, [] as string[]);

  await runRepoCommand(
    repoDir,
    "docker",
    ["build", "-t", imageTag, ...buildArgs, "."],
    600000,
  );
};

const generateDockerfileWithEnv = (
  baseDockerfile: string,
  envVars: Array<{ key: string; value: string }>,
): string => {
  if (envVars.length === 0) return baseDockerfile;

  const buildArgs = envVars.map((env) => `ARG ${env.key}`).join("\n");
  const envExports = envVars
    .map((env) => `ENV ${env.key}=${env.key}`)
    .join("\n");

  const lines = baseDockerfile.split("\n");
  const fromIndex = lines.findIndex((line) => line.startsWith("FROM"));

  if (fromIndex !== -1) {
    lines.splice(fromIndex + 1, 0, "", buildArgs, "", envExports);
  }

  return lines.join("\n");
};

// Helper to add .env cleanup to any Dockerfile
const addEnvCleanup = (dockerfile: string): string => {
  const cleanupLines = `
# Remove any .env files to prevent sourcing/evaluation issues
RUN rm -f .env .env.production .env.local .env.* 2>/dev/null || true
`;

  // Insert after the last FROM or WORKDIR
  const lines = dockerfile.split("\n");
  let insertIndex = lines.length - 1;

  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].startsWith("CMD") || lines[i].startsWith("ENTRYPOINT")) {
      insertIndex = i;
      break;
    }
  }

  lines.splice(insertIndex, 0, cleanupLines);
  return lines.join("\n");
};

const getFrameworkConfig = async (
  repoDir: string,
  envVars: Array<{ key: string; value: string }> = [],
): Promise<FrameworkConfig> => {
  const packageJsonPath = path.join(repoDir, "package.json");
  let packageJson: any = null;

  try {
    const content = await fs.readFile(packageJsonPath, "utf-8");
    packageJson = JSON.parse(content);
  } catch {
    // No package.json
  }

  const hasRequirementsTxt = await fs
    .access(path.join(repoDir, "requirements.txt"))
    .then(() => true)
    .catch(() => false);
  const hasSetupPy = await fs
    .access(path.join(repoDir, "setup.py"))
    .then(() => true)
    .catch(() => false);
  const hasPipfile = await fs
    .access(path.join(repoDir, "Pipfile"))
    .then(() => true)
    .catch(() => false);
  const hasPyprojectToml = await fs
    .access(path.join(repoDir, "pyproject.toml"))
    .then(() => true)
    .catch(() => false);
  const isPython =
    hasRequirementsTxt || hasSetupPy || hasPipfile || hasPyprojectToml;

  const hasVite =
    packageJson?.devDependencies?.vite || packageJson?.dependencies?.vite;
  const hasNext = packageJson?.dependencies?.next;
  const hasExpress = packageJson?.dependencies?.express;

  let baseConfig: FrameworkConfig;

  // ── Vite (SPA / static) ───────────────────────────────────────────────────
  if (hasVite) {
    baseConfig = {
      port: 3000,
      type: "vite",
      dockerfile: addEnvCleanup(`FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
EXPOSE 3000
ENV PORT=3000
ENV HOST=0.0.0.0
CMD ["serve", "-s", "dist", "-l", "3000"]
`),
      buildCommand: "npm run build",
      startCommand: "serve -s dist -l 3000",
      healthCheckPath: "/",
    };
  }

  // ── Next.js (SSR / static) ────────────────────────────────────────────────
  else if (hasNext) {
    baseConfig = {
      port: 3000,
      type: "next",
      dockerfile: addEnvCleanup(`FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
`),
      buildCommand: "npm run build",
      startCommand: "next start -H 0.0.0.0 -p 3000",
      healthCheckPath: "/",
    };
  }

  // ── Express / generic Node with socat proxy ────────────────────────────────
  else if (hasExpress || packageJson) {
    const hasStartScript = !!packageJson?.scripts?.start;
    const hasBuildScript = !!packageJson?.scripts?.build;

    const startCmd = hasStartScript
      ? "npm start"
      : packageJson?.main
        ? `node ${packageJson.main}`
        : "node index.js";

    const buildStep = hasBuildScript ? "RUN npm run build" : "# no build step";

    baseConfig = {
      port: 3000,
      type: "node",
      dockerfile: `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
${buildStep}

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache socat
COPY --from=builder /app ./
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Run user's app in background (may bind to 127.0.0.1)
# socat proxies external traffic to the app
CMD sh -c "(${startCmd}) & sleep 5 && socat TCP-LISTEN:3000,fork,reuseaddr TCP:127.0.0.1:3000"
`,
      buildCommand: hasBuildScript ? "npm run build" : "",
      startCommand: startCmd,
      healthCheckPath: "/",
    };
  }

  // ── Python ────────────────────────────────────────────────────────────────
  else if (isPython) {
    const hasFlask = await fs
      .access(path.join(repoDir, "app.py"))
      .then(() => true)
      .catch(() => false);
    const hasDjango = await fs
      .access(path.join(repoDir, "manage.py"))
      .then(() => true)
      .catch(() => false);
    const hasFastAPI = await fs
      .access(path.join(repoDir, "main.py"))
      .then(() => true)
      .catch(() => false);

    let dockerfile = addEnvCleanup(`FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
ENV PORT=8000
ENV HOST=0.0.0.0
`);

    let startCommand = "";

    if (hasFlask) {
      dockerfile += `ENV FLASK_APP=app.py
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "app:app"]
`;
      startCommand = "gunicorn --bind 0.0.0.0:8000 app:app";
    } else if (hasDjango) {
      dockerfile += `CMD ["gunicorn", "--bind", "0.0.0.0:8000", "wsgi:application"]
`;
      startCommand = "gunicorn --bind 0.0.0.0:8000 wsgi:application";
    } else if (hasFastAPI) {
      dockerfile += `CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
`;
      startCommand = "uvicorn main:app --host 0.0.0.0 --port 8000";
    } else {
      dockerfile += `CMD ["python", "-m", "http.server", "8000"]
`;
      startCommand = "python -m http.server 8000";
    }

    baseConfig = {
      port: 8000,
      type: "python",
      dockerfile,
      buildCommand: "pip install -r requirements.txt",
      startCommand,
      healthCheckPath: "/",
    };
  }

  // ── Default fallback ──────────────────────────────────────────────────────
  else {
    baseConfig = {
      port: 3000,
      type: "node",
      dockerfile: addEnvCleanup(`FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build || true
EXPOSE 3000
ENV PORT=3000
ENV HOST=0.0.0.0
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
CMD ["npm", "start"]
`),
      buildCommand: "npm run build || true",
      startCommand: "npm start",
      healthCheckPath: "/",
    };
  }

  // Inject env vars into Dockerfile if needed
  if (envVars.length > 0) {
    baseConfig.dockerfile = generateDockerfileWithEnv(
      baseConfig.dockerfile,
      envVars,
    );
  }

  return baseConfig;
};

export const ensureDockerAvailable = async () => {
  await runRepoCommand(process.cwd(), "docker", ["--version"], 15000);
};

export const ensureDockerfile = async (
  repoDir: string,
  envVars: Array<{ key: string; value: string }> = [],
) => {
  const dockerFilePath = path.join(repoDir, "Dockerfile");

  try {
    await fs.access(dockerFilePath);
    return; // Use the repo's own Dockerfile
  } catch {
    const config = await getFrameworkConfig(repoDir, envVars);
    await fs.writeFile(dockerFilePath, config.dockerfile, "utf-8");

    console.log(`Generated Dockerfile for ${repoDir}:`, {
      port: config.port,
      startCommand: config.startCommand,
      envVarsCount: envVars.length,
    });

    return config;
  }
};

export const buildDockerImage = async (repoDir: string, imageTag: string) => {
  await runRepoCommand(
    repoDir,
    "docker",
    ["build", "-t", imageTag, "."],
    600000,
  );
};

export const runDockerContainer = async (params: {
  repoDir: string;
  imageTag: string;
  containerName: string;
  hostPort: number;
  containerPort?: number;
  envVars?: Array<{ key: string; value: string }>;
}) => {
  let containerPort = params.containerPort || 3000;

  try {
    const config = await getFrameworkConfig(params.repoDir);
    containerPort = config.port;
  } catch {
    containerPort = params.containerPort || 3000;
  }

  const dockerArgs = [
    "run",
    "-d",
    "-p",
    `${params.hostPort}:${containerPort}`,
    "--name",
    params.containerName,
    "--restart",
    "unless-stopped",
  ];

  if (params.envVars && params.envVars.length > 0) {
    for (const env of params.envVars) {
      // ✅ CORRECT: Use env.value, not env.key
      dockerArgs.push("-e", `${env.key}=${env.value}`);
      console.log(
        `[docker.service] Passing env: ${env.key}=${env.value.substring(0, 20)}...`,
      );
    }
  }

  dockerArgs.push(params.imageTag);
  console.log("[docker.service] Full docker command:", dockerArgs.join(" "));

  const { stdout } = await runRepoCommand(
    params.repoDir,
    "docker",
    dockerArgs,
    60000,
  );
  return stdout.trim();
};

export const stopAndRemoveContainer = async (containerIdOrName: string) => {
  try {
    await runRepoCommand(
      process.cwd(),
      "docker",
      ["rm", "-f", containerIdOrName],
      30000,
    );
  } catch {
    // no-op — container may already be gone
  }
};

export const getFrameworkInfo = async (
  repoDir: string,
  envVars: Array<{ key: string; value: string }> = [],
) => {
  return await getFrameworkConfig(repoDir, envVars);
};

export type { FrameworkConfig };
