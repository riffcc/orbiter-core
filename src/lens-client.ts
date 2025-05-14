import * as fs from "fs";
import * as path from "path";
import * as net from "net";
import { DEFAULT_ORBITER_DIR } from "./consts.js";

/**
 * Interface for lens commands
 */
export interface LensCommand {
  type: string;
  payload?: any;
}

/**
 * Interface for lens responses
 */
export interface LensResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Checks if a lens is running in the specified directory
 * @param dir Directory of the Orbiter node
 * @returns True if a lens is running, false otherwise
 */
export async function isLensRunning(dir: string = DEFAULT_ORBITER_DIR): Promise<boolean> {
  const pidFile = path.join(dir, "lens.pid");
  
  if (!fs.existsSync(pidFile)) {
    return false;
  }
  
  try {
    const pid = parseInt(fs.readFileSync(pidFile, "utf-8").trim(), 10);
    
    process.kill(pid, 0);
    return true;
  } catch (error) {
    try {
      fs.unlinkSync(pidFile);
    } catch (e) {
    }
    return false;
  }
}

/**
 * Gets the socket path for the lens running in the specified directory
 * @param dir Directory of the Orbiter node
 * @returns Path to the lens socket
 */
export function getLensSocketPath(dir: string = DEFAULT_ORBITER_DIR): string {
  return path.join(dir, "lens.sock");
}

/**
 * Sends a command to a running lens
 * @param command Command to send
 * @param dir Directory of the Orbiter node
 * @returns Promise that resolves with the response from the lens
 */
export function sendCommandToLens(
  command: LensCommand,
  dir: string = DEFAULT_ORBITER_DIR
): Promise<LensResponse> {
  return new Promise((resolve, reject) => {
    const socketPath = getLensSocketPath(dir);
    
    if (!fs.existsSync(socketPath)) {
      reject(new Error(`Lens socket not found at ${socketPath}`));
      return;
    }
    
    const client = net.createConnection({ path: socketPath }, () => {
      client.write(JSON.stringify(command));
    });
    
    let data = "";
    
    client.on("data", (chunk) => {
      data += chunk.toString();
    });
    
    client.on("end", () => {
      try {
        const response = JSON.parse(data) as LensResponse;
        resolve(response);
      } catch (error) {
        reject(new Error(`Failed to parse response: ${error.message}`));
      }
    });
    
    client.on("error", (error) => {
      reject(new Error(`Failed to connect to lens: ${error.message}`));
    });
  });
}

/**
 * Authorizes a user through a running lens
 * @param userId ID of the user to authorize
 * @param admin Whether to make the user an admin
 * @param dir Directory of the Orbiter node
 * @returns Promise that resolves when the user is authorized
 */
export async function authorizeUserThroughLens(
  userId: string,
  admin: boolean = true,
  dir: string = DEFAULT_ORBITER_DIR
): Promise<void> {
  const isRunning = await isLensRunning(dir);
  
  if (!isRunning) {
    throw new Error("No lens is running. Start a lens with 'orb run' first.");
  }
  
  const response = await sendCommandToLens(
    {
      type: "authorizeUser",
      payload: {
        userId,
        admin,
      },
    },
    dir
  );
  
  if (!response.success) {
    throw new Error(response.error || "Failed to authorize user");
  }
}
