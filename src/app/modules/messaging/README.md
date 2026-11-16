# Messaging Module

CommerceOS messaging is intended to provide a unified inbox for conversations from
Messenger, Instagram, WhatsApp, and TikTok. These are optional channels: a user
may connect only the platforms and accounts they need.

> **Implementation status:** This directory currently contains request-validation
> schemas and the Prisma data model. Provider OAuth, webhook handling, sending
> messages, API routes/controllers/services, realtime events, and automated message
> cleanup have not been implemented. Do not treat this document or the schemas as
> a claim that those integrations are operational.

## Intended message flow

1. An authorized store staff member chooses a platform and starts that provider's
   official authorization flow.
2. The provider redirects to CommerceOS with an authorization result. The server
   validates it, exchanges it for tokens, obtains the provider account identity,
   encrypts the tokens, and saves a `MessagingConnection`.
3. The provider sends incoming-message webhooks to CommerceOS. The server must
   verify each webhook according to the provider's rules, deduplicate retries,
   and persist the conversation and recent message.
4. The client loads the unified conversation list and messages from CommerceOS.
   Socket.IO can notify the client of new messages and status changes; PostgreSQL
   remains the durable source of recent message history.
5. A reply is sent via the connector for that conversation's platform. CommerceOS
   records the outgoing message and updates delivery status from provider
   responses or webhooks.
6. A scheduled cleanup process deletes expired message rows and any locally stored
   media. The provider's copy is not deleted by this local cleanup.

Each platform requires its own connector because authorization, permissions,
account types, webhook formats, send APIs, and message-history availability vary.
Use official APIs and comply with the applicable platform policies. Verify current
API access and approval requirements—especially for TikTok direct messaging—
before advertising a platform as available.

## Current data model

The schema is in [`prisma/messaging.prisma`](../../../../prisma/messaging.prisma);
the enums are in [`prisma/enum.prisma`](../../../../prisma/enum.prisma).

### `MessagingConnection`

Represents one provider account connected to this single-store CommerceOS
installation. It is not owned by an individual staff account; staff access to
messaging should be controlled by application authorization.

- `platform`: `MESSENGER`, `INSTAGRAM`, `WHATSAPP`, or `TIKTOK`.
- `providerAccountId`, `accountName`: provider account identity and display label.
- `status`: `ACTIVE`, `EXPIRED`, `DISCONNECTED`, or `ERROR`.
- `accessTokenCiphertext`, `refreshTokenCiphertext`: fields intended for encrypted
  credentials. The application must encrypt/decrypt tokens before this model is
  used; the fields do not provide encryption by themselves.
- `tokenExpiresAt`, `grantedScopes`: token lifetime and permissions granted.
- Unique constraint: one connection per `(platform, providerAccountId)`. A store
  can connect multiple accounts on the same platform if each has a different
  provider account ID.

### `MessagingConversation`

Represents one conversation under a connected account. The provider conversation
ID is unique within its connection. Participant details and last activity support
the inbox list.

### `Message`

Represents an inbound or outbound message.

- `providerMessageId` is unique within its conversation, helping prevent duplicate
  records when webhook deliveries are retried.
- `direction` is `INBOUND` or `OUTBOUND`.
- `deliveryStatus` is `RECEIVED`, `QUEUED`, `SENT`, `DELIVERED`, `READ`, or
  `FAILED`.
- `text` stores text content. `media` is JSON metadata; it is not intended for
  storing large binary files in PostgreSQL.
- `sentAt` is the provider message time. `expiresAt` is intended to identify when
  the local message should be deleted.

The schema does **not** automatically enforce the 7-day retention period. The
message-ingestion code must set `expiresAt` (normally to `sentAt` plus the
configured retention duration), and a scheduled cleanup job must delete expired
messages. Until that job exists and is deployed, old messages will remain in the
database. Do not claim that 7-day deletion is active yet.

## Configuration

Messaging settings are optional and are read by
[`src/app/config/index.ts`](../../config/index.ts). Add deployment secrets
to the runtime environment (or local values to an untracked `.env` file); never
commit real credentials.

