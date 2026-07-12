import { Server } from "http";
import app from './app';
import { config } from "./app/config";
import { initializeSocket } from "./app/config/socket";

let server: Server;

async function bootstrap() {
  try {
    const PORT = config.app.port || 5000;
    server = app.listen(PORT, () => {
      console.log(`🚀 Server is humming along on http://localhost:${PORT}`);
    });

    initializeSocket(server);
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Helper for Graceful Shutdown
const shutdown = (signal: string, error?: Error) => {
  console.log(`\n--- ${signal} received ---`);
  if (error) console.error("Error details:", error);
  
  if (server) {
    console.log("🛑 Closing HTTP server...");
    server.close(() => {
      console.log("✅ HTTP server closed. Process exiting.");
      process.exit(error ? 1 : 0);
    });
  } else {
    process.exit(error ? 1 : 0);
  }
};


process.on("uncaughtException", (err) => {
  shutdown("UNCAUGHT EXCEPTION", err);
});


process.on("unhandledRejection", (err: Error) => {
  shutdown("UNHANDLED REJECTION", err);
});


process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

bootstrap();