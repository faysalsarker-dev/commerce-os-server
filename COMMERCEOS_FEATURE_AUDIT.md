# CommerceOS Feature & Database Architecture Audit

**Scope:** Initial audit findings plus follow-up implementation for stock/order reliability and return/exchange flows. Prisma schema, generated client, API docs, and a new migration were updated; no database migration was run. `npm run build` and `tsc --noEmit` passed. `npm run typecheck` is not configured in `package.json`. No database connection was available, so applied migration state and production data cannot be verified. The dashboard repository was later inspected for Redux hooks; a campaign report UI has not been built.

## A. Executive Summary

CommerceOS is a modular TypeScript/Express 5 API using Prisma/PostgreSQL, Zod validation, Redis, Socket.IO, and provider adapters for Pathao and Steadfast. Services generally own database access; the app mounts feature routers under `/api/v1`. Core POS catalog, checkout, customer balances, refunds, orders, expenses, coupons, and courier account/shipment operations are represented in code.

**Feature counts after the implementation updates:** 0 COMPLETE, 9 PARTIAL, 0 WEAK, 6 MISSING. The initial audit counted 6 PARTIAL, 2 WEAK, and 7 MISSING. Stock and order weaknesses have been addressed; return/exchange tracking and basic campaign spend/revenue reporting have been added. Website storefront integration, product funnel analytics, COD verification, and reviews remain absent.

Remaining critical concerns include public mutations on customer, expense-category, category, and size routes. Order cancellation involving collected payments and unequal-value exchanges need coordinated settlement workflows. Stock Socket.IO events are not durable, and courier callbacks are not synchronized into order states. There is no background-job framework or scheduled processing visible.

## B. Feature Implementation Matrix

| # | Feature | Status | Existing Models | Existing Modules/APIs | Missing Parts |
|---|---|---|---|---|---|
| 01 | SKU + Size + Color Variant Management | PARTIAL | `Product`, `ProductColor`, `ProductVariant`, `Size`, `StockMovement` | product, size, sales scan | SKU/QR and variant stock exist; no explicit barcode format/rendering, variant-level visibility, or website-specific price/discount synchronization. |
| 02 | Real-Time Stock Synchronization | PARTIAL | `ProductVariant`, `StockMovement` | sales, product, order cancellation, Socket.IO | Stock mutations use DB guards or row locks and duplicate checkout lines are aggregated. No website sync or durable event/outbox/retry. |
| 03 | Website ↔ Inventory API Integration | MISSING | None dedicated | No integration module | No website credentials, API/webhook synchronization, product feed, retry/reconciliation, or integration-specific access controls. |
| 04 | Return / Exchange Tracking | PARTIAL | `Refund`, `RefundItem`, `RefundPayment`, `Exchange`, `ExchangeItem`, `Sale`, `SaleItem` | authenticated `/refund`, `/refund/exchange` | Sale-item-linked refunds and equal-value exchanges are tracked. No request/approval workflow or price settlement for exchanges. |
| 05 | Profit + Dead Stock Reports | PARTIAL | `SaleItem`, `ProductVariant`, `StockMovement`, `Expense*`, `Refund*` | sales history, expenses | Cost is not snapshotted on sale item; no profit/dead-stock reporting or explicit gross/net profit definitions. |
| 06 | Landing Page Order Integration | MISSING | Product/order/sale primitives only | No landing-page module | No storefront cart/checkout or public order creation/variant reservation flow. |
| 07 | Product Catalog Synchronization | PARTIAL | Product/color/variant models | product CRUD | Catalog fields exist locally; no website destination, sync events/status/retries, or integration mappings. |
| 08 | Order Management | PARTIAL | `Order`, `OrderStatusHistory`, `Sale`, `SaleItem`, `Payment`, `Shipment` | order, sales, courier | Transitions are validated and recorded; unpaid cancellation restores stock and updates sale. Courier callbacks do not advance order state, and paid cancellation requires a separate refund. |
| 09 | Customer Database / CRM | PARTIAL | `Customer`, `Sale`, `Order`, `CouponUsage` | customer | Contact address is only sale snapshot, not customer profile; no segmentation, return-history query/API, activity filters, or defined lifetime-value reports. Cached stats require reliable multi-flow updates. |
| 10 | Marketing Source Tracking | PARTIAL | `Campaign`, `Expense`, `Sale` | `/campaigns`, expense, sales checkout | Campaign CRUD, campaign-linked expenses, campaign attribution, and UTM snapshots exist. No first/last-touch attribution, ad platform import, or campaign dashboard UI. |
| 11 | Product Analytics | MISSING | None | No analytics module | No views/add-to-cart events, funnel/conversion/return-rate aggregation, or product profit analytics. |
| 12 | Abandoned Cart Tracking | MISSING | No cart models | None | `SaleStatus.DRAFT` comment is not a cart implementation; no persistent cart/item, abandonment timestamp, recovery, reminders, or conversion link. |
| 13 | COD Order Verification | MISSING | No verification models/statuses | None | No phone/address verification, history, fraud signals, or dispatch gate. Shipment creation does not check a verification state. |
| 14 | Courier Integration | PARTIAL | `CourierAccount`, `Shipment`, `ShipmentEvent`, `WebhookLog` | courier-integration, Pathao/Steadfast providers | Encrypted credentials, shipment calls, callback signatures and dedupe exist. No automatic dispatch, retry worker, delivery charge policy, verified COD gate, or proof of provider contract correctness in this source audit. |
| 15 | Customer Review System | MISSING | None | None | No ratings/reviews, moderation, verified purchase checks, aggregation, or post-delivery requests. |