| Variable | Purpose | Current behavior |
|---|---|---|
| `MESSAGING_TOKEN_ENCRYPTION_KEY` | Key intended for encrypting customer-granted tokens | Defaults to empty; encryption is not implemented yet |
| `MESSAGING_RETENTION_DAYS` | Local message retention period in days | Defaults to `7`; must be a positive integer |
| `META_APP_ID` | Meta application identifier for supported Meta products | Optional |
| `META_APP_SECRET` | Meta application secret | Optional |
| `META_WEBHOOK_VERIFY_TOKEN` | Secret used by a future webhook verification flow | Optional |
| `TIKTOK_CLIENT_KEY` | TikTok application client key | Optional |
| `TIKTOK_CLIENT_SECRET` | TikTok application client secret | Optional |

The Meta application may be used for Meta products, but permissions and setup can
differ between Messenger, Instagram, and WhatsApp. Set only credentials for
platforms actually configured in the provider developer consoles.

The token-encryption key should be generated and managed as a secret, not stored
in the database or source control. Before enabling token storage, implement
authenticated encryption, key rotation, safe failure behavior when the key is
missing/invalid, and tests. Never log access tokens, refresh tokens, authorization
codes, or webhook secrets. Hashing is not suitable for provider tokens because
the server must recover the original token to call the provider.

See the root [`.env.example`](../../../../.env.example) for placeholders. It is
not a source of production credentials.

## Request validation schemas

[`messaging.validation.ts`](./messaging.validation.ts) currently exports:

- `messagingPlatformSchema`: the four supported platform identifiers.
- `connectMessagingPlatformSchema`: accepts a platform selection only. It
  intentionally does not accept a provider token; credentials should be obtained
  through the provider authorization flow.
- `sendMessageSchema`: accepts a non-empty trimmed `text` value up to 10,000
  characters and rejects unknown fields.
- `listMessagesQuerySchema`: accepts an optional cursor and a limit from 1 to 100
  (default 50).

Example payloads for use when routes are implemented:

```json
{ "platform": "INSTAGRAM" }
```

```json
{ "text": "Thanks for reaching out. How can we help?" }
```

These are validation contracts only. No messaging HTTP endpoints are registered
yet, and no controller currently uses these schemas.

## Storage and retention guidance

- PostgreSQL should be the durable store for connections, conversations, and
  recent messages. Redis may support transient coordination, caching, or realtime
  delivery, but should not be the only copy of messages.
- Keep media binaries out of message rows. Store provider URLs or object-storage
  references and required metadata; account for provider URL expiry and deletion
  requirements.
- Use indexes and cursor-based pagination for conversation/message retrieval.
- Set expiration from the individual message time, not the conversation's latest
  activity. A new message must not extend the retention of older messages.
- Run cleanup repeatedly and safely, in batches if the dataset grows. Ensure
  backups and media storage follow a compatible retention policy.
- Local deletion does not delete the provider's copy. Provider history may not be
  available for refetch after local deletion, so do not promise users that older
  conversations can always be restored.
- Define and document how disconnecting an account affects stored conversations
  and messages, and honor provider deletion events and applicable privacy rules.

## Database setup

After reviewing the schema and configuring a development database, generate the
Prisma client and create a migration using the repository's normal workflow:

```bash
npx prisma validate
npx prisma generate
npm run db:migrate
```

Do not run a migration against a shared or production database without approval.
Production deployments should use the project's reviewed migration/deployment
process. The Prisma model definitions alone do not create database tables.

## Work still required

Before this can be used as a real unified inbox, implement and test:

1. OAuth/account authorization and connection/disconnection lifecycle per provider.
2. Secure token encryption/decryption, refresh, revocation, and key rotation.
3. Provider-specific permission and capability checks.
4. Verified webhooks, idempotency, retries, and message normalization.
5. Provider-specific send/reply adapters and delivery status handling.
6. Authenticated, owner-scoped routes/controllers/services for connections,
   conversations, messages, and replies.
7. Automated message/media expiration and deletion, including observability for
   cleanup failures.
8. Realtime notifications and appropriate pagination/rate limits.
9. A business/workspace ownership model only if this installation later expands
   to serve multiple stores.
10. Provider-specific integration tests and a clear process for API review and
    approval.
