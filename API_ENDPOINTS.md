# API Endpoints and Use Cases

Base URL: `/api/v1`

## General Notes
- Most endpoints return a standard response object with `success`, `message`, `data`, and optional `meta`.
- Authentication is required for protected routes unless noted otherwise.
- User management routes are restricted to `SUPER_ADMIN` users.

---

## 1. Authentication Endpoints

| Method | Endpoint | Auth | Use Case |
|---|---|---|---|
| POST | `/auth/register` | No | Create a new account for a staff member or admin. |
| POST | `/auth/login` | No | Sign in and receive authentication cookies. |
| POST | `/auth/logout` | Yes | Log out the current user and clear session cookies. |
| POST | `/auth/refresh-token` | No | Refresh the access token using the refresh token cookie. |
| POST | `/auth/forgot-password` | No | Start password recovery when a user forgets their password. |
| PATCH | `/auth/reset-password` | No | Set a new password using the reset token. |
| GET | `/auth/profile` or `/auth/me` | Yes | Get the logged-in user’s profile information. |
| PATCH | `/auth/profile` | Yes | Update profile details such as name, phone, or avatar-related fields. |
| PATCH | `/auth/password` | Yes | Change the current password securely. |

---

## 2. Category Endpoints

| Method | Endpoint | Auth | Use Case |
|---|---|---|---|
| POST | `/category` | No | Create a new product category for organizing inventory. |
| GET | `/category` | No | List all categories with pagination/filter support. |
| GET | `/category/:id` | No | Fetch one category by its ID. |
| PATCH | `/category/:id` | No | Update a category name or related details. |
| DELETE | `/category/:id` | No | Remove a category from the system. |

---

## 3. Size Endpoints

| Method | Endpoint | Auth | Use Case |
|---|---|---|---|
| POST | `/size` | No | Create a size option for product variants. |
| GET | `/size` | No | List sizes with pagination and search support. |
| GET | `/size/:id` | No | Fetch one size by its ID. |
| PATCH | `/size/:id` | No | Rename a size option. |
| DELETE | `/size/:id` | No | Delete a size that is not used by any product variant. |

## 4. Product Endpoints

### Product Base Routes

| Method | Endpoint | Auth | Use Case |
|---|---|---|---|
| POST | `/product` | No | Create a new product container with its basic information. |
| GET | `/product` | No | List all products with filtering and pagination. |
| GET | `/product/:id` | No | Get full details of a specific product. |
| PATCH | `/product/:id` | No | Update product information such as name, price, stock, or status. |
| DELETE | `/product/:id` | No | Delete a product from the inventory. |

### Product Color Routes

| Method | Endpoint | Auth | Use Case |
|---|---|---|---|
| POST | `/product/color` | No | Add a color option for a product. |
| PATCH | `/product/color/:id` | No | Update an existing product color. |
| DELETE | `/product/color/:id` | No | Remove a product color option. |

### Product Variant Routes

| Method | Endpoint | Auth | Use Case |
|---|---|---|---|
| POST | `/product/variant` | No | Add a variant such as size, packaging, or SKU variation. |
| PATCH | `/product/variant/:id` | No | Update a product variant. |
| DELETE | `/product/variant/:id` | No | Remove a product variant. |

---

## 5. Sales Endpoints

| Method | Endpoint | Auth | Use Case |
|---|---|---|---|
| POST | `/sales/scan` | No | Scan a product code to look up item details during checkout. |
| POST | `/sales/checkout` | No | Complete a sale transaction. |
| GET | `/sales/history` | No | View paginated, table-ready sales summaries. Supports `page`, `limit`, `searchTerm` (invoice, customer name or phone), `channel`, `status`, `paymentStatus`, `dateFrom`, `dateTo`, `sortBy` and `sortOrder`. Returns customer name/phone, product quantity, date, amounts and payment status. Use `/sales/invoice/:invoiceNo` for full receipt details. |

For split tender checkout, `/sales/checkout` accepts `payments` entries with an actual method, amount, and optional transaction reference. Their amounts must equal the sale total for a full payment; for a sale with a due balance, set `isFullPayment` to `false` and the remaining amount is calculated by the server.

```json
{
  "items": [{ "variantId": "variant-id", "quantity": 1 }],
  "payments": [
    { "method": "CASH", "amount": 100 },
    { "method": "BKASH", "amount": 200, "reference": "TXN-123" }
  ]
}
```

Refunds support the same split-payout format through `POST /refund`. The sum of `payments[].amount` must equal the refund amount calculated from the returned items. Each payout is stored separately, while a refund containing multiple methods is summarized as `MIX`.

