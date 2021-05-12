import * as express from "express";
import * as bodyParserXml from "express-xml-bodyparser";
import * as morgan from "morgan";
import { Configuration } from "./config";
import {
  MockResponse,
  paGetPaymentRes,
  paSendRtRes,
  paVerifyPaymentNoticeRes,
} from "./fixtures/nodoNewMod3Responses";
import { StTransferType_type_pafnEnum } from "./generated/paForNode_Service/stTransferType_type_pafn";
import {
  PAA_PAGAMENTO_DUPLICATO,
  PAA_PAGAMENTO_IN_CORSO,
  PAA_PAGAMENTO_SCADUTO,
  PAA_PAGAMENTO_SCONOSCIUTO,
  POSITIONS_STATUS,
} from "./utils/helper";
import { logger } from "./utils/logger";

const faultId = "77777777777";

const CCPostPrimaryEC = "IT57N0760114800000011050036";
const CCBankPrimaryEC = "IT30N0103076271000001823603";
const CCPostSecondaryEC = "IT21Q0760101600000000546200";
const CCBankSecondaryEC = "IT15V0306901783100000300001";

const verifySoapRequest = "pafn:paverifypaymentnoticereq";
const activateSoapRequest = "pafn:pagetpaymentreq";
const sentReceipt = "pafn:pasendrtreq";

const avviso1 = new RegExp("^30200.*"); // CCPost + CCPost
const avviso2 = new RegExp("^30201.*"); // CCPost + CCBank
const avviso3 = new RegExp("^30202.*"); // CCBank + CCPost
const avviso4 = new RegExp("^30203.*"); // CCBank + CCBank
const avviso5 = new RegExp("^30204.*"); // CCPost - Monobeneficiario
const avviso6 = new RegExp("^30205.*"); // CCBank - Monobeneficiario
const avvisoScaduto = new RegExp("^30299.*"); // PAA_PAGAMENTO_SCADUTO

const amount1 = 100.0;
const amount2 = 20.0;

const descriptionAll = "TARI/TEFA 2021";
const descriptionMono = "TARI 2021";

function log_event_tx(resp: MockResponse) {
  logger.info(`>>> tx RESPONSE [${resp[0]}]: `);
  logger.info(resp[1]);
}

