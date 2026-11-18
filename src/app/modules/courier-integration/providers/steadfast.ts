import axios from "axios";
import { AppError } from "../../../errors/AppError";
import { config } from "../../../config";
import type { SteadfastCredentials } from "../courier-integration.validation";

export const testConnection = async (
  credentials: SteadfastCredentials,
): Promise<void> => {
  let response;
  try {
    response = await axios.get(
      `${config.courier.steadfastBaseUrl.replace(/\/+$/, "")}/get_balance`,
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
