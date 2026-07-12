# Real-Time Stock Update with Socket.IO

This document explains the best way to update product stock instantly when a sale is made or a returned product is processed.

## Goal

When a product is sold or returned, the backend should:

1. update the `ProductVariant.stockQty` in the database,
2. save the related stock movement record,
3. broadcast the latest stock value to the frontend in real time.

This gives the frontend a live stock quantity update without refreshing the page.

---

## Best implementation approach

The safest pattern is:

- use a Prisma transaction for the stock mutation and stock movement insert,
- commit the database changes first,
- then emit the `stock:update` Socket.IO event.

This ensures the server does not broadcast stale stock values.

---

## What changed

The sales logic now updates stock on:

- `checkoutSale()` for product sale
- `returnProduct()` for product return

After those operations finish successfully, the backend emits:

```ts
socket.emit("stock:update", payload)
```

The socket event is sent from the server using the `broadcastStockUpdate()` helper.

---

## Socket event name

### `stock:update`

This is the event the frontend listens to.

### Example payload

```ts
{
  variantId: "variant_123",
  productId: "product_456",
  productName: "Blue Shirt",
  colorName: "Blue",
  size: "M",
  stockQty: 12,
  movementType: "SALE_OUT",
  updatedAt: "2026-07-12T10:00:00.000Z"
}
```

### Meaning

- `variantId`: the product variant being updated
- `productId`: the parent product
- `productName`: product name
- `colorName`: color name
- `size`: variant size
- `stockQty`: the latest stock quantity after the operation
- `movementType`: either `SALE_OUT` or `RETURN_IN`
- `updatedAt`: time when the update happened

---

## Why this is the best approach

### 1. Real-time update

The frontend receives the newest stock value instantly without manual refresh.

### 2. Consistent inventory data

Because the stock amount is updated inside a transaction, the database remains consistent.

### 3. Reliable frontend UI

The UI can update the card, modal, stock badge, or table immediately after receiving the event.

---

## Frontend integration example

```ts
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  withCredentials: true,
  auth: {
    token: accessToken,
  },
});

socket.on("stock:update", (payload) => {
  console.log("Stock updated:", payload);

  // Example: update product stock in your UI state
  // updateStockState(payload.variantId, payload.stockQty);
});
```

## Recommended UI behavior

When the frontend receives `stock:update`:

- find the matching `variantId`,
- update the displayed stock count,
- optionally refresh the cart total or product list,
- optionally show a short toast like "Stock updated".

---

## Best practice notes

- Always use a transaction when both `ProductVariant` and `StockMovement` change together.
- Emit the socket event only after the transaction succeeds.
- Always use the latest `updatedVariant.stockQty` from the database result.
- Do not broadcast before the DB update is committed.

---

## Files involved

- Backend socket logic: `src/app/config/socket.ts`
- Sales stock update flow: `src/app/modules/sales/sales.service.ts`
- Product schema: `prisma/product.prisma`

---

## Summary

The stock update is now handled in real time using Socket.IO:

- sale decreases stock immediately,
- return increases stock immediately,
- every connected frontend receives a live `stock:update` event,
- the stock quantity in the UI stays synced automatically.