## C. Database Model Mapping

The Prisma schema is split across `prisma/*.prisma`; generated Prisma files are generated artifacts and were not used as the source of schema truth. PostgreSQL is declared in `prisma/schema.prisma`. The model inventory includes `Campaign` alongside `Category`, `Coupon`, `CouponUsage`, `CourierAccount`, `Shipment`, `ShipmentEvent`, `WebhookLog`, `Customer`, `ExpenseCategory`, `ExpenseSchedule`, `Expense`, `MessagingConnection`, `MessagingConversation`, `Message`, `Order`, `OrderStatusHistory`, `Exchange`, `ExchangeItem`, `Payment`, `Product`, `ProductColor`, `ProductVariant`, `StockMovement`, `Refund`, `RefundPayment`, `RefundItem`, `Sale`, `SaleItem`, `Size`, `User`, `EmployeeDetail`, `SalaryRecord`. Enums cover staff roles/status, stock movements, product/sale/order/payment, messaging, discount, courier/shipment, campaign platform, and expense frequency.

| Feature | Existing models, fields, relationships | Database gaps / recommendations |
|---|---|---|
| Variants | `Product.colors → ProductColor.variants → ProductVariant`; color has name/hex/images; variant has unique `sku`, unique generated `qrCode`, size FK, `stockQty`, optional price overrides, unique `(productColorId,sizeId)`. | Good core structure. Add DB-level nonnegative stock and positive quantity constraints where applicable; SKU/QR uniqueness is present. If barcode differs from QR, model it explicitly. Add product/color/size visibility and discount only if those business rules are needed. `StockMovement` does not persist before/after quantity or actor. |
| Stock | `StockMovement.variantId → ProductVariant`, type and positive-by-convention quantity. `SaleItem.variantId → ProductVariant`. | No DB constraint enforces positive movement quantities or ties movement to sale/refund/adjustment actor. Consider reference/actor and idempotency keys; avoid cascade deleting stock history (`ProductVariant` currently cascades movements). Durable event/outbox needed for external sync. |
| Order/payment/shipping | `Order.customerId`, unique `saleId`, `status`; `Sale` owns items/payments/refunds; `Shipment` references order and courier account; `ShipmentEvent` history. | Order items and payments are implicit through sale; clarify canonical aggregate and lifecycle. `OrderStatus` now includes packed/shipped states and `OrderStatusHistory`; COD verification remains absent. Sale snapshots shipping address, but Customer has no address. No payment gateway/callback state. |
| Returns/exchanges | `Refund.saleId`, `RefundItem.saleItemId`, denormalized `variantId`, quantity/amount; payment rows. | Refund processing locks source sale items and the refund delete endpoint was removed. Exchange records link sale items and old/replacement variants; only equal-value exchanges are allowed. `RefundItem.variantId` remains denormalized without an FK. |
| Profit/reporting | Sale item price/discount/subtotal snapshots, sale totals/refunded amount, variant cost override/product cost, expense records. | No sale-time unit cost snapshot means historical margin changes when costs change. No expense date/accounting classification or report models needed necessarily, but query/report code is absent. Add a cost snapshot and specify treatment of discounts, shipping, refunds, taxes and expenses before reporting profit. |
| CRM | Customer name, unique optional phone, cached totalOrders/totalSpent/totalDue/lastPurchaseAt; relations to sales/orders/coupon usage. | Cached aggregates can drift across cancellation/refund/payment paths. Address is sale-level only. No segmentation/consent/source fields. Add reconciliation strategy and customer profile contact/address design. |
| Campaigns | `Campaign` stores platform, tracking code and dates; `Expense.campaignId` links ad costs; `Sale.campaignId` and UTM fields snapshot attribution. | Monthly report groups spend by expense date, sales by sale date, and refunds by refund date. ROAS is attributed net sales divided by ad spend, not profit. No ad platform import or first/last touch. |
| Analytics/cart/reviews/COD | No relevant dedicated models. | Product events, carts, COD verification and reviews remain missing. |
| Courier | Account unique `(provider,label)`, encrypted credential fields; shipment IDs/status/payload; event timeline; webhook log unique `(provider,eventKey)`. | `Shipment.consignmentId` nullable unique composite allows multiple nulls in PostgreSQL; expected. `WebhookLog` lacks an FK to account by design, permitting retained logs after account deletion, but account deletion behavior should be reviewed. Add provider event timestamp/source ID where available and retention/privacy policy for raw payloads. |
| Expense/messaging/staff | Expense category/schedule/expense; messaging connection/conversation/message with unique provider IDs and expiry; user/employee/salary. | Messaging models have no registered module routes in `src/app/routes/index.ts` (messaging README/schema alone is not implemented API evidence). `Message.expiresAt` comment says cleanup is needed; no cleanup job found. Expense schedule is configuration, not evidence of schedule execution. |

