"use client";

/**
 * Generates HMAC-SHA256 signature for CorvusPay payment form.
 *
 * @param fields - CorvusFormFields
 * @param actionUrl - The URL to submit the form to
 * @returns {submit: () => void, formElement: HTMLFormElement}
 */

export type CorvusFormFields = {
    version: string; // e.g. "1.6"
    store_id: string;
    order_number: string;
    language: string;
    currency: string;
    amount: string;
    cart: string;
    require_complete: "true" | "false";
    cardholder_country_code: string;
    signature: string;
    cardholder_name?: string; // Name of the cardholder (max 40 chars)
    cardholder_surname?: string; // Surname of the cardholder (max 40 chars)
    cardholder_address?: string; // Cardholder address (max 100 chars)
    cardholder_city?: string; // Cardholder city (max 20 chars)
    cardholder_zip_code?: string; // Cardholder ZIP code (max 9 chars)
    cardholder_country?: string; // Cardholder country (max 30 chars)
    cardholder_email?: string; // Cardholder email address (max 100 chars)
    subscription?: "true" | "false"; // Indicates if the payment is to initiate a subscription payment
    additional_order_number?: string; // Additional order number (max 36 chars)
    success_url?: string; // URL for successful transaction redirect (max 200 chars)
    cancel_url?: string; // URL for cancelled transaction redirect (max 200 chars)
};
  
export function createCorvusForm(fields: CorvusFormFields, actionUrl: string = process.env.CORVUS_API || 'https://test-wallet.corvuspay.com') {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = actionUrl + "/checkout/";
    form.style.display = 'none';

    // Add fields to form
    Object.entries(fields).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
    });

    // Append form to document body
    document.body.appendChild(form);
  
    return {
        submit: () => form.submit(),
        formElement: form,
    };
}
  