"use server";

import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import https from 'https';
import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXmlAsync = promisify(parseString);

export interface CorvusCheckConfig {
  certPath: string;
  keyPath: string;
  key?: string;
  apiUrl?: string;
}

export interface CorvusCheckResponse {
  success: boolean;
  data: {
    order_number?: string;
    amount?: string;
    transaction_datetime?: string;
    status?: string;
    response_message?: string;
    response_code?: string;
    currency_code?: string;
    card_type?: string;
    cardholder_name?: string;
    cardholder_surname?: string;
    cardholder_address?: string;
    cardholder_city?: string;
    cardholder_zip_code?: string;
    cardholder_email?: string;
    cardholder_phone?: string;
    cardholder_country?: string;
    cardholder_country_code?: string;
    installments_number?: string;
    card_masked_number?: string;
    rrn?: string;
    approval_code?: string;
    acquirer_code?: string;
    transaction_type?: string;
    transaction_description?: string;
    transaction_description_hr?: string;
    transaction_description_sr?: string;
    transaction_description_cyr?: string;
    additional_order_number?: string;
    subscription_exp_date?: string;
    account_id?: string;
    errors?: {
      description: string;
      action: string;
      order: Record<string, any>;
    };
  };
}

/**
 * Generates SHA-1 hash for CorvusPay status check request
 * hash = SHA1(key + order_number + store_id + currency_code + timestamp + version)
 */
function generateStatusHash(
  key: string, 
  orderNumber: string, 
  storeId: string, 
  currencyCode: string, 
  timestamp: string, 
  version: string
): string {
  return crypto
    .createHash('sha1')
    .update(key + orderNumber + storeId + currencyCode + timestamp + version)
    .digest('hex');
}

/**
 * Parses XML response from CorvusPay into JSON format
 */