**Integrity/index notes:** many query paths have useful indexes and unique keys (customer phone, SKU, variant combination, order sale, invoice, salary period, coupon usage per sale, provider event key). Missing DB checks include positive sale/refund quantities and nonnegative stock/money constraints. `RefundItem.variantId` is denormalized without FK; `Shipment.provider` duplicates account provider and can disagree absent application checks; cached customer/sale totals are denormalized and need atomic maintenance/reconciliation. Prisma uniqueness does not prevent two concurrent refunds from exceeding a sale item's remaining quantity without locking or conditional writes.

## D. Module & API Mapping

All registered modules are mounted under `/api/v1` by `src/app/routes/index.ts`: `/auth`, `/user`, `/category` (module folder `catagory`), `/product`, `/sales`, `/customer`, `/refund`, `/size`, `/expense`, `/expense-category`, `/coupon`, `/courier-accounts`, `/orders`, plus `/webhooks/courier`. Implementations follow route/controller/service files in corresponding `src/app/modules/<module>/` folders, except the folder spelling `catagory`.

| Area | Routes / implementation evidence | Audit mapping |
|---|---|---|
| Product/variant | `/product`, `/product/color`, `/product/variant`, CRUD in `product.route.ts` and `product.service.ts` | Feature 1, 7; no auth middleware is installed on this router. |
| POS/sales | `/sales/scan`, `/checkout`, `/history`, `/invoice/:invoiceNo`; returns/exchanges use `/refund` | Feature 1, 2, 4, 5, 8, 11; sales router requires authentication, but history has no pagination. |
| Refund/customer | `/refund` CRUD and `/customer` CRUD/phone/payments | Feature 4, 9; refund routes now require authentication; customer payment alone is authenticated while other customer routes remain public. |
| Orders | `/orders` CRUD; authenticated | Feature 8, 13, 14; patch updates status directly. |
| Courier | account/test/customer-history/shipment routes; public provider webhook routes | Feature 14; providers implemented in `providers/pathao.ts`, `providers/steadfast.ts`; webhook logic in `courier-webhook.service.ts`; secrets use `utils/crypto.ts`. |
| Expenses/coupons/campaigns | Expense/campaign CRUD and monthly report; coupon validation | Features 5, 10; campaign expenses feed spend reports and checkout accepts campaign/UTM attribution. |
| Campaign module | `/campaigns` create/list/detail/update/delete | Feature 10; campaign CRUD and attribution backend exists, with no report aggregation or dashboard UI. |
| Auth/users | JWT cookie middleware; `/user` protected by role except profile | Authentication exists, but it is inconsistently applied across business routers. |
| Realtime/presence | Socket.IO in `src/socket/`; stock broadcast and user presence handlers; Redis presence service | Stock/presence events exist. No website synchronization, durable delivery, or Redis-backed stock event fanout is demonstrated. |
| Messaging | Prisma models and `src/app/modules/messaging/README.md`; no messaging route in route registry | Planned/schema-present; not an exposed functioning API based on the router registry. |
| Background jobs | No queue/worker/scheduler found; dependencies include Redis but not a job processor | No recurring expense execution, message expiry cleanup, abandoned-cart reminders, courier retry, or analytics aggregation workers found. |
| Frontend/external website | No frontend project/source in workspace | Landing page, cart UI and browser synchronization cannot be verified. |