export async function newExpressApp(
  config: Configuration,
  db: Map<string, POSITIONS_STATUS>
): Promise<Express.Application> {
  const app = express();
  app.set("port", config.NODO_MOCK.PORT);
  const loggerFormat =
    ":date[iso] [info]: :method :url :status - :response-time ms";
  app.use(morgan(loggerFormat));

  app.use(express.json());
  app.use(express.urlencoded());
  app.use(bodyParserXml({}));

  logger.info(`Path ${config.NODO_MOCK.ROUTES.PPT_NODO} ...`);
  // SOAP Server mock entrypoint
  app.post(config.NODO_MOCK.ROUTES.PPT_NODO, async (req, res) => {
    logger.info(`>>> rx REQUEST :`);
    logger.info(JSON.stringify(req.body));
    try {
      const soapRequest = req.body["soapenv:envelope"]["soapenv:body"][0];
      // 1. paVerifyPaymentNotice
      if (soapRequest[verifySoapRequest]) {
        const paVerifyPaymentNotice = soapRequest[verifySoapRequest][0];
        const fiscalcode = paVerifyPaymentNotice.qrcode[0].fiscalcode;
        const noticenumber = paVerifyPaymentNotice.qrcode[0].noticenumber;
        const isValidNotice =
          avviso1.test(noticenumber) ||
          avviso2.test(noticenumber) ||
          avviso3.test(noticenumber) ||
          avviso4.test(noticenumber) ||
          avviso5.test(noticenumber) ||
          avviso6.test(noticenumber);
        const isExpiredNotice = avvisoScaduto.test(noticenumber);

        if (!isValidNotice && !isExpiredNotice) {
          // error case PAA_PAGAMENTO_SCONOSCIUTO
          const paVerifyPaymentNoticeResponse = paVerifyPaymentNoticeRes({
            outcome: "KO",
            fault: {
              faultCode: PAA_PAGAMENTO_SCONOSCIUTO.value,
              faultString: "numero avviso devo inziare con 3020[0|1|2|3]",
              id: faultId,
            },
          });

          log_event_tx(paVerifyPaymentNoticeResponse);
          return res
            .status(paVerifyPaymentNoticeResponse[0])
            .send(paVerifyPaymentNoticeResponse[1]);
        } else if (isExpiredNotice) {
          // error case PAA_PAGAMENTO_SCADUTO
          const paVerifyPaymentNoticeResponse = paVerifyPaymentNoticeRes({
            outcome: "KO",
            fault: {
              faultCode: PAA_PAGAMENTO_SCADUTO.value,
              faultString: `il numero avviso ${noticenumber} e' scaduto`,
              id: faultId,
            },
          });

          log_event_tx(paVerifyPaymentNoticeResponse);
          return res
            .status(paVerifyPaymentNoticeResponse[0])
            .send(paVerifyPaymentNoticeResponse[1]);
        } else {
          const b = db.get(noticenumber[0]);
          if (b) {
            // già esiste
            // error case PAA_PAGAMENTO_IN_CORSO
            const paVerifyPaymentNoticeResponse = paVerifyPaymentNoticeRes({
              outcome: "KO",
              fault: {
                faultCode:
                  b === POSITIONS_STATUS.IN_PROGRESS
                    ? PAA_PAGAMENTO_IN_CORSO.value
                    : b === POSITIONS_STATUS.CLOSE
                    ? PAA_PAGAMENTO_DUPLICATO.value
                    : "_UNDEFINE_",
                faultString: `Errore ${noticenumber}`,
                id: faultId,
              },
            });

            log_event_tx(paVerifyPaymentNoticeResponse);
            return res
              .status(paVerifyPaymentNoticeResponse[0])
              .send(paVerifyPaymentNoticeResponse[1]);
          } else {
            // happy case
            const paVerifyPaymentNoticeResponse = paVerifyPaymentNoticeRes({
              outcome: "OK",
              fiscalCodePA: fiscalcode,
              transferType:
                avviso1.test(noticenumber) || avviso5.test(noticenumber)
                  ? StTransferType_type_pafnEnum.POSTAL
                  : undefined,
              amount:
                avviso5.test(noticenumber) || avviso6.test(noticenumber)
                  ? amount1
                  : amount1 + amount2,
            });

            log_event_tx(paVerifyPaymentNoticeResponse);
            return res
              .status(paVerifyPaymentNoticeResponse[0])
              .send(paVerifyPaymentNoticeResponse[1]);
          }
        }
      }

      // 2. paGetPayment
      if (soapRequest[activateSoapRequest]) {
        const paGetPayment = soapRequest[activateSoapRequest][0];

        const fiscalcode = paGetPayment.qrcode[0].fiscalcode;
        const noticenumber: string = paGetPayment.qrcode[0].noticenumber;
        const creditorReferenceId = noticenumber[0].substring(1);
        // const amount = paGetPayment.amount;
        const isValidNotice =
          avviso1.test(noticenumber) ||
          avviso2.test(noticenumber) ||
          avviso3.test(noticenumber) ||
          avviso4.test(noticenumber) ||
          avviso5.test(noticenumber) ||
          avviso6.test(noticenumber);
        const isExpiredNotice = avvisoScaduto.test(noticenumber);

        if (!isValidNotice && !isExpiredNotice) {
          // error case
          const paGetPaymentResponse = paGetPaymentRes({
            outcome: "KO",
            fault: {
              faultCode: PAA_PAGAMENTO_SCONOSCIUTO.value,
              faultString: "numero avviso devo inziare con 3020[0|1|2|3]",
              id: faultId,
            },
          });

          log_event_tx(paGetPaymentResponse);
          return res
            .status(paGetPaymentResponse[0])
            .send(paGetPaymentResponse[1]);
        } else if (isExpiredNotice) {
          // error case PAA_PAGAMENTO_SCADUTO
          const paGetPaymentResponse = paGetPaymentRes({
            outcome: "KO",
            fault: {
              faultCode: PAA_PAGAMENTO_SCADUTO.value,
              faultString: `il numero avviso ${noticenumber} e' scaduto`,
              id: faultId,
            },
          });

          log_event_tx(paGetPaymentResponse);
          return res
            .status(paGetPaymentResponse[0])
            .send(paGetPaymentResponse[1]);
        } else {
          const b = db.get(noticenumber[0]);
          if (b) {
            // già esiste
            // error case PAA_PAGAMENTO_IN_CORSO
            const paGetPaymentResponse = paGetPaymentRes({
              outcome: "KO",
              fault: {
                faultCode:
                  b === POSITIONS_STATUS.IN_PROGRESS
                    ? PAA_PAGAMENTO_IN_CORSO.value
                    : b === POSITIONS_STATUS.CLOSE
                    ? PAA_PAGAMENTO_DUPLICATO.value
                    : "_UNDEFINE_",
                faultString: `Errore ${noticenumber}`,
                id: faultId,
              },
            });

            log_event_tx(paGetPaymentResponse);
            return res
              .status(paGetPaymentResponse[0])
              .send(paGetPaymentResponse[1]);
          } else {
            // non esiste - la blocco
            db.set(noticenumber[0], POSITIONS_STATUS.CLOSE);
            // happy case

            // retrive 0,1,2,3 from noticenumber
            const idIbanAvviso: number = +noticenumber[0].substring(4, 5);
            let iban1;
            let iban2;
            let remittanceInformation1Bollettino = "";
            let remittanceInformation2Bollettino = "";

            switch (idIbanAvviso) {
              case 0: // CCPost + CCPost
                iban1 = CCPostPrimaryEC;
                iban2 = CCPostSecondaryEC;
                remittanceInformation1Bollettino = " su bollettino";
                remittanceInformation2Bollettino = " su bollettino";
                break;
              case 1: // CCPost + CCBank
                iban1 = CCPostPrimaryEC;
                iban2 = CCBankSecondaryEC;
                remittanceInformation1Bollettino = " su bollettino";
                break;
              case 2: // CCBank + CCPost
                iban1 = CCBankPrimaryEC;
                iban2 = CCPostSecondaryEC;
                remittanceInformation2Bollettino = " su bollettino";
                break;
              case 3: // CCBank + CCBank
                iban1 = CCBankPrimaryEC;
                iban2 = CCBankSecondaryEC;
                break;
              case 4: //CCPost - Monobeneficiario
                iban1 = CCPostPrimaryEC;
                remittanceInformation1Bollettino = " su bollettino";
                break;
              case 5: //CCBank - Monobeneficiario
                iban1 = CCBankPrimaryEC;
                break;
              default:
                // The SOAP Request not implemented
                res.status(404).send("Not found iban");
            }

            const paGetPaymentResponse = paGetPaymentRes({
              outcome: "OK",
              amount:
                avviso5.test(noticenumber) || avviso6.test(noticenumber)
                  ? amount1
                  : amount1 + amount2,
              description:
                avviso5.test(noticenumber) || avviso6.test(noticenumber)
                  ? descriptionMono
                  : descriptionAll,
              fiscalCodePA: fiscalcode,
              creditorReferenceId,
              IBAN_1: iban1,
              IBAN_2: iban2,
              remittanceInformation1Bollettino,
              remittanceInformation2Bollettino,
            });

            log_event_tx(paGetPaymentResponse);
            return res
              .status(paGetPaymentResponse[0])
              .send(paGetPaymentResponse[1]);
          }
        }
      }

      // 3. paSendRT
      if (soapRequest[sentReceipt]) {
        const paSendRT = soapRequest[sentReceipt][0];
        const iuv = paSendRT.receipt[0].creditorreferenceid[0];

        // libero la posizione - cancello
        db.delete(iuv);

        const paSendRTResponse = paSendRtRes({
          outcome: "OK",
        });

        log_event_tx(paSendRTResponse);
        return res.status(paSendRTResponse[0]).send(paSendRTResponse[1]);
      }

      // The SOAP Request not implemented
      logger.info(
        `The SOAP Request ${JSON.stringify(soapRequest)} not implemented`
      );
      res.status(404).send("Not found");
      // tslint:disable-next-line: prettier
    } catch (error) {
      // The SOAP Request isnt' correct
      logger.info(`The SOAP Request isnt' correct`);
      res.status(500).send("Internal Server Error :( ");
    }
    // tslint:disable-next-line: no-empty
  });
  return app;
}