Returns must reference the original `saleId` and `saleItemId` through `POST /refund`; the legacy `/sales/return` endpoint that accepted an unrelated variant and quantity has been removed. Refund processing is authenticated. Refund records are immutable through the API.

Exchanges use `POST /refund/exchange` with `saleId`, `items` (`saleItemId`, `replacementVariantId`, `quantity`), and optional `reason`. Exchanges return the original units and deduct replacement stock atomically, with stock movement and exchange history records. The current exchange flow supports equal-value replacements only; price differences are rejected until a settlement ledger is implemented.

Use `GET /refund/sale/:saleId/exchanges` to retrieve exchange history. Order detail responses also include the sale's exchanges.

```json
{
  "saleId": "sale-id",
  "items": [{ "saleItemId": "sale-item-id", "quantity": 1 }],
  "payments": [
    { "method": "CASH", "amount": 100 },
    { "method": "NAGAD", "amount": 200, "reference": "REF-456" }
  ]
}
```

Existing single `paymentMethod` checkout and `method` refund requests remain supported.

---

## 6. Customer Endpoints

| Method | Endpoint | Auth | Use Case |
|---|---|---|---|
| POST | `/customer` | No | Create a customer with a name and optional unique phone number. |
| GET | `/customer` | No | List customers with pagination and name/phone search. |
| GET | `/customer/phone/:phone` | No | Look up a customer and their cached purchase/due summary by phone. |
| GET | `/customer/:id` | No | Fetch a customer profile with sales, items, payments, refunds, and derived gross spend, due, refunded, and net-spend totals. |
| PATCH | `/customer/:id` | No | Update the customer's name or phone number. |
| POST | `/customer/:id/payments` | Yes | Record a payment against one of the customer's sales with an outstanding balance. Requires `saleId`, `amount`, and `method`; optionally accepts `reference` and `notes`. The payment, sale balance/status, and customer due total are updated atomically. |
| DELETE | `/customer/:id` | No | Delete a customer only if they have no sales; customers with sales are retained so their history remains accessible. |

Example due-payment request:

```json
{
  "saleId": "sale-id",
  "amount": 250,
  "method": "CASH",
  "reference": "RECEIPT-123",
  "notes": "Remaining balance"
}
```

---

## 7. User Endpoints

| Method | Endpoint | Auth | Use Case |
|---|---|---|---|
| POST | `/user` | `SUPER_ADMIN` | Create a new user account from the admin panel. |
| GET | `/user` | `SUPER_ADMIN` | List all users in the system. |
| GET | `/user/:id` | `SUPER_ADMIN` | Fetch a specific user’s details. |
| PATCH | `/user/:id` | `SUPER_ADMIN` | Update a user’s role, status, or other profile data. |
| DELETE | `/user/:id` | `SUPER_ADMIN` | Remove a user account from the system. |
| POST | `/user/salary` | `SUPER_ADMIN` | Create one monthly salary record for an employee. `baseSalary` defaults to the employee’s current base salary; net pay is calculated as base salary + bonus − deduction. |
| GET | `/user/salary` | `SUPER_ADMIN` | List salary records (defaults to the current month), with pagination, employee search, filters, and sorting. |
| GET | `/user/salary/:id` | `SUPER_ADMIN` | Fetch one salary record with employee details. |
| PATCH | `/user/salary/:id` | `SUPER_ADMIN` | Update a monthly salary record; net pay is recalculated automatically. |
| DELETE | `/user/salary/:id` | `SUPER_ADMIN` | Delete a monthly salary record. |
| GET | `/user/:userId/salary` | `SUPER_ADMIN` | Fetch an employee’s current salary details and complete salary-record history. |
| POST | `/user/salary/increase` | `SUPER_ADMIN` | Increase an employee’s current base salary by `amount`; existing monthly records remain unchanged. |

Salary-list query parameters: `month` (1–12; defaults to current month), `year` (defaults to current year; when supplied without `month`, includes the whole year), `month=all` (all months of the selected/default year), `userId`, `status` (`PENDING` or `PAID`), `searchTerm` (employee name, email, or phone), `page`, `limit` (maximum 100), `sortBy` (`name`, `baseSalary`, `bonus`, `deduction`, `netPay`, `status`, `month`, `year`, or `createdAt`), and `sortOrder` (`asc` or `desc`). Creating or updating a record rejects a negative net pay. Marking a record `PAID` sets `paidAt`; changing it to `PENDING` clears `paidAt`.

---

## 8. Expense Category Endpoints

| Method | Endpoint | Auth | Use Case |
|---|---|---|---|
| POST | `/expense-category` | No | Create an expense category and optionally configure its recurring schedule. |
| GET | `/expense-category` | No | List expense categories with pagination and search support, including schedules. |
| GET | `/expense-category/:id` | No | Fetch one expense category and its optional schedule. |
| PATCH | `/expense-category/:id` | No | Update an expense category or create, update, or remove its schedule. |
| DELETE | `/expense-category/:id` | No | Delete an expense category that has no expenses or schedule. |