`API_ENDPOINTS.md` is useful documentation but itself is not runtime evidence. Some route docs label endpoints unauthenticated; actual route middleware is the evidence used in this report.

## E. Weak Spots & Critical Risks

### CRITICAL

1. **Unauthenticated mutations and reads.** Customer, expense-category, category, and size routers still lack `checkAuth()`. Product write operations and refund operations now require authentication. Apply authentication and role-based authorization at router boundaries, with intentional public read routes separately defined.
2. **Order cancellation only supports unpaid sales.** `order.service.ts:updateOrderById()` restores stock and updates sale/customer cached totals for unpaid cancellations. Orders with collected payments cannot be cancelled until a refund is separately processed.
3. **Exchange settlement is constrained.** `refund.service.ts:createExchange()` supports equal-value exchanges only. Price differences need a settlement ledger before they can be handled safely.

### HIGH

4. **Order status and shipment status are not integrated.** Order transitions now have a graph and status history, but courier callbacks update shipment records only; add a reconciler and callback-to-order policy.
5. **Stock events are not durable.** Checkout, admin stock adjustments, returns, and exchanges now use concurrency safeguards and correct post-commit quantities. Socket events still have no durable outbox, so a process failure can lose an update for disconnected clients.
6. **Authorization is uneven across modules.** Product writes and refund operations now require authentication; customer, expense-category, category, and size routes remain unprotected. Sales/refund operations authenticate users but do not enforce fine-grained role policies. Add role-based access and general administrative audit records.
7. **Profit cannot be historically correct.** `SaleItem` snapshots selling price but not cost. `Product.costPrice` and variant `costPriceOverride` can change later; any report joining current cost to old sales would restate historic margin. No profit-report service exists. Snapshot cost at checkout and define refund/expense/shipping treatment before publishing margin reports.
8. **Provider callback dedupe can acknowledge an unprocessed duplicate.** `WebhookLog` unique key and transaction make event processing atomic in normal paths. But a previously logged event with `processed=false` (possible through operational/manual state) is returned as duplicate solely because the row exists (`courier-webhook.service.ts` P2002 handler). Review retry semantics and make duplicate response conditional on completed processing. Verify real provider signature/header contracts against provider documentation before production use.

### MEDIUM

