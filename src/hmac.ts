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

    console.log(sortedKeys , "sortedKeys");
    // Concatenate all values in order, excluding signature and cardholder_state
    const concatenatedValues = sortedKeys
        .filter((key) => key !== "signature" && key !== "cardholder_state" && key !== "cardholder_phone")
        .map((key) => key + fields[key])
        .join("");

        console.log(concatenatedValues , "concatenatedValues");


    // Create HMAC-SHA256 using the secret key
    const hmac = crypto
        .createHmac("sha256", secretKey || process.env.CORVUS_SECRET_KEY || "your-secret-key")
        .update(concatenatedValues)
        .digest("hex");

    return hmac.toLowerCase(); // CorvusPay requires lowercase hex string
}
