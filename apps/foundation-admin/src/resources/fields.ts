/**
 * Per-resource field allowlists. Only fields listed here are rendered; anything
 * else the API returns (including any secret it should not have sent) is
 * ignored. GenericShow/GenericList additionally drop keys that look sensitive.
 */

export type FieldKind =
  | "text"
  | "id"
  | "number"
  | "amount"
  | "boolean"
  | "date"
  | "status"
  | "email"
  | "phone"
  | "url"
  | "relation";

export interface FieldDef {
  key: string;
  label: string;
  kind?: FieldKind;
  /** List views only: whether the column header toggles server-side sorting. */
  sortable?: boolean;
}

const timestamps: FieldDef[] = [
  { key: "createdAt", label: "Created", kind: "date" },
  { key: "updatedAt", label: "Updated", kind: "date" },
];

export const USER_SHOW_FIELDS: FieldDef[] = [
  { key: "id", label: "ID", kind: "id" },
  { key: "email", label: "Email", kind: "email" },
  { key: "phoneNumber", label: "Phone number", kind: "phone" },
  { key: "isVerified", label: "Verified", kind: "boolean" },
  { key: "country", label: "Country" },
  { key: "currency", label: "Currency" },
  { key: "language", label: "Language" },
  ...timestamps,
];

export const USER_LIST_COLUMNS: FieldDef[] = [
  { key: "id", label: "ID", kind: "id" },
  { key: "email", label: "Email", kind: "email", sortable: true },
  { key: "phoneNumber", label: "Phone", kind: "phone" },
  { key: "isVerified", label: "Verified", kind: "boolean", sortable: true },
  { key: "country", label: "Country", sortable: true },
  { key: "currency", label: "Currency", sortable: true },
  { key: "createdAt", label: "Created", kind: "date", sortable: true },
];

export const WALLET_SHOW_FIELDS: FieldDef[] = [
  { key: "id", label: "ID", kind: "id" },
  { key: "publicKey", label: "Public key", kind: "id" },
  { key: "userId", label: "User ID", kind: "id" },
  { key: "user", label: "User", kind: "relation" },
  { key: "isPinSet", label: "PIN set", kind: "boolean" },
  { key: "incorrectPinAttempts", label: "Incorrect PIN attempts", kind: "number" },
  { key: "isLocked", label: "Locked", kind: "boolean" },
  { key: "dailyTransactionLimit", label: "Daily transaction limit", kind: "amount" },
  { key: "dailyTransactionCount", label: "Transactions today", kind: "number" },
  { key: "dailyTransactionTotal", label: "Volume today", kind: "amount" },
  { key: "lastTransactionReset", label: "Daily counters reset", kind: "date" },
  { key: "requiresConfirmation", label: "Requires confirmation", kind: "boolean" },
  ...timestamps,
];

export const WALLET_LIST_COLUMNS: FieldDef[] = [
  { key: "id", label: "ID", kind: "id" },
  { key: "publicKey", label: "Public key", kind: "id" },
  { key: "userId", label: "User ID", kind: "id" },
  { key: "isPinSet", label: "PIN set", kind: "boolean" },
  { key: "isLocked", label: "Locked", kind: "boolean", sortable: true },
  { key: "dailyTransactionLimit", label: "Daily limit", kind: "amount", sortable: true },
  { key: "createdAt", label: "Created", kind: "date", sortable: true },
];

export const TRANSACTION_SHOW_FIELDS: FieldDef[] = [
  { key: "id", label: "ID", kind: "id" },
  { key: "status", label: "Status", kind: "status" },
  { key: "amount", label: "Amount", kind: "amount" },
  { key: "transactionHash", label: "Transaction signature", kind: "id" },
  { key: "isConfirmed", label: "Confirmed", kind: "boolean" },
  { key: "confirmationExpiresAt", label: "Confirmation expires", kind: "date" },
  { key: "senderWalletId", label: "Sender wallet ID", kind: "id" },
  { key: "senderWallet", label: "Sender wallet", kind: "relation" },
  { key: "recipientWalletId", label: "Recipient wallet ID", kind: "id" },
  { key: "recipientWallet", label: "Recipient wallet", kind: "relation" },
  ...timestamps,
];

export const TRANSACTION_LIST_COLUMNS: FieldDef[] = [
  { key: "id", label: "ID", kind: "id" },
  { key: "amount", label: "Amount", kind: "amount", sortable: true },
  { key: "status", label: "Status", kind: "status", sortable: true },
  { key: "transactionHash", label: "Signature", kind: "id" },
  { key: "isConfirmed", label: "Confirmed", kind: "boolean" },
  { key: "createdAt", label: "Created", kind: "date", sortable: true },
];

