import { AppError } from "../../../errors/AppError";
import { config } from "../../../config";
import type { SteadfastCredentials } from "../courier-integration.validation";

export const testConnection = async (
  credentials: SteadfastCredentials,
): Promise<void> => {
  let response: Response;
  try {
    response = await fetch(
      `${config.courier.steadfastBaseUrl.replace(/\/+$/, "")}/get_balance`,
      {
        headers: {
          "Api-Key": credentials.apiKey,
          "Secret-Key": credentials.secretKey,
        },
        signal: AbortSignal.timeout(10_000),
      },
    );
  } catch {
    throw new AppError(
      "Unable to reach Steadfast. Check the configured URL.",
      502,
    );
  }

  if (!response.ok) {
    throw new AppError(
      "Steadfast connection failed. Check the API credentials.",
      400,
    );
  }
};
