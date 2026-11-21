import axios from "axios";
import { AppError } from "../../../errors/AppError";
import { config } from "../../../config";
import type { SteadfastCredentials } from "../courier-integration.validation";

const steadfastUrl = (path: string): string =>
  `${config.courier.steadfastBaseUrl.replace(/\/+$/, "")}${path}`;

export const testConnection = async (
  credentials: SteadfastCredentials,
): Promise<void> => {
  let response;
  try {
    response = await axios.get(
      steadfastUrl("/get_balance"),
      {
        headers: {
          "Api-Key": credentials.apiKey,
          "Secret-Key": credentials.secretKey,
        },
        timeout: 10_000,
        validateStatus: () => true,
      },
    );
  } catch {
    throw new AppError(
      "Unable to reach Steadfast. Check the configured URL.",
      502,
    );
  }

  if (response.status < 200 || response.status >= 300) {
    throw new AppError(
      "Steadfast connection failed. Check the API credentials.",
      400,
    );
  }
};

export const createShipment = async (
  credentials: SteadfastCredentials,
  payload: Record<string, string | number>,
): Promise<unknown> => {
  let response;
  try {
    response = await axios.post<unknown>(
      steadfastUrl("/create_order"),
      payload,
      {
        headers: {
          "Api-Key": credentials.apiKey,
          "Secret-Key": credentials.secretKey,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        timeout: 15_000,
        validateStatus: () => true,
      },
    );
  } catch (error) {
    const code = axios.isAxiosError(error) ? error.code : undefined;
    if (code === "ECONNABORTED" || code === "ETIMEDOUT") {
      throw new AppError("Steadfast shipment creation timed out.", 504);
    }
    throw new AppError(
      `Unable to reach Steadfast shipment endpoint${code ? ` (${code})` : ""}.`,
      502,
    );
  }

  if (response.status < 200 || response.status >= 300) {
    throw new AppError(
      `Steadfast shipment creation failed (HTTP ${response.status}).`,
      response.status < 500 ? 400 : 502,
    );
  }

  return response.data;
};

export const getCustomerHistory = async (
  credentials: SteadfastCredentials,
  phone: string,
): Promise<unknown> => {
  let response;
  try {
    response = await axios.get(
      `${config.courier.steadfastBaseUrl.replace(/\/+$/, "")}/fraud_check/score/${encodeURIComponent(phone)}`,
      {
        headers: {
          "Api-Key": credentials.apiKey,
          "Secret-Key": credentials.secretKey,
          Accept: "application/json",
        },
        timeout: 10_000,
        validateStatus: () => true,
      },
    );
  } catch (error) {
    const code = axios.isAxiosError(error) ? error.code : undefined;
    if (code === "ECONNABORTED" || code === "ETIMEDOUT") {
      throw new AppError("Steadfast customer-history request timed out.", 504);
    }
    throw new AppError(
      `Unable to reach Steadfast customer-history endpoint${code ? ` (${code})` : ""}.`,
      502,
    );
  }

  if (response.status < 200 || response.status >= 300) {
    throw new AppError(
      `Steadfast customer-history request failed (HTTP ${response.status}).`,
      502,
    );
  }

  return response.data;
};
