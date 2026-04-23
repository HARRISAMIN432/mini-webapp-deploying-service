import net from "net";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const isPortFree = async (port: number): Promise<boolean> => {
  // Method 1: Try to bind to the port (works for local processes)
  const isLocalPortFree = await new Promise<boolean>((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on("error", () => resolve(false));
    server.listen(port, "0.0.0.0", () => {
      // Changed from 127.0.0.1 to 0.0.0.0
      server.close(() => resolve(true));
    });
  });

  // Method 2: Check for Docker containers using this port on Windows
  try {
    const { stdout } = await execAsync(
      `netstat -ano | findstr :${port} | findstr LISTENING`,
      { timeout: 3000 },
    );
    if (stdout.trim()) {
      console.log(`Port ${port} is in use by another process`);
      return false;
    }
  } catch {
    // No process found using this port
  }

  // Method 3: Check Docker containers specifically
  try {
    const { stdout } = await execAsync(
      `docker ps --format "table {{.Ports}}" | findstr :${port}`,
      { timeout: 3000 },
    );
    if (stdout.trim()) {
      console.log(`Port ${port} is used by a Docker container`);
      return false;
    }
  } catch {
    // No Docker container using this port
  }

  return isLocalPortFree;
};

export const findAvailablePort = async (start = 5000, end = 9000) => {
  console.log(`🔍 Looking for available port in range ${start}-${end}`);

  for (let port = start; port <= end; port += 1) {
    const isFree = await isPortFree(port);
    if (isFree) {
      console.log(`✅ Found available port: ${port}`);
      return port;
    } else {
      console.log(`❌ Port ${port} is in use, trying next...`);
    }
  }

  throw new Error(`No available ports in range ${start}-${end}`);
};
