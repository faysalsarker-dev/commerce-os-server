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
  courierAccountListQuerySchema,
  createCourierAccountSchema,
  pathaoConfigSchema,
  pathaoCredentialsSchema,
  steadfastConfigSchema,
  steadfastCredentialsSchema,
  testCourierConnectionSchema,
  updateCourierAccountSchema,
  type CreateCourierAccountInput,
  type TestCourierConnectionInput,
  type UpdateCourierAccountInput,
} from "./courier-integration.validation";
import type {
  CourierAccountListResult,
  CourierAccountResponse,
  CreatedCourierAccountResponse,
} from "./courier-integration.types";

const publicWebhookUrl = (account: CourierAccount): string => {
  const baseUrl = config.courier.publicApiUrl.replace(/\/+$/, "");
  return `${baseUrl}/webhooks/courier/${account.provider.toLowerCase()}/${account.id}`;
};

const getCredentialHint = (account: CourierAccount): string => {
  const identifier =
    account.provider === CourierProvider.PATHAO
      ? pathaoCredentialsSchema.parse(
          decrypt<unknown>(account.credentials),
        ).clientId
      : steadfastCredentialsSchema.parse(
          decrypt<unknown>(account.credentials),
        ).apiKey;

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

const parseProviderCredentials = (
  provider: CourierProvider,
  value: unknown,
): CreateCourierAccountInput["credentials"] | TestCourierConnectionInput["credentials"] => {
  return provider === CourierProvider.PATHAO
    ? pathaoCredentialsSchema.parse(value)
    : steadfastCredentialsSchema.parse(value);
};

const parseProviderConfig = (
  provider: CourierProvider,
  value: unknown,
): Prisma.InputJsonValue => {
  if (provider === CourierProvider.PATHAO) {
    const parsed = pathaoConfigSchema.parse(value);
    return { storeId: parsed.storeId, sandbox: parsed.sandbox };
  }

  steadfastConfigSchema.parse(value ?? {});
  return {};
};

const assertProviderConnection = async (
  provider: CourierProvider,
  credentials: unknown,
  providerConfig: unknown,
): Promise<void> => {
  if (provider === CourierProvider.PATHAO) {
    const parsedCredentials = pathaoCredentialsSchema.parse(credentials);
    const parsedConfig = pathaoConfigSchema.parse(providerConfig);
    await PathaoProvider.testConnection(parsedCredentials, parsedConfig);
    return;
  }

  const parsedCredentials = steadfastCredentialsSchema.parse(credentials);
  steadfastConfigSchema.parse(providerConfig ?? {});
  await SteadfastProvider.testConnection(parsedCredentials);
};

export const getCourierAccounts = async (
  rawQuery: unknown,
): Promise<CourierAccountListResult> => {
  const query = courierAccountListQuerySchema.parse(rawQuery);
  const safeQuery: Record<string, unknown> = {
    page: query.page,
    limit: query.limit,
    sortBy: "createdAt",
    sortOrder: "desc",
    ...(query.provider && { provider: query.provider }),
    ...(query.isActive !== undefined && { isActive: query.isActive }),
  };

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
  const parsed = testCourierConnectionSchema.parse(payload);
  await assertProviderConnection(
    parsed.provider,
    parsed.credentials,
    parsed.config,
  );

  return { provider: parsed.provider, connected: true };
};

export const createCourierAccount = async (
  payload: CreateCourierAccountInput,
): Promise<CreatedCourierAccountResponse> => {
  const parsed = createCourierAccountSchema.parse(payload);
  await assertProviderConnection(
    parsed.provider,
    parsed.credentials,
    parsed.config,
  );

  const plainWebhookSecret =
    parsed.provider === CourierProvider.PATHAO
      ? randomBytes(32).toString("hex")
      : parsed.webhookSecret;
  const configData = parseProviderConfig(parsed.provider, parsed.config);

  const account = await prisma.$transaction(async (transaction) => {
    if (parsed.isDefault) {
      await transaction.courierAccount.updateMany({
        where: { provider: parsed.provider, isDefault: true },
        data: { isDefault: false },
      });
    }

    return createOne<CourierAccount>(
      transaction.courierAccount,
      {
        provider: parsed.provider,
        label: parsed.label,
        credentials: encrypt(parsed.credentials),
        config: configData as Prisma.JsonValue,
        webhookSecret: plainWebhookSecret
          ? encrypt({ secret: plainWebhookSecret })
          : null,
        isDefault: parsed.isDefault ?? false,
      },
    );
  });

  return {
    ...toPublicAccount(account),
    ...(parsed.provider === CourierProvider.PATHAO && plainWebhookSecret
      ? { oneTimeWebhookSecret: plainWebhookSecret }
      : {}),
  };
};

export const updateCourierAccountById = async (
  id: string,
  payload: UpdateCourierAccountInput,
): Promise<CourierAccountResponse> => {
  const parsed = updateCourierAccountSchema.parse(payload);
  const current = await prisma.courierAccount.findUnique({ where: { id } });

  if (!current) {
    throw new AppError("Courier account not found", 404);
  }

  if (
    parsed.webhookSecret !== undefined &&
    current.provider === CourierProvider.PATHAO
  ) {
    throw new AppError(
      "Use the regenerate webhook secret endpoint for Pathao accounts.",
      400,
    );
  }

  const shouldTestConnection =
    parsed.credentials !== undefined || parsed.config !== undefined;
  let encryptedCredentials: string | undefined;
  let configData: Prisma.InputJsonValue | undefined;

  if (shouldTestConnection) {
    const credentials =
      parsed.credentials ??
      parseProviderCredentials(
        current.provider,
        decrypt<unknown>(current.credentials),
      );
    const providerConfig =
      parsed.config !== undefined
        ? parseProviderConfig(current.provider, parsed.config)
        : current.config;

    await assertProviderConnection(
      current.provider,
      credentials,
      providerConfig,
    );

    if (parsed.credentials !== undefined) {
      encryptedCredentials = encrypt(credentials);
    }
    if (parsed.config !== undefined) {
      configData = parseProviderConfig(current.provider, parsed.config);
    }
  }

  const encryptedWebhookSecret =
    parsed.webhookSecret === null
      ? null
      : parsed.webhookSecret !== undefined
        ? encrypt({ secret: parsed.webhookSecret })
        : undefined;

  const account = await prisma.$transaction(async (transaction) => {
    if (parsed.isDefault === true) {
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
        ...(parsed.label !== undefined && { label: parsed.label }),
        ...(encryptedCredentials !== undefined && {
          credentials: encryptedCredentials,
        }),
        ...(configData !== undefined && { config: configData }),
        ...(encryptedWebhookSecret !== undefined && {
          webhookSecret: encryptedWebhookSecret,
        }),
        ...(parsed.isActive !== undefined && { isActive: parsed.isActive }),
        ...(parsed.isDefault !== undefined && { isDefault: parsed.isDefault }),
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

export const regeneratePathaoWebhookSecret = async (
  id: string,
): Promise<CreatedCourierAccountResponse> => {
  const current = await prisma.courierAccount.findUnique({ where: { id } });
  if (!current) {
    throw new AppError("Courier account not found", 404);
  }
  if (current.provider !== CourierProvider.PATHAO) {
    throw new AppError(
      "Webhook secret regeneration is only available for Pathao accounts.",
      400,
    );
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
