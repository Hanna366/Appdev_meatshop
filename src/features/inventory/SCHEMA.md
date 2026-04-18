Inventory Firestore schema (brief)

Collections

- `inventoryBatches` (documents represent received batches)
  - `tenantId` (string) — tenant namespace
  - `productId` (string)
  - `quantity` (number) — original received quantity
  - `remainingQuantity` (number) — current on-hand for this batch
  - `cost` (number | null)
  - `supplierId` (string | null)
  - `receivedAt` (timestamp)
  - `expiryDate` (timestamp | null)
  - `createdBy` (string | null)
  - `createdAt` (timestamp)
  - `notes` (string | null)

- `inventoryTransactions` (immutable audit trail)
  - `tenantId` (string)
  - `productId` (string)
  - `type` (string) — e.g., `stock_in`, `stock_out`, `waste`, `adjustment`
  - `quantity` (number) — positive for inflows, negative for outflows
  - `batchId` (string | null) — links to batch when applicable
  - `relatedId` (string | null) — optional business reference (sale/po)
  - `reason` (string | null)
  - `meta` (map) — arbitrary metadata
  - `createdBy` (string | null)
  - `createdAt` (timestamp)

Notes and recommendations

- Multi-tenant: every document MUST include `tenantId`. Enforce in security rules and application code.
- Transactional updates: use Firestore `runTransaction` when updating `remainingQuantity` and writing a transaction doc to ensure atomicity.
- Indexes: add composite indexes for queries used by the app, e.g. (`tenantId`,`productId`,`remainingQuantity`), and (`tenantId`,`createdAt`) for transactions.
- Batch-specific operations: `createWasteLog` supports `batchId` to deplete a specific batch; otherwise FIFO (order by `receivedAt`) is used.
- Security rules: restrict reads/writes to documents where `request.auth.token.tenantId == resource.data.tenantId` (or via custom claims / role checks) and validate fields on writes (types, non-negative remainingQuantity on create, etc.).
- Backups & monitoring: export `inventoryTransactions` regularly for audit retention; monitor `remainingQuantity` anomalies.

TS types are implemented in `src/features/inventory/types/inventoryTypes.ts`.
