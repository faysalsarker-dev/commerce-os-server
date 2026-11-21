import { randomBytes } from "crypto";
import {
  CourierAccount,
  Prisma,
} from "../../generated/prisma/client";
import { CourierProvider } from "../../generated/prisma/enums";
import { AppError } from "../../errors/AppError";
import prisma from "../../lib/prisma";
import { createOne, deleteOne, getAll, getById } from "../../services/base.service";
import { config } from "../../config";
import { decrypt, encrypt } from "../../utils/crypto";
import * as PathaoProvider from "./providers/pathao";
import * as SteadfastProvider from "./providers/steadfast";
import {
  type CreateCourierAccountInput,
  type PathaoConfig,
  type PathaoCredentials,
  type TestCourierConnectionInput,
  type UpdateCourierAccountInput,
  type SteadfastCredentials,
} from "./courier-integration.validation";
import type {
  CourierAccountListResult,
  CourierAccountResponse,
  CourierCustomerHistoryAccountResult,
  CourierCustomerHistoryResult,
  CreatedCourierAccountResponse,
} from "./courier-integration.types";

const publicWebhookUrl = (account: CourierAccount): string => {
  const baseUrl = config.courier.publicApiUrl.replace(/\/+$/, "");
  return `${baseUrl}/webhooks/courier/${account.provider.toLowerCase()}/${account.id}`;
};

const getCredentialHint = (account: CourierAccount): string => {
  const credentials = decrypt<unknown>(account.credentials);
  const identifier =
    isRecord(credentials)
      ? account.provider === CourierProvider.PATHAO
        ? typeof credentials.clientId === "string"
          ? credentials.clientId
          : ""
        : typeof credentials.apiKey === "string"
          ? credentials.apiKey
          : ""
      : "";

  return `${identifier.slice(0, 4)}••••`;
};

