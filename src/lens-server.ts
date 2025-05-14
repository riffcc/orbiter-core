import * as fs from "fs";
import * as path from "path";
import * as net from "net";
import { Orbiter } from "./orbiter.js";
import { DEFAULT_ORBITER_DIR } from "./consts.js";
import { LensCommand, LensResponse, getLensSocketPath } from "./lens-client.js";

/**
 * Starts a lens server that listens for commands
 * @param orbiter Orbiter instance
 * @param dir Directory of the Orbiter node
 * @returns Function to stop the server
 */
export function startLensServer(
  orbiter: Orbiter,
  dir: string = DEFAULT_ORBITER_DIR
): () => Promise<void> {
  const socketPath = getLensSocketPath(dir);
  
  if (fs.existsSync(socketPath)) {
    fs.unlinkSync(socketPath);
  }
  
  const server = net.createServer(async (socket) => {
    let data = "";
    
    socket.on("data", async (chunk) => {
      data += chunk.toString();
      
      try {
        const command = JSON.parse(data) as LensCommand;
        let response: LensResponse;
        
        switch (command.type) {
          case "authorizeUser":
            try {
              await orbiter.inviteModerator({
                userId: command.payload.userId,
                admin: command.payload.admin,
              });
              
              response = {
                success: true,
                message: `User ${command.payload.userId} authorized successfully`,
              };
            } catch (error) {
              response = {
                success: false,
                error: `Failed to authorize user: ${error.message}`,
              };
            }
            break;
            
          default:
            response = {
              success: false,
              error: `Unknown command type: ${command.type}`,
            };
        }
        
        socket.end(JSON.stringify(response));
      } catch (error) {
        const response: LensResponse = {
          success: false,
          error: `Failed to parse command: ${error.message}`,
        };
        
        socket.end(JSON.stringify(response));
      }
    });
  });
  
  server.listen(socketPath);
  
  const pidFile = path.join(dir, "lens.pid");
  fs.writeFileSync(pidFile, process.pid.toString());
  
  return async () => {
    return new Promise<void>((resolve) => {
      server.close(() => {
        try {
          if (fs.existsSync(socketPath)) {
            fs.unlinkSync(socketPath);
          }
          
          if (fs.existsSync(pidFile)) {
            fs.unlinkSync(pidFile);
          }
        } catch (e) {
        }
        
        resolve();
      });
    });
  };
}