export const LAUNCHPAD_PROJECT_SHOW_FIELDS: FieldDef[] = [
  { key: "id", label: "ID", kind: "id" },
  { key: "name", label: "Name" },
  { key: "ticker", label: "Ticker" },
  { key: "status", label: "Status", kind: "status" },
  { key: "description", label: "Description" },
  { key: "tokenAddress", label: "Token address", kind: "id" },
  { key: "dexPairAddress", label: "DEX pair address", kind: "id" },
  { key: "creatorId", label: "Creator ID", kind: "id" },
  { key: "creator", label: "Creator", kind: "relation" },
  { key: "isFeatured", label: "Featured", kind: "boolean" },
  { key: "profileScore", label: "Profile score", kind: "number" },
  { key: "currentPrice", label: "Current price", kind: "amount" },
  { key: "marketCap", label: "Market cap", kind: "amount" },
  { key: "liquidity", label: "Liquidity", kind: "amount" },
  { key: "volume24h", label: "Volume (24h)", kind: "amount" },
  { key: "priceChange5m", label: "Price change (5m)", kind: "number" },
  { key: "priceChange1h", label: "Price change (1h)", kind: "number" },
  { key: "priceChange6h", label: "Price change (6h)", kind: "number" },
  { key: "priceChange24h", label: "Price change (24h)", kind: "number" },
  { key: "totalSupply", label: "Total supply", kind: "amount" },
  { key: "circulatingSupply", label: "Circulating supply", kind: "amount" },
  { key: "bondingProgress", label: "Bonding progress", kind: "number" },
  { key: "holderCount", label: "Holders", kind: "number" },
  { key: "imageUrl", label: "Image URL", kind: "url" },
  { key: "videoUrl", label: "Video URL", kind: "url" },
  { key: "websiteUrl", label: "Website", kind: "url" },
  { key: "twitterUrl", label: "Twitter", kind: "url" },
  { key: "telegramUrl", label: "Telegram", kind: "url" },
  { key: "discordUrl", label: "Discord", kind: "url" },
  { key: "migratedAt", label: "Migrated", kind: "date" },
  { key: "marketDataUpdatedAt", label: "Market data updated", kind: "date" },
  ...timestamps,
];

export const LAUNCHPAD_PROJECT_LIST_COLUMNS: FieldDef[] = [
  { key: "id", label: "ID", kind: "id" },
  { key: "name", label: "Name", sortable: true },
  { key: "ticker", label: "Ticker", sortable: true },
  { key: "status", label: "Status", kind: "status", sortable: true },
  { key: "bondingProgress", label: "Bonding progress", kind: "number", sortable: true },
  { key: "holderCount", label: "Holders", kind: "number", sortable: true },
  { key: "marketCap", label: "Market cap", kind: "amount", sortable: true },
  { key: "isFeatured", label: "Featured", kind: "boolean", sortable: true },
  { key: "createdAt", label: "Created", kind: "date", sortable: true },
];

export type EditFieldType = "text" | "textarea" | "number" | "checkbox" | "url";

export interface EditField {
  key: string;
  label: string;
  type: EditFieldType;
  /** Shown but never sent to the API. */
  readOnly?: boolean;
  /** Explanation shown under a read-only field. */
  readOnlyReason?: string;
  /** Empty input is saved as null. Otherwise an empty value is a validation error. */
  nullable?: boolean;
  /** Number fields only. */
  min?: number;
  max?: number;
  integer?: boolean;
  /** Text fields only. */
  maxLength?: number;
}

export const USER_EDIT_FIELDS: EditField[] = [
  {
    key: "email",
    label: "Email",
    type: "text",
    readOnly: true,
    readOnlyReason: "Login and recovery contact details cannot be changed from the admin console.",
  },
  {
    key: "phoneNumber",
    label: "Phone number",
    type: "text",
    readOnly: true,
    readOnlyReason: "Login and recovery contact details cannot be changed from the admin console.",
  },
  { key: "country", label: "Country", type: "text", nullable: true, maxLength: 64 },
  { key: "currency", label: "Currency", type: "text", nullable: true, maxLength: 16 },
  { key: "language", label: "Language", type: "text", maxLength: 16 },
];

const SOCIAL_URL_MAX = 2048;

export const LAUNCHPAD_PROJECT_EDIT_FIELDS: EditField[] = [
  {
    key: "name",
    label: "Name",
    type: "text",
    readOnly: true,
    readOnlyReason: "Token name is fixed once the project is created.",
  },
  {
    key: "ticker",
    label: "Ticker",
    type: "text",
    readOnly: true,
    readOnlyReason: "Ticker is fixed once the project is created.",
  },
  { key: "description", label: "Description", type: "textarea", nullable: true, maxLength: 5000 },
  { key: "isFeatured", label: "Featured project (show in Featured section)", type: "checkbox" },
  { key: "imageUrl", label: "Image URL", type: "url", nullable: true, maxLength: SOCIAL_URL_MAX },
  { key: "videoUrl", label: "Video URL", type: "url", nullable: true, maxLength: SOCIAL_URL_MAX },
  { key: "twitterUrl", label: "Twitter URL", type: "url", nullable: true, maxLength: SOCIAL_URL_MAX },
  { key: "telegramUrl", label: "Telegram URL", type: "url", nullable: true, maxLength: SOCIAL_URL_MAX },
  { key: "websiteUrl", label: "Website URL", type: "url", nullable: true, maxLength: SOCIAL_URL_MAX },
  { key: "discordUrl", label: "Discord URL", type: "url", nullable: true, maxLength: SOCIAL_URL_MAX },
  { key: "profileScore", label: "Profile score (0-100)", type: "number", min: 0, max: 100 },
];
