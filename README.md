# CorvusPay JS

### Get HMAC signature
```javascript
"use server"

import { CorvusFormFields, generateCorvusSignature } from "corvuspay-js";

export async function generateCorvusSignatureServer(fields: CorvusFormFields) {
    //uses CORVUS_SECRET_KEY in .env
    const signature = await generateCorvusSignature(fields);
    return signature;
}
```
### Generate Checkout Page
```javascript
"use client"
import { CorvusFormFields, createCorvusForm } from 'corvuspay-js'

...

useEffect(() => {
        const fetchForm = async () => {
            const fields = {
                store_id: "30978",
                order_number: "123456789",
                language: "hr",
                currency: "EUR",
                amount: "100.00",
                cart: "2xLCDTV a",
                require_complete: "false" as const,
                cardholder_country_code: "HR",
                version: "5.3",
                signature: ... , //server side generated signature

                //optional
                cardholder_name: "Ognjen",
                cardholder_surname: "Jovanovic",
                cardholder_email: "ognjen@example.com",
                cardholder_address: "123 Main St, Nis, Serbia",
                cardholder_city: "Nis",
                cardholder_country: "RS",
                cardholder_zip_code: "123456",
                account_id: "2imflaSkPf1swBNzebPoyW",
                success_url: "https://www.google.com",
                cancel_url: "https://www.google.com",
                subscription: "false" as const,
                additional_order_number: "12345678910",
            } as CorvusFormFields;

            //uses CORVUS_API url in .env, if empty - Corvus test API url
            const form = createCorvusForm(fields); 
            form.submit();
        }
        fetchForm();
    }, []);
```
