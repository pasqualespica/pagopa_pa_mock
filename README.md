# pagopa-pa-mock

A mock implementation of PA pagoPA service

## Usage

```sh
yarn install
yarn build
yarn start
```

## Environment

| name                 | description                   | default            |
| -------------------- | ----------------------------- | ------------------ |
| WINSTON_LOG_LEVEL    | desired log level             | "debug"            |
| PAGOPA_NODO_HOST     | host this server listens to   | "http://localhost" |
| PORT                 | host this server listens to   | 3000               |
| PAGOPA_PROXY_HOST    | PagoPa Proxy host             | localhost          |
| PAGOPA_NODO_PASSWORD | nodo mock auth password       | password           |
| PAGOPA_PROXY_PORT    | PagoPa Proxy port             | 3001               |
| PAGOPA_WS_URI        | PagoPa Proxy SOAP service URI | `/FespCdService`   |

# Functionalities

The following functionalites are available (EC Side)
- *paVerifyPaymentNotice*
- *paGetPayment*

These mock functionalities allows the PSP to invoke all the payment steps
- *verifyPaymentNotice* or *verificaBollettino*
- *activatePaymentNotice* 
- *sendPaymentOutcome*

## Tribute description
The tribute is 120 EUR divided in 2 transfer: 

- Transfer 1 : TARI, 100€ due to **EC_TE**

- Transfer 2 : TEFA, 20€ due to **Comune di Milano**

With this mock are modelled both multibeneficiary notice (comprehensive of TARI and TEFA) monobeneficiary notice (only TARI) 

## Configurations

Both EC have at their disposl a bank IBAN and a postal IBAN.
Based on notice number the mock will reply with a certain configuration of the tribute.


| Notice number       | CC EC_TE | CC Comune di Milano| Notes                           |
|---------------------|----------|--------------------|---------------------------------|
|302**00**xxxxxxxxxxx | CCPost   | CCPost             | multibeneficiary (TARI + TEFA) |
|302**01**xxxxxxxxxxx | CCPost   | CCBank             | multibeneficiary (TARI + TEFA) |
|302**02**xxxxxxxxxxx | CCBank   | CCPost             | multibeneficiary (TARI + TEFA) |
|302**03**xxxxxxxxxxx | CCBank   | CCBank             | multibeneficiary (TARI + TEFA) |
|302**04**xxxxxxxxxxx | CCPost   | n.a.               | monobeneficiary (TARI)         |
|302**05**xxxxxxxxxxx | CCBank   | n.a.               | monobeneficiary (TARI)         |


The following edge cases are available (stateless, based on notice number)

| Notice number       | Description                            |
|---------------------|----------------------------------------|
|302**99**xxxxxxxxxxx | Payment expired                        |
|302**YY**xxxxxxxxxxx | Payment unknown                        |

**_NOTE:_**  YY: every code not mentioned before -> from 06 to 98