9. **Unpaginated sales history / reporting query.** `getSalesHistory()` loads all sales with customers, all items and nested variant/product, payments and refunds. Growth causes large responses and DB load; add pagination, date filters, selected fields, and report-specific aggregates.
10. **No general administrative audit log.** Order and shipment status histories now exist, but product, stock, sale, refund, customer and expense changes lack a durable actor/action history.
11. **Stock movement history can be deleted with variants and lacks actor/link.** `ProductVariant.stockMovements` has cascade deletion. Movement rows have no actor, source sale/refund ID, before/after balance or idempotency marker. Preserve ledger records and link them to source events.
12. **Customer cached summaries are vulnerable to drift.** Customer counters and totals are cached on `Customer`; payment/refund/cancellation code must maintain every path consistently. Add reconciliation and centralize updates in transactions; define whether totals are gross or net of refunds/cancelled sales.
13. **External sync and background work are absent.** No retry queue/outbox, dead-letter handling, scheduled execution, or cleanup jobs are present. Socket.IO delivers to connected clients only; disconnected website/client consumers cannot recover changes from an event log.
14. **Potential data retention / payload exposure.** Courier callback payloads and request/response payloads are stored as JSON. Apply retention and redact personal information where feasible; account APIs should continue masking secrets.

## F. Missing Features & Recommended Implementation

For every feature marked PARTIAL, WEAK, or MISSING in the matrix:

| Feature(s) | Database changes | Backend changes | Frontend changes | External integrations | Background processing |
|---|---|---|---|---|---|
| 01 Variants | Add constraints/checks; barcode field only if distinct from QR. | Validate SKU/barcode policy; provide catalog contract. | Variant picker and barcode/QR workflows. | None required. | None. |
| 02 Stock | Add durable outbox/source links, actor and integrity checks. | Make every mutation conditional/transactional; publish after commit through outbox; reconcile stock ledger. | Consume versioned events and refresh on reconnect. | Website sync consumer once defined. | Outbox delivery/retry and reconciliation. |
| 03, 07 Catalog/site sync | Integration account/mapping/sync state and idempotent event records. | Authenticated central catalog/stock API, webhook or pull contract, versioning and conflict policy. | Website catalog client and failure states. | Website platform credentials and contract. | Retry queue, dead-letter and periodic full reconciliation. |
| 04 Returns/exchanges | Return request/item/status and exchange/replacement linkage if workflow requires. | Use sale-item quantity guards; approved return/refund/replacement transactions; immutable reversal path. | Return request and staff processing screens. | Payment payout integration if digital refunds are automated. | Notifications/expiry only if required by policy. |
| 05 Reports | Sale cost snapshot and any required accounting dimensions. | Define gross/net profit; date-filtered report services and dead-stock criteria. | Report filters/export. | Accounting integration only if required. | Pre-aggregation only after query volume warrants it. |
| 06 Landing checkout | Cart/reservation design and source attribution relationship. | Public catalog/cart/checkout APIs, idempotency, rate limits, inventory reservation/expiry and order creation. | Landing page, variant selection, cart and checkout. | Payment provider, if online payment is required. | Expire reservations and retry async order integrations. |
| 08 Orders | Status history/actor; decide canonical status owner; optionally separate order items only if sale aggregate proves inadequate. | Enforce transition graph; cancellation compensations; align sale/shipment/payment transitions. | Fulfillment timeline and valid actions. | Courier status mapping. | Reconciliation for delayed callbacks. |
| 09 CRM | Customer address/contact preferences and attribution/consent as required. | Derived purchase/return history, segmentation/filter endpoints, due and net-LTV definitions. | Customer profile, search and segment tools. | Messaging consent/channel providers if outreach desired. | Segment refresh/reminders only if required. |
| 10 Attribution | Campaign, linked expenses, sale campaign ID and UTM snapshots are present. | Add first/last touch storage and ad platform imports if needed. | Build campaign/spend/report UI and pass campaign/UTM values through web checkout. | Ad platform spend import optional. | Reconcile imported spend if added. |
| 11 Analytics | Event model or analytics store with retention policy. | Instrument views/cart/orders/delivered/returns; define deduplication and conversion denominator. | Emit events from storefront and show reports. | Analytics export optional. | Aggregate events and purge/partition old records. |
| 12 Carts | Cart, cart item and customer/session identity; recovery state. | Persist/update cart, detect abandonment, link recovery to order. | Cart persistence and recovery links. | Email/SMS provider as selected. | Abandonment scanner and rate-limited reminders. |
| 13 COD | Verification attempts/status, actor, timestamps and evidence. | Verify phone/address, block shipment until verified, record rejects and fraud signals. | Verification queue and dispatch gate feedback. | SMS/voice service if verification uses OTP/call. | Expiry and reminder handling. |
| 14 Courier | Mostly present; add any retry/attempt idempotency and delivery reconciliation fields. | Verify provider mappings/signatures; gate dispatch by order/COD policy; implement safe retry/manual reconciliation. | Shipment status, delivery charge and failed-delivery handling. | Validate Pathao/Steadfast account/API/webhook contracts in sandbox. | Retry queue, callback replay and stale shipment reconciliation. |
| 15 Reviews | Review/rating, moderation state, product/customer/order item relation. | Verified delivered purchase validation; moderation and aggregate endpoints; prevent duplicate policy abuse. | Review submission, moderation console, display. | Email/SMS review request provider optional. | Post-delivery request schedule and moderation notifications. |