## 9. Expense Endpoints

| Method | Endpoint | Auth | Use Case |
|---|---|---|---|
| POST | `/expense` | Yes | Record an expense, optionally linking it to a recurring schedule and marketing campaign. |
| GET | `/expense` | Yes | List expenses with pagination and search support. |
| GET | `/expense/:id` | Yes | Fetch one expense by its ID, category, schedule, and optional campaign. |
| PATCH | `/expense/:id` | Yes | Update an expense, category, schedule, or campaign link. |
| DELETE | `/expense/:id` | `ADMIN`, `SUPER_ADMIN` | Delete an expense. |

---

## 10. Coupon Endpoints

| Method | Endpoint | Auth | Use Case |
|---|---|---|---|
| POST | `/coupon` | `ADMIN`, `SUPER_ADMIN` | Create a new coupon/promo code with discount rules, usage limits, and validity dates. |
| GET | `/coupon` | Yes | List coupons with pagination, filtering, and search support. |
| POST | `/coupon/validate` | Yes | Validate a coupon code against an order amount, customer, and sales channel, returning the calculated discount. |
| GET | `/coupon/:id` | Yes | Fetch one coupon by ID with redemption and usage counts. |
| PATCH | `/coupon/:id` | `ADMIN`, `SUPER_ADMIN` | Update coupon details, validity, limits, or toggle active status. |
| DELETE | `/coupon/:id` | `ADMIN`, `SUPER_ADMIN` | Delete an unused coupon (coupons used in sales are protected from deletion). |

---

## Quick Summary
- Use the auth routes for account access and session management.
- Use category, size, and product routes to manage the inventory catalog.
- Use expense and expense-category routes for expense management and recurring schedules.
- Use coupon routes to manage discount campaigns and validate promo codes at checkout.
- Use courier-account routes to connect and manage Pathao and Steadfast credentials.
- Use order routes to link customer orders to existing sales and manage fulfillment status.
- Use sales routes for POS and return operations.
- Use user routes for administrative user management.

## 11. Courier Integration Endpoints

All courier-account endpoints require `ADMIN` or `SUPER_ADMIN`.

| Method | Endpoint | Auth | Use Case |
|---|---|---|---|
| POST | `/courier-accounts` | `ADMIN`, `SUPER_ADMIN` | Test and connect a Pathao or Steadfast account. A generated webhook secret is returned once. |
| POST | `/courier-accounts/customer-history` | `ADMIN`, `SUPER_ADMIN` | Look up a Bangladesh phone number across configured active courier accounts. |
| POST | `/courier-accounts/shipments` | `ADMIN`, `SUPER_ADMIN` | Manually create a courier shipment for an order. |
| GET | `/courier-accounts/shipments/:shipmentId` | `ADMIN`, `SUPER_ADMIN` | Fetch a shipment with its status event timeline. |
| GET | `/courier-accounts/:id/webhook-logs` | `ADMIN`, `SUPER_ADMIN` | Inspect the latest 100 callback logs for an account. |
| POST | `/webhooks/courier/:provider/:accountId` | Provider signature | Receive a Pathao or Steadfast shipment status callback. |
| GET | `/courier-accounts` | `ADMIN`, `SUPER_ADMIN` | List accounts with pagination and optional `provider` / `isActive` filters. |
| POST | `/courier-accounts/test` | `ADMIN`, `SUPER_ADMIN` | Test provider credentials without saving them. |
| GET | `/courier-accounts/:id` | `ADMIN`, `SUPER_ADMIN` | Fetch an account with masked credentials and its computed webhook URL. |
| PATCH | `/courier-accounts/:id` | `ADMIN`, `SUPER_ADMIN` | Update account settings or replace and test credentials. |
| POST | `/courier-accounts/:id/regenerate-webhook-secret` | `ADMIN`, `SUPER_ADMIN` | Rotate either provider's webhook secret; the new value is returned once. |
| DELETE | `/courier-accounts/:id` | `ADMIN`, `SUPER_ADMIN` | Permanently delete a courier account. |

Courier shipments are created explicitly; changing an order status does not dispatch a parcel. The shipment request requires `orderId` and `provider` (`PATHAO` or `STEADFAST`). `courierAccountId` is optional and uses the active default account for that provider when omitted. `codAmount` defaults to the sale's `dueAmount` and must be a whole BDT amount.

Pathao also requires `recipientCity`, `recipientZone`, and `itemWeight`; `recipientArea` is optional. `deliveryType` defaults to `48`, and `itemType` defaults to `2`. Recipient name, phone, and address default to the order's customer and sale data, but can be overridden in the dispatch request. Example:

