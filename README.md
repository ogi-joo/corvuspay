# CorvusPay JS


### Simple usage

*createCorvusForm* uses **CORVUS_SECRET_KEY** from .env but you can also pass the key.

It also uses **CORVUS_API** from .env to get main API route, but will use official test route if no CORVUS_API is given.

```javascript
"use server"

import { CorvusFormFields, createCorvusForm } from "corvuspay"

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
### GET Transaction

For high security routes, you will need custom certs. 
What you need to do:
1) Generate *CorvusPay.key.pem*
```bash
openssl req -batch -nodes -newkey rsa:2048 -sha256 \
  -keyout CorvusPay.key.pem \
  -out CorvusPay.csr
```
2) Email it to *support@corvuspay.com* with a request to get *CorvusPay.crt.pem* back
3) Use them for bunch of "high security" routes, one of which is to GET Transaction:
```javascript
const result = await corvusCheckStatus(
        params.store_id as string,
        params.order_number as string,
        process.env.CORVUS_CURRENCY_CODE || '978',
        {
          certPath: './corvus-pay/CorvusPay.crt.pem',
          keyPath: './corvus-pay/CorvusPay.key.pem',
        }
);
    
if (result.success) {
    console.log('Transaction details:', result.data);
    console.log('Status:', result.data.status);
    console.log('Amount:', result.data.amount);
} else {
    console.log('Error:', result.data.errors);
}
```
Logs:
```bash
Transaction details: {
  order_number: '12345',
  amount: '10000', // this is 100 EUR
  transaction_datetime: '20250623180613',
  status: 'authorized',
  response_message: 'approved',
  response_code: '0',
  currency_code: '978',
  card_type: 'visa',
  cardholder_name: 'Ognjen',
  cardholder_surname: 'Jovanovic',
  cardholder_address: '123 Main St, Nis, Serbia',
  cardholder_city: 'Nis',
  cardholder_zip_code: '123456',
  cardholder_email: 'ognjen@example.com',
  cardholder_phone: '',
  cardholder_country: 'RS',
  cardholder_country_code: 'RS',
  installments_number: '0',
  card_masked_number: '400000xxxxxx0000',
  rrn: '000001234567',
  approval_code: '123456',
  acquirer_code: '0',
  transaction_type: '1',
  transaction_description: 'Initial subscription transaction',
  transaction_description_hr: 'Početna transakcija pretplate',
  transaction_description_sr: 'Početna transakcija pretplate',
  transaction_description_cyr: 'Почетна трансакција претплате',
  additional_order_number: '',
  subscription_exp_date: '2030-12-31 00:00:00.0',
  account_id: '1234567'
}
Status: authorized
Amount: 10000 // this is 100 EUR
```
See more about **transaction descriptions** [here](#possible-transaction-type-values)

### Complete Transaction & Complete Subscription

In order for funds to be transfered, you need to complete transactions. In order to be able to complete a transaction, you need to create it with **require_complete = true**.
```javascript
# regular transaction
const result = await corvusComplete(
        "store_id",
        "order_number",
        {
          certPath: './corvus-pay/CorvusPay.crt.pem',
          keyPath: './corvus-pay/CorvusPay.key.pem',
          
        }
);

#subscription
const result = await corvusCompleteSubscription(
        "store_id",
        "order_number",
        "account_id",
        {
          certPath: './corvus-pay/CorvusPay.crt.pem',
          keyPath: './corvus-pay/CorvusPay.key.pem',
          
        }
);
```

### Charge Next Subscription Payment

```javascript
# same amount
const result = await corvusNextSubPayment(
    '123',                    // storeId
    'order_123456',          // orderNumber (must be new each time)
    '12345678912345678912',  // accountId (22 chars)
    {
      certPath: '/path/to/certificate.pem',
      keyPath: '/path/to/private.key',
      key: 'your_secret_key',              // optional
      apiUrl: 'https://testcps.corvus.hr', // optional
      cart: '2x SnowMaster 3000'           // optional
    }
);