async function parseCorvusResponse(xmlString: string): Promise<CorvusCheckResponse> {
  try {
    const result = await parseXmlAsync(xmlString) as any;
    console.log('Parsed XML result:', JSON.stringify(result, null, 2));

    // Check if response contains errors
    if ('errors' in result) {
      return {
        success: false,
        data: result
      };
    }

    // Handle trans-status response structure
    if (result['trans-status']) {
      const transStatus = result['trans-status'];
      
      return {
        success: true,
        data: {
          order_number: transStatus['order-number']?.[0],
          amount: transStatus['transaction-amount']?.[0]?.["_"],
          transaction_datetime: transStatus['transaction-date-and-time']?.[0],
          status: transStatus['status']?.[0],
          response_message: transStatus['response-message']?.[0],
          response_code: transStatus['response-code']?.[0]?.["_"],
          currency_code: transStatus['currency-code']?.[0],
          card_type: transStatus['cc-type']?.[0],
          cardholder_name: transStatus['cardholder-name']?.[0],
          cardholder_surname: transStatus['cardholder-surname']?.[0],
          cardholder_address: transStatus['cardholder-address']?.[0],
          cardholder_city: transStatus['cardholder-city']?.[0],
          cardholder_zip_code: transStatus['cardholder-zip-code']?.[0],
          cardholder_email: transStatus['cardholder-email']?.[0],
          cardholder_phone: transStatus['cardholder-phone']?.[0],
          cardholder_country: transStatus['cardholder-country']?.[0],
          cardholder_country_code: transStatus['cardholder-country-code']?.[0],
          installments_number: transStatus['installments-number']?.[0]?.["_"],
          card_masked_number: transStatus['card-details']?.[0],
          rrn: transStatus['reference-number']?.[0],
          approval_code: transStatus['approval-code']?.[0],
          acquirer_code: transStatus['acquirer_code']?.[0],
          transaction_type: transStatus['transaction_type']?.[0],
          transaction_description: (() => {
            const typeMap: Record<string, string> = {
              '0': 'Regular transaction',
              '1': 'Initial subscription transaction',
              '2': 'Next subscription',
              '3': 'Saving a card for CardStorage',
              '4': 'Using a card from CardStorage',
              '5': 'Saving a card for Corvus Wallet',
              '6': 'Using a card from Corvus Wallet',
              '7': 'Saving a card during fast registration',
              '8': 'PIS transaction',
              '9': 'PIS transaction from Corvus Wallet',
              '10': 'paysafecard',
              '11': 'Virtual Terminal',
              '12': 'POS transaction',
              '13': 'QR Code transaction',
              '14': 'Mobile Wallet transaction',
              '15': 'Crypto transaction',
              '16': 'Google Pay transaction',
              '17': 'Apple Pay transaction',
              '18': 'IPS transaction'
            };
            const transactionType = transStatus['transaction_type']?.[0];
            return transactionType ? typeMap[transactionType] || 'Unknown transaction type' : undefined;
          })(),
          transaction_description_hr: (() => {
            const typeMapHr: Record<string, string> = {
              '0': 'Redovna transakcija',
              '1': 'Početna transakcija pretplate',
              '2': 'Sljedeća pretplata',
              '3': 'Spremanje kartice za CardStorage',
              '4': 'Korištenje kartice iz CardStorage',
              '5': 'Spremanje kartice za Corvus Wallet',
              '6': 'Korištenje kartice iz Corvus Wallet',
              '7': 'Spremanje kartice tijekom brze registracije',
              '8': 'PIS transakcija',
              '9': 'PIS transakcija iz Corvus Wallet',
              '10': 'paysafecard',
              '11': 'Virtualni terminal',
              '12': 'POS transakcija',
              '13': 'QR kod transakcija',
              '14': 'Mobilni novčanik transakcija',
              '15': 'Kripto transakcija',
              '16': 'Google Pay transakcija',
              '17': 'Apple Pay transakcija',
              '18': 'IPS transakcija'
            };
            const transactionType = transStatus['transaction_type']?.[0];
            return transactionType ? typeMapHr[transactionType] || 'Nepoznat tip transakcije' : undefined;
          })(),
          transaction_description_sr: (() => {
            const typeMapSr: Record<string, string> = {
              '0': 'Redovna transakcija',
              '1': 'Početna transakcija pretplate',
              '2': 'Sledeća pretplata',
              '3': 'Čuvanje kartice za CardStorage',
              '4': 'Korišćenje kartice iz CardStorage',
              '5': 'Čuvanje kartice za Corvus Wallet',
              '6': 'Korišćenje kartice iz Corvus Wallet',
              '7': 'Čuvanje kartice tokom brze registracije',
              '8': 'PIS transakcija',
              '9': 'PIS transakcija iz Corvus Wallet',
              '10': 'paysafecard',
              '11': 'Virtuelni terminal',
              '12': 'POS transakcija',
              '13': 'QR kod transakcija',
              '14': 'Mobilni novčanik transakcija',
              '15': 'Kripto transakcija',
              '16': 'Google Pay transakcija',
              '17': 'Apple Pay transakcija',
              '18': 'IPS transakcija'
            };
            const transactionType = transStatus['transaction_type']?.[0];
            return transactionType ? typeMapSr[transactionType] || 'Nepoznat tip transakcije' : undefined;
          })(),
          transaction_description_cyr: (() => {
            const typeMapCyr: Record<string, string> = {
              '0': 'Редовна трансакција',
              '1': 'Почетна трансакција претплате',
              '2': 'Следећа претплата',
              '3': 'Чување картице за CardStorage',
              '4': 'Коришћење картице из CardStorage',
              '5': 'Чување картице за Corvus Wallet',
              '6': 'Коришћење картице из Corvus Wallet',
              '7': 'Чување картице током брзе регистрације',
              '8': 'PIS трансакција',
              '9': 'PIS трансакција из Corvus Wallet',
              '10': 'paysafecard',
              '11': 'Виртуелни терминал',
              '12': 'POS трансакција',
              '13': 'QR код трансакција',
              '14': 'Мобилни новчаник трансакција',
              '15': 'Крипто трансакција',
              '16': 'Google Pay трансакција',
              '17': 'Apple Pay трансакција',
              '18': 'IPS трансакција'
            };
            const transactionType = transStatus['transaction_type']?.[0];
            return transactionType ? typeMapCyr[transactionType] || 'Непознат тип трансакције' : undefined;
          })(),
          additional_order_number: transStatus['additional_order_number']?.[0],
          subscription_exp_date: transStatus['subscription-exp-date']?.[0],
          account_id: transStatus['account-id']?.[0]
        }
      };
    }

    // Fallback for other response structures
    return {
      success: true,
      data: result.response || result
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
 * Checks the status of a CorvusPay transaction
 * 
 * @param storeId - Store ID
 * @param orderNumber - Unique order number
 * @param currencyCode - Currency code (e.g., "978" for EUR)
 * @param timestamp - Timestamp in format "yyyyMMddHHmmss"
 * @param version - API version (e.g., "1.6")
 * @param config - Configuration object containing certificate paths and optional API key and URL
 * @returns Promise with parsed JSON response from CorvusPay
 */
export async function corvusCheckStatus(
  storeId: string,
  orderNumber: string,
  currencyCode: string,
  config: CorvusCheckConfig,
  timestamp?: string,
  version?: string,
): Promise<CorvusCheckResponse> {
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
  const hash = generateStatusHash(key, orderNumber, storeId, currencyCode, timestamp || new Date().toISOString().split('T')?.[0], version || "5.0");

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
      `${apiUrl}/status`,
      new URLSearchParams({
        store_id: storeId,
        order_number: orderNumber,
        currency_code: currencyCode,
        timestamp: timestamp || new Date().toISOString().split('T')?.[0],
        version: version || "5.0",
        hash
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        httpsAgent,
        responseType: 'text'
      } as any
    );
    console.log(response.data, "response.data");

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
        throw new Error(`CorvusPay status check failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    // Convert any other error to a standard Error with message
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`CorvusPay status check failed: ${message}`);
  }
}
