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

## 3. Product Endpoints

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

## 4. Sales Endpoints

| Method | Endpoint | Auth | Use Case |
|---|---|---|---|
| POST | `/sales/scan` | No | Scan a product code to look up item details during checkout. |
| POST | `/sales/checkout` | No | Complete a sale transaction. |
| POST | `/sales/return` | No | Process a product return and update stock/sales records. |
| GET | `/sales/history` | No | View the sales history for reporting or reconciliation. |

---

## 5. User Endpoints

| Method | Endpoint | Auth | Use Case |
|---|---|---|---|
| POST | `/user` | `SUPER_ADMIN` | Create a new user account from the admin panel. |
| GET | `/user` | `SUPER_ADMIN` | List all users in the system. |
| GET | `/user/:id` | `SUPER_ADMIN` | Fetch a specific user’s details. |
| PATCH | `/user/:id` | `SUPER_ADMIN` | Update a user’s role, status, or other profile data. |
| DELETE | `/user/:id` | `SUPER_ADMIN` | Remove a user account from the system. |

---

## Quick Summary
- Use the auth routes for account access and session management.
- Use category and product routes to manage the inventory catalog.
- Use sales routes for POS and return operations.
- Use user routes for administrative user management.
