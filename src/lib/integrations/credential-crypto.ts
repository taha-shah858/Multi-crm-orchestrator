import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { AppError } from "@/lib/errors/app-error";

const VERSION = "v1";

function encryptionKey() {
  const configured = process.env.INTEGRATION_ENCRYPTION_KEY?.trim();
  if (!configured) {
    throw new AppError(
      "INTEGRATION_CONFIGURATION_ERROR",
      503,
      "INTEGRATION_ENCRYPTION_KEY is missing.",
      "Integration credential encryption is not configured on this server.",
    );
  }

  const key = /^[a-f0-9]{64}$/i.test(configured)
    ? Buffer.from(configured, "hex")
    : Buffer.from(configured, "base64");
  if (key.length !== 32) {
    throw new AppError(
      "INTEGRATION_CONFIGURATION_ERROR",
      503,
      "INTEGRATION_ENCRYPTION_KEY must decode to exactly 32 bytes.",
      "Integration credential encryption is not configured correctly.",
    );
  }
  return key;
}

/** AES-256-GCM envelope. Token values are only handled in server memory. */
export function encryptIntegrationSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(":");
}

export function decryptIntegrationSecret(envelope: string) {
  const [version, ivValue, tagValue, encryptedValue] = envelope.split(":");
  if (version !== VERSION || !ivValue || !tagValue || !encryptedValue) {
    throw new AppError(
      "INTEGRATION_CONFIGURATION_ERROR",
      503,
      "Integration credential envelope is invalid.",
      "The integration credentials could not be read. Reconnect the provider.",
    );
  }
  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new AppError(
      "INTEGRATION_CONFIGURATION_ERROR",
      503,
      "Integration credential decryption failed.",
      "The integration credentials could not be read. Reconnect the provider.",
    );
  }
}