# different amount
const result = await corvusNextSubPaymentWithAmount(
    '123',                    // storeId
    'order_123456',          // orderNumber (must be new each time)
    '12345678912345678912',  // accountId (22 chars)
    '100.00',                // newAmount
    'EUR',                   // currency (ISO 4217)
    {
      certPath: '/path/to/certificate.pem',
      keyPath: '/path/to/private.key',
      cart: '2x SnowMaster 3000 (Updated Price)' // optional
    }
);

```

### Refund Usage

Refund is similar to GET transaction status regarding security:
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

import { CorvusFormFields, generateCorvusSignature } from "corvuspay";

export async function generateCorvusSignatureServer(fields: CorvusFormFields) {
    //uses CORVUS_SECRET_KEY in .env
    const signature = await generateCorvusSignature(fields);
    return signature;
}
```

### Possible transaction type values

| Value | EN Description                     | HR Description                               | SR Description                                | CYR Description                                  |
|-------|-------------------------------------|-----------------------------------------------|------------------------------------------------|--------------------------------------------------|
| 0     | Regular transaction                 | Redovna transakcija                          | Redovna transakcija                            | Редовна трансакција                              |
| 1     | Initial subscription transaction    | Početna transakcija pretplate                | Početna transakcija pretplate                  | Почетна трансакција претплате                    |
| 2     | Next subscription                   | Sljedeća pretplata                           | Sledeća pretplata                              | Следећа претплата                                |
| 3     | Saving a card for CardStorage       | Spremanje kartice za CardStorage             | Čuvanje kartice za CardStorage                 | Чување картице за CardStorage                    |
| 4     | Using a card from CardStorage       | Korištenje kartice iz CardStorage            | Korišćenje kartice iz CardStorage              | Коришћење картице из CardStorage                |
| 5     | Saving a card for Corvus Wallet     | Spremanje kartice za Corvus Wallet           | Čuvanje kartice za Corvus Wallet               | Чување картице за Corvus Wallet                  |
| 6     | Using a card from Corvus Wallet     | Korištenje kartice iz Corvus Wallet          | Korišćenje kartice iz Corvus Wallet            | Коришћење картице из Corvus Wallet              |
| 7     | Saving a card during fast registration | Spremanje kartice tijekom brze registracije | Čuvanje kartice tokom brze registracije        | Чување картице током брзе регистрације          |
| 8     | PIS transaction                     | PIS transakcija                              | PIS transakcija                                | PIS трансакција                                  |
| 9     | PIS transaction from Corvus Wallet  | PIS transakcija iz Corvus Wallet             | PIS transakcija iz Corvus Wallet               | PIS трансакција из Corvus Wallet                |
| 10    | paysafecard                         | paysafecard                                  | paysafecard                                    | paysafecard                                      |
| 11    | Virtual Terminal                    | Virtualni terminal                           | Virtuelni terminal                             | Виртуелни терминал                               |
| 12    | POS transaction                     | POS transakcija                              | POS transakcija                                | POS трансакција                                  |
| 13    | QR Code transaction                 | QR kod transakcija                           | QR kod transakcija                             | QR код трансакција                               |
| 14    | Mobile Wallet transaction           | Mobilni novčanik transakcija                 | Mobilni novčanik transakcija                   | Мобилни новчаник трансакција                    |
| 15    | Crypto transaction                  | Kripto transakcija                           | Kripto transakcija                             | Крипто трансакција                               |
| 16    | Google Pay transaction              | Google Pay transakcija                       | Google Pay transakcija                         | Google Pay трансакција                           |
| 17    | Apple Pay transaction               | Apple Pay transakcija                        | Apple Pay transakcija                          | Apple Pay трансакција                            |
| 18    | IPS transaction                     | IPS transakcija                              | IPS transakcija                                | IPS трансакција                                  |
