import type { CourierAccount } from "../../generated/prisma/client";

export type CourierAccountResponse = Omit<
  CourierAccount,
  "credentials" | "webhookSecret" | "shopId"
> & {
  maskedHint: string;
  hasWebhookSecret: boolean;
  webhookUrl: string;
};

export type CreatedCourierAccountResponse = CourierAccountResponse & {
  oneTimeWebhookSecret?: string;
};

export interface CourierAccountListResult {
  data: CourierAccountResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface CourierCustomerHistoryAccountResult {
  accountId: string;
  provider: CourierAccount["provider"];
  label: string;
  status: "success" | "inactive" | "failed";
  data?: unknown;
  message?: string;
}

export interface CourierCustomerHistoryResult {
  phone: string;
  accounts: CourierCustomerHistoryAccountResult[];
}
