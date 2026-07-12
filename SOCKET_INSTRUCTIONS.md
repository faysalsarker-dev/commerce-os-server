# Socket Presence Instructions

This file is a separate guide for the new Socket.IO user presence feature.

## Overview

The backend now tracks whether a user is online or offline.

- A user becomes online when the frontend connects to the Socket.IO server with a valid JWT token.
- The user stays online while the socket connection stays alive.
- The user becomes offline when the socket disconnects or the user logs out.

## Backend presence fields

The `User` model now includes:

```prisma
isOnline   Boolean   @default(false)
lastSeenAt DateTime?
```

## Socket events

### Frontend → Backend

#### `presence:heartbeat`

Send this event from the frontend to show the user is still active.

```ts
socket.emit("presence:heartbeat");
```

### Backend → Frontend

#### `presence:status`

The backend emits this event whenever the user state changes.

Example payload:

```ts
{
  userId: "user_123",
  name: "John Doe",
  email: "john@example.com",
  phone: "0123456789",
  role: "ONLINE_SALESMAN",
  status: "ACTIVE",
  image: null,
  isOnline: true,
  lastSeenAt: "2026-07-12T10:00:00.000Z"
}
```

## Frontend connection example

```ts
import { io } from "socket.io-client";

const accessToken = localStorage.getItem("accessToken");

const socket = io("http://localhost:5000", {
  withCredentials: true,
  auth: {
    token: accessToken,
  },
});
```

## Frontend listener example

```ts
socket.on("presence:status", (payload) => {
  console.log("Presence update:", payload);
});
```

## Heartbeat example

```ts
socket.on("connect", () => {
  socket.emit("presence:heartbeat");

  setInterval(() => {
    socket.emit("presence:heartbeat");
  }, 30000);
});
```

## Offline behavior

When the browser tab closes or the socket disconnects, the backend updates the user to:

- `isOnline = false`
- `lastSeenAt = current time`

## Best practice

- Connect to the socket only after login.
- Send a heartbeat every 30 seconds while the user is active.
- Use `presence:status` to show online/offline badges in the UI.
- Call `socket.disconnect()` on logout or page close.
