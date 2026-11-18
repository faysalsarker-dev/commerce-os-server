import axios from "axios";
import { AppError } from "../../../errors/AppError";
import { config } from "../../../config";
import type {
  PathaoConfig,
  PathaoCredentials,
} from "../courier-integration.validation";

const PATHAO_TIMEOUT_MS = 30_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const pathaoUrl = (baseUrl: string, pathname: string): string =>
  `${baseUrl.replace(/\/+$/, "")}${pathname}`;

const unreachablePathaoError = (
  error: unknown,
  operation: string,
): AppError => {
  const code = axios.isAxiosError(error) ? error.code : undefined;

  if (code === "ECONNABORTED" || code === "ETIMEDOUT") {
    return new AppError(
      `Pathao ${operation} timed out after ${PATHAO_TIMEOUT_MS / 1000} seconds. Check sandbox availability and server network access.`,
      504,
    );
  }

  return new AppError(
    `Unable to reach Pathao during ${operation}. Check the configured URL${code ? ` (${code})` : ""}.`,
    502,
  );
};

export const testConnection = async (
  credentials: PathaoCredentials,
  courierConfig: PathaoConfig,
): Promise<void> => {
  const configuredBaseUrl = courierConfig.sandbox
    ? config.courier.pathaoSandboxBaseUrl
    : config.courier.pathaoBaseUrl;
  const baseUrl =
    courierConfig.sandbox &&
    configuredBaseUrl.includes("hermes-sandbox.pathao.com")
      ? "https://courier-api-sandbox.pathao.com"
      : configuredBaseUrl;

  let tokenResponse;
  try {
    tokenResponse = await axios.post<unknown>(
      pathaoUrl(baseUrl, "/aladdin/api/v1/issue-token"),
      {
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        username: credentials.username,
        password: credentials.password,
        grant_type: "password",
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: PATHAO_TIMEOUT_MS,
        validateStatus: () => true,
      },
    );
  } catch (error) {
    throw unreachablePathaoError(error, "token request");
  }

  if (tokenResponse.status < 200 || tokenResponse.status >= 300) {
    throw new AppError(
      "Pathao connection failed. Check the credentials and environment.",
      400,
    );
  }

  const tokenBody = tokenResponse.data;
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

  let storesResponse;
  try {
    storesResponse = await axios.get<unknown>(
      pathaoUrl(baseUrl, "/aladdin/api/v1/stores"),
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: PATHAO_TIMEOUT_MS,
        validateStatus: () => true,
      },
    );
  } catch (error) {
    throw unreachablePathaoError(error, "store lookup");
  }

  if (storesResponse.status < 200 || storesResponse.status >= 300) {
    throw new AppError(
      "Pathao connection failed while checking the configured store.",
      400,
    );
  }

  const storesBody = storesResponse.data;
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