Before feature work, close security and data integrity gaps in section E. These fixes are necessary because building workflows on public mutation routes and reversible accounting records would increase production risk.

## G. Recommended Development Roadmap

### Phase 1: Critical database and architecture fixes

Remaining Phase 1 work is to protect customer, expense-category, category, and size routes; define role policies and general audit records; add DB stock/quantity constraints; preserve stock ledger history; and define consistent money/cache update rules. Schema updates in this pass require a new migration before use.

### Phase 2: Core inventory and order management

Complete variant/barcode policy, stock adjustment ledger, return/exchange workflow, order transition graph, cancellation compensation and payment lifecycle. Add pagination/date filters to sales and all potentially unbounded list APIs. Add historical cost snapshots so future profit reports can be correct.

### Phase 3: Website synchronization and integrations

Specify the website API contract and ownership/conflict rules first. Implement secure catalog/stock integration, idempotency and outbox/retry/reconciliation. Then add landing-page checkout/cart and payment integration as required. Strengthen courier callback retry behavior and COD dispatch policy; validate live provider behavior in sandbox before production.

### Phase 4: CRM, marketing, and analytics

Add customer address/consent and well-defined LTV/return metrics. Build campaign and monthly ROAS screens around the report API; carry campaign/UTM values through website checkout. Add first/last-touch attribution and instrument product funnel events with deduplication and retention.

### Phase 5: Advanced automation and reporting

Add abandoned-cart recovery, COD verification automation, post-delivery review requests, recurring expense execution and message expiry cleanup via a durable job system. Add dead-stock and gross/net profit reports with documented accounting assumptions, scheduled exports, operational dashboards, and periodic reconciliation.

**Dependencies:** Historical profit depends on cost snapshots and refund semantics (Phases 1–2). Website stock reliability depends on transactional stock changes plus outbox/reconciliation (Phases 1 and 3). Abandoned-cart recovery depends on persistent carts and customer/session identity. Product funnel metrics depend on a storefront instrumenting views and cart events. COD dispatch restrictions depend on verification state plus courier shipment gating. Review requests depend on reliable delivered status and customer contact policy.

## Evidence and limits

Primary evidence is in `prisma/*.prisma`, `src/app/routes/index.ts`, feature route/service files under `src/app/modules/`, `src/app.ts`, `src/socket/`, `src/app/config/`, and `src/app/middleware/`. `API_ENDPOINTS.md`, `REALTIME_STOCK_INSTRUCTIONS.md`, and `SOCKET_INSTRUCTIONS.md` are documentation, not proof of deployed behavior. The adjacent dashboard repository was inspected for campaign Redux hooks and types; no campaign report screen was added. No DB was inspected, so applied migration state and production data integrity are unknown. Server build and TypeScript checks and dashboard typecheck were run after implementation.
