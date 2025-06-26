"use server";

import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import https from 'https';
import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXmlAsync = promisify(parseString);

export interface CorvusRefundConfig {
  certPath: string;
  keyPath: string;
  key?: string;
  apiUrl?: string;
}

export interface CorvusRefundResponse {
  success: boolean;
  data: {
    order?: Record<string, any>;
    errors?: {
      description: string;
      action: string;
      'order-states': string[];
      order: Record<string, any>;
    };
  };
}

type XMLParseResult = {
  order?: Record<string, any>;
  errors?: {
    description: string;
    action: string;
    'order-states': string[];
    order: Record<string, any>;
  };
};

/**
 * Generates SHA-1 hash for CorvusPay refund request
 * hash = SHA1(key + order_number + store_id)
 */
function generateRefundHash(key: string, orderNumber: string, storeId: string): string {
  return crypto
    .createHash('sha1')
    .update(key + orderNumber + storeId)
    .digest('hex');
}

/**
 * Parses XML response from CorvusPay into JSON format
 */
async function parseCorvusResponse(xmlString: string): Promise<CorvusRefundResponse> {
  try {
    const result = await parseXmlAsync(xmlString) as XMLParseResult;

    // Check if response contains errors
    if ('errors' in result) {
      return {
        success: false,
        data: result
      };
    }

    // Success response
    return {
      success: true,
      data: result
    };
  } catch (error) {
    throw new Error(`Failed to parse CorvusPay response: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Type guard for axios error response
function isAxiosErrorWithResponse(error: unknown): error is { response: { data: unknown } } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'response' in error &&
    error.response !== null &&
    typeof error.response === 'object' &&
    'data' in error.response
  );
}

/**
 * Initiates a refund request to CorvusPay API
 * 
 * @param storeId - Store ID
 * @param orderNumber - Unique order number
 * @param config - Configuration object containing certificate paths and optional API key and URL
 * @returns Promise with parsed JSON response from CorvusPay
 */
export async function corvusRefund(
  storeId: string,
  orderNumber: string,
  config: CorvusRefundConfig
): Promise<CorvusRefundResponse> {
  const {
    certPath,
    keyPath,
    key = process.env.CORVUS_SECRET_KEY,
    apiUrl = process.env.CORVUS_API || 'https://testcps.corvus.hr'
  } = config;

  if (!key) {
    throw new Error('CorvusPay secret key is required. Provide it in config or set CORVUS_SECRET_KEY environment variable.');
  }

  // Generate hash
  const hash = generateRefundHash(key, orderNumber, storeId);

  // Read certificates
  const cert = fs.readFileSync(certPath);
  const privateKey = fs.readFileSync(keyPath);

  // Create HTTPS agent with certificates
  const httpsAgent = new https.Agent({
    cert,
    key: privateKey,
    rejectUnauthorized: true
  });

  try {
    // Make POST request
    const response = await axios.post<string>(
      `${apiUrl}/refund`,
      new URLSearchParams({
        store_id: storeId,
        order_number: orderNumber,
        hash
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        // @ts-ignore - httpsAgent is valid but type definitions are incomplete
        httpsAgent,
        // Ensure response is returned as raw text since we expect XML
        responseType: 'text'
      }
    );

    // Parse XML response to JSON
    return await parseCorvusResponse(response.data);
  } catch (error) {
    // If the error response contains XML, try to parse it
    if (isAxiosErrorWithResponse(error)) {
      try {
        const errorData = error.response.data;
        if (typeof errorData === 'string') {
          return await parseCorvusResponse(errorData);
        }
      } catch (parseError) {
        // If parsing fails, throw the original error
        throw new Error(`CorvusPay refund request failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    // Convert any other error to a standard Error with message
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`CorvusPay refund request failed: ${message}`);
  }
  
  // If we get here, throw a generic error
  throw new Error('CorvusPay refund request failed: Unknown error');
}
  