import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { config } from "../config";
import { AppError } from "../errors/AppError";

const key = Buffer.from(config.courier.encryptionKey, "hex");

export const encrypt = (value: object): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]);

  return `v1:${iv.toString("base64")}:${ciphertext.toString("base64")}`;
};




export const decrypt = <T>(blob: string): T => {
  try {
    const [version, encodedIv, encodedCiphertext, ...extra] = blob.split(":");
    if (version !== "v1" || !encodedIv || !encodedCiphertext || extra.length) {
      throw new Error("Invalid encrypted value");
    }

    const iv = Buffer.from(encodedIv, "base64");
    const ciphertextAndTag = Buffer.from(encodedCiphertext, "base64");
    if (iv.length !== 12 || ciphertextAndTag.length < 16) {
      throw new Error("Invalid encrypted value");
    }

    const ciphertext = ciphertextAndTag.subarray(0, -16);
    const authTag = ciphertextAndTag.subarray(-16);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");

    return JSON.parse(plaintext) as T;
  } catch {
    throw new AppError(
      "Stored courier credentials could not be decrypted. Verify COURIER_ENC_KEY.",
      500,
    );
  }
};

