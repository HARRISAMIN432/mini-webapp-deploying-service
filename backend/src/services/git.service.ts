import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

const runCommand = (
  command: string,
  args: string[],
  cwd?: string,
  timeoutMs = 120000,
): Promise<{ stdout: string; stderr: string }> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: true,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${command} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) return resolve({ stdout, stderr });
      reject(
        new Error(stderr || stdout || `${command} failed with code ${code}`),
      );
    });
  });

export const cloneRepository = async (params: {
  repoUrl: string;
  branch: string;
  targetDir: string;
}) => {
  await fs.mkdir(path.dirname(params.targetDir), { recursive: true });
  await fs.rm(params.targetDir, { recursive: true, force: true });
  await runCommand(
    "git",
    [
      "clone",
      "--depth",
      "1",
      "--branch",
      params.branch,
      params.repoUrl,
      params.targetDir,
    ],
    undefined,
    180000,
  );
};

export const getHeadCommitHash = async (repoDir: string) => {
  const { stdout } = await runCommand(
    "git",
    ["rev-parse", "HEAD"],
    repoDir,
    30000,
  );
  return stdout.trim();
};

export const cleanupDirectory = async (dirPath: string) => {
  await fs.rm(dirPath, { recursive: true, force: true });
};

export const runRepoCommand = async (
  repoDir: string,
  command: string,
  args: string[],
  timeoutMs = 300000,
) => runCommand(command, args, repoDir, timeoutMs);