```json
{
  "orderId": "order_id",
  "provider": "PATHAO",
  "courierAccountId": "courier_account_id",
  "recipientCity": 1,
  "recipientZone": 1,
  "recipientArea": 1,
  "itemWeight": 0.5
}
```

Steadfast uses the same order/account fields with `"provider": "STEADFAST"`; `note` is optional. If a courier request times out or returns a server error, the shipment remains `PENDING_DISPATCH` because the provider may have accepted it. Check the provider and shipment before attempting another dispatch; active shipments are blocked from duplicate dispatch.

Provider callback URLs use the computed account `webhookUrl`, shaped as `/api/v1/webhooks/courier/{pathao|steadfast}/:accountId`. These routes are public and authenticate callbacks with the account webhook secret. Set `PUBLIC_API_URL` to the externally reachable HTTPS API base URL (including `/api/v1`); localhost URLs cannot receive courier callbacks. Configure the generated secret in the corresponding courier portal:

- Pathao sends `X-PATHAO-Signature`; the receiver also returns `X-Pathao-Merchant-Webhook-Integration-Secret` for its integration handshake.
- Steadfast sends `Authorization: Bearer <secret>` and `X-Signature` (hex HMAC-SHA256 of the raw request body keyed by that secret). Duplicate `Idempotency-Key` events are acknowledged without reprocessing.
- Verified callbacks are recorded in `WebhookLog`; matched status changes are stored in the `ShipmentEvent` timeline. `GET /courier-accounts/shipments/:shipmentId` and `GET /orders/:id` expose shipment status and events.

## 12. Order Endpoints

All order endpoints require authentication. An order references a customer and an existing sale; product lines, channel, totals, payments, and refunds are read from that sale.

| Method | Endpoint | Auth | Use Case |
|---|---|---|---|
| POST | `/orders` | Yes | Create an order from an existing sale and customer. Requires `customerId` and `saleId`; the sale is linked to the customer if it did not already have one. A sale can belong to only one order. |
| GET | `/orders` | Yes | List orders with pagination, status/customer/sale/channel/campaign filters, and search across customer name/phone and sale invoice number. |
| GET | `/orders/:id` | Yes | Fetch order details with its customer, campaign attribution, sale items, payments, refunds, shipments, and shipment events. |
| PATCH | `/orders/:id` | Yes | Advance through valid order states: Pending → Confirmed → Processing → Packed → Shipped → Completed. Eligible unpaid orders may be cancelled. Each transition is recorded in order status history. |
| DELETE | `/orders/:id` | Yes | Delete an order only when it has no shipment history. |

Order-list query parameters: `page`, `limit` (maximum 100), `status`, `customerId`, `saleId`, `channel`, `campaignId`, `searchTerm`, `sortBy` (`createdAt` or `updatedAt`), and `sortOrder` (`asc` or `desc`). `meta.total` provides the order count for a campaign filter.

Sale channels are `ONLINE`, `OFFLINE`, `SOCIAL`, `FACEBOOK`, `INSTAGRAM`, `TIKTOK`, `WHATSAPP`, `GOOGLE`, `YOUTUBE`, and `OTHER`. Campaign attribution remains on `Sale.campaignId`; because each order references one sale, filter orders with `/orders?campaignId=<id>` to list/count orders attributed to a campaign.

## 13. Marketing Campaigns

Campaign endpoints require authentication. Campaign creation, updates, and deletion are limited to `ADMIN`, `SUPER_ADMIN`, and `MARKETER` roles; campaign listing and detail are available to authenticated users.

| Method | Endpoint | Auth | Use Case |
|---|---|---|---|
| POST | `/campaigns` | `ADMIN`, `SUPER_ADMIN`, `MARKETER` | Create a campaign with a platform, optional tracking code/date range, and ended-state flag. |
| GET | `/campaigns` | Yes | List campaigns with pagination, platform, active-state, ended-state, and search filters. |
| GET | `/campaigns/:id` | Yes | Fetch one campaign by ID. |
| PATCH | `/campaigns/:id` | `ADMIN`, `SUPER_ADMIN`, `MARKETER` | Update campaign details or deactivate it. |
| DELETE | `/campaigns/:id` | `ADMIN`, `SUPER_ADMIN`, `MARKETER` | Delete an unused campaign. Linked sales or expenses must be removed or the campaign must be deactivated instead. |

Campaigns can be linked to expenses and attributed sales. If `campaignId` is omitted at checkout, `utmCampaign` can match an active campaign's `trackingCode`.
`isCampEnd` is a manually controlled boolean that defaults to `false`; set it to `true` when the campaign has ended.
