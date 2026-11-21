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

const getPathaoBaseUrl = (sandbox: boolean): string => {
  const configuredBaseUrl = sandbox
    ? config.courier.pathaoSandboxBaseUrl
    : config.courier.pathaoBaseUrl;

  return sandbox &&
    configuredBaseUrl.includes("hermes-sandbox.pathao.com")
    ? "https://courier-api-sandbox.pathao.com"
    : configuredBaseUrl;
};

const getAccessToken = async (
  credentials: PathaoCredentials,
  sandbox: boolean,
): Promise<string> => {
  let tokenResponse;
  try {
    tokenResponse = await axios.post<unknown>(
      pathaoUrl(getPathaoBaseUrl(sandbox), "/aladdin/api/v1/issue-token"),
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

  return token;
};

export const getCustomerHistory = async (
  credentials: PathaoCredentials,
  sandbox: boolean,
  phone: string,
): Promise<unknown> => {
  const token = await getAccessToken(credentials, sandbox);
  let response;
  try {
    response = await axios.post<unknown>(
      pathaoUrl(
        getPathaoBaseUrl(sandbox),
        "/aladdin/api/v1/user/success-rate",
      ),
      { phone },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: PATHAO_TIMEOUT_MS,
        validateStatus: () => true,
      },
    );
  } catch (error) {
    throw unreachablePathaoError(error, "customer-history request");
  }

  if (response.status < 200 || response.status >= 300) {
    throw new AppError(
      `Pathao customer-history request failed (HTTP ${response.status}).`,
      502,
    );
  }

  return response.data;
};

export const createShipment = async (
  credentials: PathaoCredentials,
  sandbox: boolean,
  payload: Record<string, string | number>,
): Promise<unknown> => {
  const token = await getAccessToken(credentials, sandbox);
  let response;
  try {
    response = await axios.post<unknown>(
      pathaoUrl(getPathaoBaseUrl(sandbox), "/aladdin/api/v1/orders"),
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        timeout: PATHAO_TIMEOUT_MS,
        validateStatus: () => true,
      },
    );
  } catch (error) {
    throw unreachablePathaoError(error, "shipment creation");
  }

  if (response.status < 200 || response.status >= 300) {
    throw new AppError(
      `Pathao shipment creation failed (HTTP ${response.status}).`,
      response.status < 500 ? 400 : 502,
    );
  }

  return response.data;
};

export const testConnection = async (
  credentials: PathaoCredentials,
  courierConfig: PathaoConfig,
): Promise<void> => {
  const baseUrl = getPathaoBaseUrl(courierConfig.sandbox);
  const token = await getAccessToken(credentials, courierConfig.sandbox);

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
      : isRecord(storesData) && Array.isArray(storesData.data)
        ? storesData.data
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
