import { AppError } from "../../../errors/AppError";
import { config } from "../../../config";
import type {
  PathaoConfig,
  PathaoCredentials,
} from "../courier-integration.validation";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const responseJson = async (response: Response): Promise<unknown> => {
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new AppError("Pathao returned an invalid response.", 502);
  }
};

const pathaoUrl = (baseUrl: string, pathname: string): string =>
  `${baseUrl.replace(/\/+$/, "")}${pathname}`;

export const testConnection = async (
  credentials: PathaoCredentials,
  courierConfig: PathaoConfig,
): Promise<void> => {
  const baseUrl = courierConfig.sandbox
    ? config.courier.pathaoSandboxBaseUrl
    : config.courier.pathaoBaseUrl;

  let tokenResponse: Response;
  try {
    tokenResponse = await fetch(
      pathaoUrl(baseUrl, "/aladdin/api/v1/issue-token"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          username: credentials.username,
          password: credentials.password,
          grant_type: "password",
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );
  } catch {
    throw new AppError("Unable to reach Pathao. Check the configured URL.", 502);
  }

  if (!tokenResponse.ok) {
    throw new AppError(
      "Pathao connection failed. Check the credentials and environment.",
      400,
    );
  }

  const tokenBody = await responseJson(tokenResponse);
  const tokenData = isRecord(tokenBody) ? tokenBody.data : undefined;
  const accessToken = isRecord(tokenBody)
    ? tokenBody.access_token
    : undefined;
  const nestedAccessToken = isRecord(tokenData)
    ? tokenData.access_token
    : undefined;
  const token =
    typeof accessToken === "string"
      ? accessToken
      : typeof nestedAccessToken === "string"
        ? nestedAccessToken
        : undefined;

  if (!token) {
    throw new AppError(
      "Pathao connection failed. Check the credentials and environment.",
      400,
    );
  }

  let storesResponse: Response;
  try {
    storesResponse = await fetch(pathaoUrl(baseUrl, "/aladdin/api/v1/stores"), {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new AppError("Unable to reach Pathao. Check the configured URL.", 502);
  }

  if (!storesResponse.ok) {
    throw new AppError(
      "Pathao connection failed while checking the configured store.",
      400,
    );
  }

  const storesBody = await responseJson(storesResponse);
  const storesData = isRecord(storesBody) ? storesBody.data : undefined;
  const stores = Array.isArray(storesData)
    ? storesData
    : isRecord(storesData) && Array.isArray(storesData.stores)
      ? storesData.stores
      : [];
  const hasConfiguredStore = stores.some((store: unknown) => {
    if (!isRecord(store)) return false;
    const storeId = store.store_id;
    return (
      typeof storeId === "number" && storeId === courierConfig.storeId
    ) || (
      typeof storeId === "string" &&
      Number(storeId) === courierConfig.storeId
    );
  });

  if (!hasConfiguredStore) {
    throw new AppError(
      "Pathao credentials are valid, but the configured store was not found.",
      400,
    );
  }
};