const toPublicAccount = (
  account: CourierAccount,
): CourierAccountResponse => {
  return {
    id: account.id,
    provider: account.provider,
    label: account.label,
    config: account.config,
    isDefault: account.isDefault,
    isActive: account.isActive,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    maskedHint: getCredentialHint(account),
    hasWebhookSecret: account.webhookSecret !== null,
    webhookUrl: publicWebhookUrl(account),
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isPathaoCredentials = (
  value: unknown,
): value is PathaoCredentials =>
  isRecord(value) &&
  typeof value.clientId === "string" &&
  typeof value.clientSecret === "string" &&
  typeof value.username === "string" &&
  typeof value.password === "string";

const isSteadfastCredentials = (
  value: unknown,
): value is SteadfastCredentials =>
  isRecord(value) &&
  typeof value.apiKey === "string" &&
  typeof value.secretKey === "string";

const assertProviderConnection = async (
  provider: CourierProvider,
  credentials: unknown,
  providerConfig: unknown,
): Promise<void> => {
  if (provider === CourierProvider.PATHAO) {
    if (!isPathaoCredentials(credentials) || !isRecord(providerConfig)) {
      throw new AppError("Invalid Pathao courier credentials or config", 400);
    }
    if (
      typeof providerConfig.storeId !== "number" ||
      typeof providerConfig.sandbox !== "boolean"
    ) {
      throw new AppError("Invalid Pathao courier config", 400);
    }
    const config: PathaoConfig = {
      storeId: providerConfig.storeId,
      sandbox: providerConfig.sandbox,
    };
    await PathaoProvider.testConnection(credentials, config);
    return;
  }

  if (!isSteadfastCredentials(credentials)) {
    throw new AppError("Invalid Steadfast courier credentials", 400);
  }
  await SteadfastProvider.testConnection(credentials);
};

export const getCourierAccounts = async (
  query: Record<string, unknown>,
): Promise<CourierAccountListResult> => {
  const safeQuery: Record<string, unknown> = {
    page: query.page,
    limit: query.limit,
    sortBy: "createdAt",
    sortOrder: "desc",
  };
  if (query.provider) safeQuery.provider = query.provider;
  if (query.isActive !== undefined) safeQuery.isActive = query.isActive;


  const result = await getAll<CourierAccount>(
    prisma.courierAccount,
    safeQuery,
    ["label"],
  );

  return {
    data: result.data.map(toPublicAccount),
    meta: {
      page: result.meta.page,
      limit: result.meta.limit,
      total: result.meta.total,
    },
  };
};

export const getCourierAccountById = async (
  id: string,
): Promise<CourierAccountResponse> => {
  const account = await getById<CourierAccount>(prisma.courierAccount, id);
  return toPublicAccount(account);
};

export const testCourierConnection = async (
  payload: TestCourierConnectionInput,
): Promise<{ provider: CourierProvider; connected: true }> => {
  await assertProviderConnection(
    payload.provider,
    payload.credentials,
    payload.config,
  );

  return { provider: payload.provider, connected: true };
};

const getAccountCustomerHistory = async (
  account: CourierAccount,
  phone: string,
): Promise<CourierCustomerHistoryAccountResult> => {
  const accountDetails = {
    accountId: account.id,
    provider: account.provider,
    label: account.label,
  };

  if (!account.isActive) {
    return {
      ...accountDetails,
      status: "inactive",
      message: "Courier account is inactive.",
    };
  }

  try {
    const credentials = decrypt<unknown>(account.credentials);
    let data: unknown;

    if (account.provider === CourierProvider.PATHAO) {
      if (!isPathaoCredentials(credentials)) {
        throw new AppError("Stored Pathao credentials are invalid.", 500);
      }
      if (!isRecord(account.config) || typeof account.config.sandbox !== "boolean") {
        throw new AppError("Stored Pathao configuration is invalid.", 500);
      }
      data = await PathaoProvider.getCustomerHistory(
        credentials,
        account.config.sandbox,
        phone,
      );
    } else {
      if (!isSteadfastCredentials(credentials)) {
        throw new AppError("Stored Steadfast credentials are invalid.", 500);
      }
      data = await SteadfastProvider.getCustomerHistory(credentials, phone);
    }

    return { ...accountDetails, status: "success", data };
  } catch (error) {
    return {
      ...accountDetails,
      status: "failed",
      message:
        error instanceof AppError
          ? error.message
          : "Courier customer-history lookup failed.",
    };
  }
};

export const getCourierCustomerHistory = async (
  phone: string,
): Promise<CourierCustomerHistoryResult> => {
  const accounts = await prisma.courierAccount.findMany({
    orderBy: { createdAt: "asc" },
  });
  const results = await Promise.all(
    accounts.map((account) => getAccountCustomerHistory(account, phone)),
  );

  return { phone, accounts: results };
};

export const createCourierAccount = async (
  payload: CreateCourierAccountInput,
): Promise<CreatedCourierAccountResponse> => {
  await assertProviderConnection(
    payload.provider,
    payload.credentials,
    payload.config,
  );

  const suppliedWebhookSecret =
    payload.provider === CourierProvider.STEADFAST
      ? payload.webhookSecret
      : undefined;
  const generatedWebhookSecret = suppliedWebhookSecret === undefined;
  const plainWebhookSecret =
    suppliedWebhookSecret ?? randomBytes(32).toString("hex");
  const configData: Prisma.InputJsonValue =
    payload.provider === CourierProvider.PATHAO
      ? { storeId: payload.config.storeId, sandbox: payload.config.sandbox }
      : {};

  const account = await prisma.$transaction(async (transaction) => {
    if (payload.isDefault) {
      await transaction.courierAccount.updateMany({
        where: { provider: payload.provider, isDefault: true },
        data: { isDefault: false },
      });
    }

    return createOne<CourierAccount>(
      transaction.courierAccount,
      {
        provider: payload.provider,
        label: payload.label,
        credentials: encrypt(payload.credentials),
        config: configData as Prisma.JsonValue,
        webhookSecret: plainWebhookSecret
          ? encrypt({ secret: plainWebhookSecret })
          : null,
        isDefault: payload.isDefault ?? false,
      },
    );
  });

  return {
    ...toPublicAccount(account),
    ...(generatedWebhookSecret
      ? { oneTimeWebhookSecret: plainWebhookSecret }
      : {}),
  };
};

export const updateCourierAccountById = async (
  id: string,
  payload: UpdateCourierAccountInput,
): Promise<CourierAccountResponse> => {
  const current = await prisma.courierAccount.findUnique({ where: { id } });

  if (!current) {
    throw new AppError("Courier account not found", 404);
  }

  if (
    payload.webhookSecret !== undefined &&
    current.provider === CourierProvider.PATHAO
  ) {
    throw new AppError(
      "Use the regenerate webhook secret endpoint for Pathao accounts.",
      400,
    );
  }

  const shouldTestConnection =
    payload.credentials !== undefined || payload.config !== undefined;
  let encryptedCredentials: string | undefined;
  let configData: Prisma.InputJsonValue | undefined;

  if (shouldTestConnection) {
    const credentials =
      payload.credentials ?? decrypt<unknown>(current.credentials);
    const providerCredentials =
      current.provider === CourierProvider.PATHAO
        ? isPathaoCredentials(credentials)
          ? credentials
          : undefined
        : isSteadfastCredentials(credentials)
          ? credentials
          : undefined;

    if (!providerCredentials) {
      throw new AppError(
        `Invalid ${current.provider === CourierProvider.PATHAO ? "Pathao" : "Steadfast"} courier credentials`,
        400,
      );
    }
    const providerConfig =
      payload.config !== undefined
        ? payload.config
        : current.config;

    await assertProviderConnection(
      current.provider,
      providerCredentials,
      providerConfig,
    );

    if (payload.credentials !== undefined) {
      encryptedCredentials = encrypt(providerCredentials);
    }
    if (payload.config !== undefined) {
      configData =
        current.provider === CourierProvider.PATHAO &&
        isRecord(payload.config) &&
        typeof payload.config.storeId === "number" &&
        typeof payload.config.sandbox === "boolean"
          ? {
              storeId: payload.config.storeId,
              sandbox: payload.config.sandbox,
            }
          : {};
    }
  }

  const encryptedWebhookSecret =
    payload.webhookSecret === null
      ? null
      : payload.webhookSecret !== undefined
        ? encrypt({ secret: payload.webhookSecret })
        : undefined;

  const account = await prisma.$transaction(async (transaction) => {
    if (payload.isDefault === true) {
      await transaction.courierAccount.updateMany({
        where: {
          provider: current.provider,
          id: { not: current.id },
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    return transaction.courierAccount.update({
      where: { id },
      data: {
        ...(payload.label !== undefined && { label: payload.label }),
        ...(encryptedCredentials !== undefined && {
          credentials: encryptedCredentials,
        }),
        ...(configData !== undefined && { config: configData }),
        ...(encryptedWebhookSecret !== undefined && {
          webhookSecret: encryptedWebhookSecret,
        }),
        ...(payload.isActive !== undefined && { isActive: payload.isActive }),
        ...(payload.isDefault !== undefined && { isDefault: payload.isDefault }),
      },
    });
  });

  return toPublicAccount(account);
};

export const deleteCourierAccountById = async (
  id: string,
): Promise<CourierAccountResponse> => {
  const account = await deleteOne<CourierAccount>(prisma.courierAccount, id);
  return toPublicAccount(account);
};

export const regenerateCourierWebhookSecret = async (
  id: string,
): Promise<CreatedCourierAccountResponse> => {
  const current = await prisma.courierAccount.findUnique({ where: { id } });
  if (!current) {
    throw new AppError("Courier account not found", 404);
  }

  const plainWebhookSecret = randomBytes(32).toString("hex");
  const account = await prisma.courierAccount.update({
    where: { id },
    data: { webhookSecret: encrypt({ secret: plainWebhookSecret }) },
  });

  return {
    ...toPublicAccount(account),
    oneTimeWebhookSecret: plainWebhookSecret,
  };
};
