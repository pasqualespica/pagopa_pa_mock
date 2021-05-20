/**
 * Common configurations for Proxy PagoPA and external resources
 */

import * as dotenv from "dotenv";
import * as t from "io-ts";
import { NonEmptyString } from "italia-ts-commons/lib/strings";

dotenv.config();

const localhost = "localhost";

export const CONFIG = {
  // The log level used for Winston logger (error, info, debug)
  WINSTON_LOG_LEVEL: process.env.WINSTON_LOG_LEVEL || "debug",

  // RESTful Webservice configuration
  // These information are documented here:
  // https://docs.google.com/document/d/1Qqe6mSfon-blHzc-ldeEHmzIkVaElKY5LtDnKiLbk80/edit
  // Used to expose services
  PA_MOCK: {
    HOST: process.env.PAGOPA_NODO_HOST || localhost,
    PORT: process.env.PORT || 8089,
    // SHA256 client certificate fingerprint (without `:` separators)
    ROUTES: {
      PPT_NODO: "/mockPagamentiTelematiciCCP",
    },
  },
};

// Configuration validator - Define configuration types and interfaces
const ServerConfiguration = t.interface({
  HOST: NonEmptyString,
  // We allow t.string to use socket pipe address in Azure App Services
  PORT: t.any,
});
export type ServerConfiguration = t.TypeOf<typeof ServerConfiguration>;

const NodoMockConfig = t.intersection([
  ServerConfiguration,
  t.interface({
    ROUTES: t.interface({
      PPT_NODO: NonEmptyString,
    }),
  }),
  t.partial({
    CLIENT_CERTIFICATE_FINGERPRINT: NonEmptyString,
  }),
]);
export type NodoMockConfig = t.TypeOf<typeof NodoMockConfig>;

export const WinstonLogLevel = t.keyof({
  debug: 4,
  error: 0,
  info: 2,
});
export type WinstonLogLevel = t.TypeOf<typeof WinstonLogLevel>;

export const Configuration = t.interface({
  PA_MOCK: NodoMockConfig,
  WINSTON_LOG_LEVEL: WinstonLogLevel,
});
export type Configuration = t.TypeOf<typeof Configuration>;
