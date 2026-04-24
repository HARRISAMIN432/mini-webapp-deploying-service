import fs from "fs/promises";
import path from "path";
import { runRepoCommand } from "./git.service";

// Framework-specific configurations
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
  // Build args for Docker build (these become build-time env vars)
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

  // Generate ARG declarations for build-time
  const buildArgs = envVars.map((env) => `ARG ${env.key}`).join("\n");

  // Generate ENV exports for runtime (these become available in the container)
  const envExports = envVars
    .map((env) => `ENV ${env.key}=${env.key}`)
    .join("\n");

  // Insert ARGs after FROM, and ENVs after ARGs
  const lines = baseDockerfile.split("\n");
  const fromIndex = lines.findIndex((line) => line.startsWith("FROM"));

  if (fromIndex !== -1) {
    lines.splice(fromIndex + 1, 0, "", buildArgs, "", envExports);
  }

  return lines.join("\n");
};

const getFrameworkConfig = async (
  repoDir: string,
  envVars: Array<{ key: string; value: string }> = [],
): Promise<FrameworkConfig> => {
  // Check for package.json (Node.js projects)
  const packageJsonPath = path.join(repoDir, "package.json");
  let packageJson: any = null;

  try {
    const content = await fs.readFile(packageJsonPath, "utf-8");
    packageJson = JSON.parse(content);
  } catch {
    // No package.json found
  }

  // Check for Python project files
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

  // Check for Vite
  const hasVite =
    packageJson?.devDependencies?.vite || packageJson?.dependencies?.vite;

  // Check for Next.js
  const hasNext = packageJson?.dependencies?.next;

  // Check for Express
  const hasExpress = packageJson?.dependencies?.express;

  let baseConfig: FrameworkConfig;

  // Vite configuration
  if (hasVite) {
    baseConfig = {
      port: 5173,
      type: "vite",
      dockerfile: `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .
RUN npm run build || true
EXPOSE 5173
ENV HOST=0.0.0.0
ENV PORT=5173
CMD ["sh", "-c", "npm run dev -- --host 0.0.0.0 --port 5173 || npm run preview -- --host 0.0.0.0 --port 5173"]
`,
      buildCommand: "npm run build",
      startCommand: "npm run dev -- --host 0.0.0.0 --port 5173",
      healthCheckPath: "/",
    };
  }
  // Next.js configuration
  else if (hasNext) {
    baseConfig = {
      port: 3000,
      type: "next",
      dockerfile: `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .
RUN npm run build
EXPOSE 3000
ENV HOST=0.0.0.0
ENV PORT=3000
CMD ["sh", "-c", "npm run start -- -H 0.0.0.0 -p 3000 || npm run dev -- -H 0.0.0.0 -p 3000"]
`,
      buildCommand: "npm run build",
      startCommand: "npm start",
      healthCheckPath: "/api/health",
    };
  }
  // Express/Node.js configuration
  else if (hasExpress || packageJson) {
    // Detect if it has a start script
    const hasStartScript = packageJson?.scripts?.start;
    const hasDevScript = packageJson?.scripts?.dev;

    let startCommand = "node server.js";
    if (hasStartScript) startCommand = "npm start";
    else if (hasDevScript) startCommand = "npm run dev";
    else if (packageJson?.main) startCommand = `node ${packageJson.main}`;

    baseConfig = {
      port: 3000,
      type: "node",
      dockerfile: `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .
RUN npm run build || true
EXPOSE 3000
ENV PORT=3000
ENV HOST=0.0.0.0
CMD ["sh", "-c", "${startCommand}"]
`,
      buildCommand: packageJson?.scripts?.build || "echo 'No build step'",
      startCommand: startCommand,
      healthCheckPath: "/health",
    };
  }
  // Python configuration
  else if (isPython) {
    // Detect framework
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

    let dockerfile = `FROM python:3.11-slim
WORKDIR /app

# Install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt || true

COPY . .

EXPOSE 8000
ENV PORT=8000
`;

    let startCommand = "";

    if (hasFlask) {
      dockerfile += `ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_RUN_PORT=8000
CMD ["flask", "run", "--host=0.0.0.0", "--port=8000"]
`;
      startCommand = "flask run --host=0.0.0.0 --port=8000";
    } else if (hasDjango) {
      dockerfile += `CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
`;
      startCommand = "python manage.py runserver 0.0.0.0:8000";
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
      buildCommand: "pip install -r requirements.txt || true",
      startCommand,
      healthCheckPath: "/",
    };
  }
  // Default Node.js fallback
  else {
    baseConfig = {
      port: 3000,
      type: "node",
      dockerfile: `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .
RUN npm run build || true
EXPOSE 3000
CMD ["npm", "start"]
`,
      buildCommand: "npm run build || true",
      startCommand: "npm start",
      healthCheckPath: "/",
    };
  }

  // Inject environment variables into Dockerfile if any exist
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
    // Check if Dockerfile already exists
    await fs.access(dockerFilePath);
    return; // Use existing Dockerfile
  } catch {
    // Generate framework-specific Dockerfile with env vars
    const config = await getFrameworkConfig(repoDir, envVars);
    await fs.writeFile(dockerFilePath, config.dockerfile, "utf-8");

    // Log what was detected
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
  envVars?: Array<{ key: string; value: string }>; // Add env vars parameter
}) => {
  // Detect the framework to get the correct container port
  let containerPort = params.containerPort || 3000;

  try {
    const config = await getFrameworkConfig(params.repoDir);
    containerPort = config.port;
  } catch {
    // Use default or provided port
    containerPort = params.containerPort || 3000;
  }

  // Build the docker run command with environment variables
  const dockerArgs = [
    "run",
    "-d",
    "-p",
    `${params.hostPort}:${containerPort}`,
    "--name",
    params.containerName,
  ];

  // Add environment variables as -e flags
  if (params.envVars && params.envVars.length > 0) {
    for (const env of params.envVars) {
      dockerArgs.push("-e", `${env.key}=${env.value}`);
    }
  }

  dockerArgs.push(params.imageTag);

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
    // no-op
  }
};

export const getFrameworkInfo = async (
  repoDir: string,
  envVars: Array<{ key: string; value: string }> = [],
) => {
  return await getFrameworkConfig(repoDir, envVars);
};

export type { FrameworkConfig };
