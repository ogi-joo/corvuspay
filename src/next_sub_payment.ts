"use server";

import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import https from 'https';
import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXmlAsync = promisify(parseString);

export interface CorvusNextSubPaymentConfig {
  certPath: string;
  keyPath: string;
  key?: string;
  apiUrl?: string;
  cart?: string;
}

export interface CorvusNextSubPaymentResponse {
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
    errors?: {
      description: string;
      action: string;
      order: Record<string, any>;
    };
  };
}

/**
 * Generates SHA-1 hash for regular next subscription payment
 * hash = SHA1(key + order_number + store_id + version)
 */
function generateNextSubPaymentHash(
  key: string,
  orderNumber: string,
  storeId: string,
  version: string = "1.6"
): string {
  return crypto
    .createHash('sha1')
    .update(key + orderNumber + storeId + version)
    .digest('hex');
}

/**
 * Generates SHA-1 hash for next subscription payment with different amount
 * hash = SHA1(key + order_number + store_id + version + new_amount + currency)
 */
function generateNextSubPaymentWithAmountHash(
  key: string,
  orderNumber: string,
  storeId: string,
  version: string,
  newAmount: string,
  currency: string
): string {
  return crypto
    .createHash('sha1')
    .update(key + orderNumber + storeId + version + newAmount + currency)
    .digest('hex');
}

/**
 * Parses XML response from CorvusPay into JSON format
 */
async function parseCorvusResponse(xmlString: string): Promise<CorvusNextSubPaymentResponse> {
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

    // Handle order response structure
    if (result['order']) {
      const order = result['order'];
      
      return {
        success: true,
        data: {
          order_number: order['order-number']?.[0],
          amount: order['transaction-amount']?.[0]?.["_"] || order['amount']?.[0]?.["_"],
          transaction_datetime: order['created-at']?.[0],
          status: order['status']?.[0] || 'completed',
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
 * Charges the next subscription payment
 * 
 * @param storeId - Store ID
 * @param orderNumber - Unique order number (must be new each time)
 * @param accountId - Subscription account ID (22 characters)
 * @param config - Configuration object containing certificate paths and optional API key, URL and cart
 * @returns Promise with parsed JSON response from CorvusPay
 */
export async function corvusNextSubPayment(
  storeId: string,
  orderNumber: string,
  accountId: string,
  config: CorvusNextSubPaymentConfig
): Promise<CorvusNextSubPaymentResponse> {
  const {
    certPath,
    keyPath,
    key = process.env.CORVUS_SECRET_KEY,
    apiUrl = process.env.CORVUS_API || 'https://testcps.corvus.hr',
    cart
  } = config;

  if (!key) {
    throw new Error('CorvusPay secret key is required. Provide it in config or set CORVUS_SECRET_KEY environment variable.');
  }

  const version = "1.6";
  
  // Generate hash
  const hash = generateNextSubPaymentHash(key, orderNumber, storeId, version);

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
    // Prepare request parameters
    const params: Record<string, string> = {
      store_id: storeId,
      order_number: orderNumber,
      hash,
      subscription: 'true',
      account_id: accountId,
      version
    };

    // Add optional cart parameter if provided
    if (cart) {
      params.cart = cart;
    }

    // Make POST request
    const response = await axios.post<string>(
      `${apiUrl}/next_sub_payment`,
      new URLSearchParams(params).toString(),
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
  } catch (error: unknown) {
    // If the error response contains XML, try to parse it
    if (isAxiosErrorWithResponse(error)) {
      try {
        const errorData = error.response.data;
        if (typeof errorData === 'string') {
          return await parseCorvusResponse(errorData);
        }
      } catch (parseError) {
        // If parsing fails, throw the original error
        throw new Error(`CorvusPay next subscription payment failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    // Convert any other error to a standard Error with message
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`CorvusPay next subscription payment failed: ${message}`);
  }
}

/**
 * Charges the next subscription payment with a different amount
 * 
 * @param storeId - Store ID
 * @param orderNumber - Unique order number (must be new each time)
 * @param accountId - Subscription account ID (22 characters)
 * @param newAmount - The new amount to charge (e.g., "100.00")
 * @param currency - Currency code in ISO 4217 format (e.g., "EUR")
 * @param config - Configuration object containing certificate paths and optional API key, URL and cart
 * @returns Promise with parsed JSON response from CorvusPay
 */
export async function corvusNextSubPaymentWithAmount(
  storeId: string,
  orderNumber: string,
  accountId: string,
  newAmount: string,
  currency: string,
  config: CorvusNextSubPaymentConfig
): Promise<CorvusNextSubPaymentResponse> {
  const {
    certPath,
    keyPath,
    key = process.env.CORVUS_SECRET_KEY,
    apiUrl = process.env.CORVUS_API || 'https://testcps.corvus.hr',
    cart
  } = config;

  if (!key) {
    throw new Error('CorvusPay secret key is required. Provide it in config or set CORVUS_SECRET_KEY environment variable.');
  }

  const version = "1.6";
  
  // Generate hash
  const hash = generateNextSubPaymentWithAmountHash(key, orderNumber, storeId, version, newAmount, currency);

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
    // Prepare request parameters
    const params: Record<string, string> = {
      store_id: storeId,
      order_number: orderNumber,
      hash,
      subscription: 'true',
      account_id: accountId,
      version,
      new_amount: newAmount,
      currency
    };

    // Add optional cart parameter if provided
    if (cart) {
      params.cart = cart;
    }

    // Make POST request
    const response = await axios.post<string>(
      `${apiUrl}/next_sub_payment`,
      new URLSearchParams(params).toString(),
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
  } catch (error: unknown) {
    // If the error response contains XML, try to parse it
    if (isAxiosErrorWithResponse(error)) {
      try {
        const errorData = error.response.data;
        if (typeof errorData === 'string') {
          return await parseCorvusResponse(errorData);
        }
      } catch (parseError) {
        // If parsing fails, throw the original error
        throw new Error(`CorvusPay next subscription payment with amount failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    // Convert any other error to a standard Error with message
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`CorvusPay next subscription payment with amount failed: ${message}`);
  }
}
