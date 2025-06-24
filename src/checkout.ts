"use server";

/**
 * Generates HMAC-SHA256 signature for CorvusPay payment form.
 *
 * @param fields - CorvusFormFields
 * @param actionUrl - The URL to submit the form to
 * @returns string - HTML form string
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
  
export async function createCorvusForm(fields: CorvusFormFields, actionUrl: string = process.env.CORVUS_API || 'https://test-wallet.corvuspay.com') {
    const formId = `corvus-form-${Date.now()}`;
    const formFields = Object.entries(fields)
        .map(([key, value]) => `<input type="hidden" name="${key}" value="${value}">`)
        .join('\n');

    const html = `
        <div>
            <form id="${formId}" method="POST" action="${actionUrl}/checkout/" style="display: none;">
                ${formFields}
            </form>
            <script>
                (function() {
                    window.submitCorvusForm = function() {
                        document.getElementById('${formId}').submit();
                    }
                })();
                document.getElementById('${formId}').submit();
            </script>
        </div>
    `;

    return html;
}
  