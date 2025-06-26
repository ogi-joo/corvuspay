"use server";

import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import https from 'https';
import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXmlAsync = promisify(parseString);

export interface CorvusCompleteConfig {
  certPath: string;
  keyPath: string;
  key?: string;
  apiUrl?: string;
}

export interface CorvusCompleteResponse {
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
    cart?: string;
    merchant_id?: string;
    company_id?: string;
    ip?: string;
    language?: string;
    delivery?: string;
    expiration_date?: string;
    card_entry_mode?: string;
    card_member_authentication?: string;
    card_present?: string;
    cardholder_present?: string;
  };
}

/**
 * Generates SHA-1 hash for CorvusPay complete request
 * hash = SHA1(key + order_number + store_id)
 */
function generateCompleteHash(key: string, orderNumber: string, storeId: string): string {
  return crypto
    .createHash('sha1')
    .update(key + orderNumber + storeId)
    .digest('hex');
}

/**
 * Parses XML response from CorvusPay into JSON format
 */
async function parseCorvusResponse(xmlString: string): Promise<CorvusCompleteResponse> {
  try {
    const result = await parseXmlAsync(xmlString) as any;

    // Check if response contains errors
    if ('errors' in result) {
      return {
        success: false,
        data: result
      };
    }

    // Handle order response structure (for complete operations)
    if (result['order']) {
      const order = result['order'];
      
      return {
        success: true,
        data: {
          order_number: order['order-number']?.[0],
          amount: order['transaction-amount']?.[0]?.["_"] || order['amount']?.[0]?.["_"],
          transaction_datetime: order['created-at']?.[0],
          status: order['status']?.[0] || 'completed', // Complete operations are typically successful
          response_message: order['comment']?.[0] || order['response-message']?.[0],
          response_code: order['response-code']?.[0]?.["_"] || '0',
          currency_code: order['currency-code']?.[0],
          card_type: order['cc-type']?.[0],
          cardholder_name: order['cardholder-name']?.[0],
          cardholder_surname: order['cardholder-surname']?.[0],
          cardholder_address: order['cardholder-address']?.[0],
          cardholder_city: order['cardholder-city']?.[0],
          cardholder_zip_code: order['cardholder-zip-code']?.[0],
          cardholder_email: order['cardholder-email']?.[0],
          cardholder_phone: order['cardholder-phone']?.[0],
          cardholder_country: order['cardholder-country']?.[0],
          cardholder_country_code: order['cardholder-country-code']?.[0],
          installments_number: order['installments-number']?.[0]?.["_"],
          card_masked_number: order['card-details']?.[0],
          rrn: order['reference-number']?.[0] || order['rrn']?.[0],
          approval_code: order['approval-code']?.[0],
          acquirer_code: order['acquirer_code']?.[0],
          transaction_type: order['transaction_type']?.[0],
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
            const transactionType = order['transaction_type']?.[0];
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
            const transactionType = order['transaction_type']?.[0];
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
            const transactionType = order['transaction_type']?.[0];
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
            const transactionType = order['transaction_type']?.[0];
            return transactionType ? typeMapCyr[transactionType] || 'Непознат тип трансакције' : undefined;
          })(),
          additional_order_number: order['additional_order_number']?.[0],
          subscription_exp_date: order['subscription-exp-date']?.[0] || order['next-recurring']?.[0],
          account_id: order['account-id']?.[0],
          // Additional fields specific to complete operations
          cart: order['cart']?.[0],
          merchant_id: order['merchant-id']?.[0],
          company_id: order['company-id']?.[0]?.["_"],
          ip: order['ip']?.[0],
          language: order['language']?.[0],
          delivery: order['delivery']?.[0],
          expiration_date: order['expiration-date']?.[0],
          card_entry_mode: order['card-entry-mode']?.[0],
          card_member_authentication: order['card-member-authentication']?.[0],
          card_present: order['card-present']?.[0],
          cardholder_present: order['cardholder-present']?.[0]
        }
      };
    }

    // Handle trans-status response structure (fallback for status-like responses)
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
 * Completes a preauthorized transaction
 * 
 * @param storeId - Store ID
 * @param orderNumber - Unique order number
 * @param config - Configuration object containing certificate paths and optional API key and URL
 * @returns Promise with parsed JSON response from CorvusPay
 */
export async function corvusComplete(
  storeId: string,
  orderNumber: string,
  config: CorvusCompleteConfig
): Promise<CorvusCompleteResponse> {
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
  const hash = generateCompleteHash(key, orderNumber, storeId);

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
      `${apiUrl}/complete`,
      new URLSearchParams({
        store_id: storeId,
        order_number: orderNumber,
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
        throw new Error(`CorvusPay complete request failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    // Convert any other error to a standard Error with message
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`CorvusPay complete request failed: ${message}`);
  }
}

/**
 * Completes a preauthorized subscription transaction
 * 
 * @param storeId - Store ID
 * @param orderNumber - Unique order number
 * @param accountId - Subscription account ID (22 characters)
 * @param config - Configuration object containing certificate paths and optional API key and URL
 * @returns Promise with parsed JSON response from CorvusPay
 */
export async function corvusCompleteSubscription(
  storeId: string,
  orderNumber: string,
  accountId: string,
  config: CorvusCompleteConfig
): Promise<CorvusCompleteResponse> {
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
  const hash = generateCompleteHash(key, orderNumber, storeId);

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
      `${apiUrl}/complete`,
      new URLSearchParams({
        store_id: storeId,
        order_number: orderNumber,
        hash,
        subscription: 'true',
        account_id: accountId
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        httpsAgent,
        responseType: 'text'
      } as any
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
        throw new Error(`CorvusPay complete subscription request failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    // Convert any other error to a standard Error with message
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`CorvusPay complete subscription request failed: ${message}`);
  }
}
