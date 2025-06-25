# CorvusPay JS


### Simple usage

*createCorvusForm* uses **CORVUS_SECRET_KEY** from .env but you can also pass the key.

It also uses **CORVUS_API** from .env to get main API route, but will use official test route if no CORVUS_API is given.

```javascript
"use server"

import { CorvusFormFields, createCorvusForm } from "corvuspay-js"

export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams

    const fields = {
        store_id: params.store_id,
        order_number: params.order_number,
        language: params.language,
        currency: params.currency,
        amount: params.amount,
        cart: params.cart,
        require_complete: params.require_complete,
        cardholder_country_code: params.cardholder_country_code,
        version: params.version,
        //optional fields
        cardholder_name: params.cardholder_name,
        cardholder_surname: params.cardholder_surname,
        cardholder_email: params.cardholder_email,
        cardholder_address: params.cardholder_address,
        cardholder_city: params.cardholder_city,
        cardholder_country: params.cardholder_country,
        cardholder_zip_code: params.cardholder_zip_code,
        target: params.target, // I don't know what's this for, yet it's in the docs
        account_id: params.account_id,
        success_url: params.success_url, // optional but needed
        cancel_url: params.cancel_url, //optional but needed
        subscription: params.subscription, // in order to use subscription, email Corvus to enable it for each store
        additional_order_number: params.additional_order_number,
    } as CorvusFormFields;

    //uses CORVUS_SECRET_KEY in .env
    const form = await createCorvusForm(fields)

    // Corvus has a weird API, this is the only way to get to the checkout from a server side rendering.
    return <div dangerouslySetInnerHTML={{__html: form}} />;
}
```
### Refund Usage

Refund function is easier to implement but harded to setup.
What you need:
1) Generate *CorvusPay.key.pem*
```bash
openssl req -batch -nodes -newkey rsa:2048 -sha256 \
  -keyout CorvusPay.key.pem \
  -out CorvusPay.csr
```
2) Email it to *support@corvuspay.com* with a request to get *CorvusPay.crt.pem* back
3) Use them for bunch of "high security" routes, one of which is refund:
```javascript
const data = await corvusRefund(
        store_id,
        order_number,
        {
            certPath: "./path-to-your/CorvusPay.crt.pem",
            keyPath: "./path-to-your/CorvusPay.key.pem",
        }) as CorvusRefundResponse;
```

## Other stuff
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
