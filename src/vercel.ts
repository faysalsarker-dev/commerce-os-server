import { createServer } from "http";
import app from "./app";
import { initializeSocket } from "./app/config/socket";

const server = createServer(app);

initializeSocket(server);

export default server;