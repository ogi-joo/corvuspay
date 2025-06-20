"use server";
import crypto from "crypto";

/**
 * Generates HMAC-SHA256 signature for CorvusPay payment form.
 *
 * @param fields - An object of key-value pairs of form fields
 * @param secretKey - Your CorvusPay secret key (shared secret)
 * @returns Hex-encoded HMAC signature string
 */


export async function generateCorvusSignature(
  fields: Record<string, string>,
  secretKey?: string
): Promise<string> {
  // Sort fields by key alphabetically
  const sortedKeys = Object.keys(fields).sort();

  // Concatenate all values in order
  const concatenatedValues = sortedKeys.map((key) => key + fields[key]).join("");

  // Create HMAC-SHA256 using the secret key
  const hmac = crypto
    .createHmac("sha256", secretKey || process.env.CORVUS_SECRET_KEY || "your-secret-key")
    .update(concatenatedValues)
    .digest("hex");

  return hmac.toLowerCase(); // CorvusPay requires lowercase hex string
}
