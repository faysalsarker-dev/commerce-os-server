import { Request, Response } from "express";
import catchAsync from "../../common/catchAsync";
import * as CourierWebhookService from "./courier-webhook.service";
import type { CourierWebhookInput } from "./courier-integration.validation";

type RequestWithRawBody = Request & { rawBody?: Buffer };

export const receiveCourierWebhook = catchAsync(
  async (req: Request, res: Response) => {
    const request = req as RequestWithRawBody;
    const result = await CourierWebhookService.receiveCourierWebhook(
      req.params.provider as string,
      req.params.accountId as string,
      req.body as CourierWebhookInput,
      {
        authorization: req.get("authorization"),
        "x-pathao-signature": req.get("x-pathao-signature"),
        "x-signature": req.get("x-signature"),
        "idempotency-key": req.get("idempotency-key"),
      },
      request.rawBody,
    );

    if (result.headers) res.set(result.headers);
    res.status(result.statusCode).json(result.body);
  },
);
