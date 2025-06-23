"use client";

/**
 * Generates HMAC-SHA256 signature for CorvusPay payment form.
 *
 * @param fields - CorvusFormFields
 * @param actionUrl - The URL to submit the form to
 * @returns {submit: () => void, formElement: HTMLFormElement}
 */
  
export function corvusRefund(store_id: string, order_number: string, signature: string, actionUrl: string = process.env.CORVUS_API || 'https://testcps.corvus.hr', action?: () => void) {
    console.log(store_id, order_number, signature, actionUrl);
    
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = actionUrl + "/refund/";
    form.style.display = 'none';

    // Add fields to form
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'store_id';
    input.value = store_id;
    form.appendChild(input);

    const input2 = document.createElement('input');
    input2.type = 'hidden';
    input.name = 'order_number';
    input.value = order_number;
    form.appendChild(input2);

    const input3 = document.createElement('input');
    input3.type = 'hidden';
    input.name = 'signature';
    input.value = signature;
    form.appendChild(input3);
  
    // Append form to document body
    document.body.appendChild(form);

    console.log(form);

    form.submit();

    action && action();
}
  