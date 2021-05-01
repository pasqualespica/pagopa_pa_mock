import * as express from "express";
import * as bodyParserXml from "express-xml-bodyparser";
import * as morgan from "morgan";
import { Configuration } from "./config";
import {
  paGetPaymentRes,
  paVerifyPaymentNoticeRes,
} from "./fixtures/nodoNewMod3Responses";
import { StTransferType_type_pafnEnum } from "./generated/paForNode_Service/stTransferType_type_pafn";
import { logger } from "./utils/logger";

const verifySoapRequest = "pafn:paverifypaymentnoticereq";
const activateSoapRequest = "pafn:pagetpaymentreq";

const avviso1 = new RegExp("^30200.*");
const avviso2 = new RegExp("^30201.*");
const avviso3 = new RegExp("^30202.*");
const avviso4 = new RegExp("^30203.*");
// const avviso5 = new RegExp("^30101.*");

export async function newExpressApp(
  config: Configuration
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
          avviso4.test(noticenumber);

        if (!isValidNotice) {
          // error case
          const paVerifyPaymentNoticeResponse = paVerifyPaymentNoticeRes({
            outcome: "KO",
            fault: {
              faultCode: "PAA_PAGAMENTO_SCONOSCIUTO",
              faultString: "numero avviso devo inziare con 3020[0|1|2|3]",
              id: "PAGOPA_MOCK",
            },
          });

          return res
            .status(paVerifyPaymentNoticeResponse[0])
            .send(paVerifyPaymentNoticeResponse[1]);
        } else {
          // happy case
          const paVerifyPaymentNoticeResponse = paVerifyPaymentNoticeRes({
            outcome: "OK",
            fiscalCodePA: fiscalcode,
            transferType: avviso1.test(noticenumber)
              ? StTransferType_type_pafnEnum.POSTAL
              : undefined,
          });

          logger.info(
            `>>> tx RESPONSE [${paVerifyPaymentNoticeResponse[0]}]: `
          );
          logger.info(paVerifyPaymentNoticeResponse[1]);

          return res
            .status(paVerifyPaymentNoticeResponse[0])
            .send(paVerifyPaymentNoticeResponse[1]);
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
          avviso4.test(noticenumber);

        if (!isValidNotice) {
          // error case
          const paGetPaymentResponse = paGetPaymentRes({
            outcome: "KO",
            fault: {
              faultCode: "PAA_PAGAMENTO_SCONOSCIUTO",
              faultString: "numero avviso devo inziare con 3020[0|1|2|3]",
              id: "PAGOPA_MOCK",
            },
          });

          return res
            .status(paGetPaymentResponse[0])
            .send(paGetPaymentResponse[1]);
        } else {
          // happy case

          // retrive 0,1,2,3 from noticenumber
          const idIbanAvviso: number = +noticenumber[0].substring(4, 5);
          let iban1;
          let iban2;

          switch (idIbanAvviso) {
            case 0:
              iban1 = "IT57N0760114800000011050036";
              iban2 = "IT21Q0760101600000000546200";
              break;
            case 1:
              iban1 = "IT57N0760114800000011050036";
              iban2 = "IT15V0306901783100000300001";
              break;
            case 2:
              iban1 = "IT30N0103076271000001823603";
              iban2 = "IT21Q0760101600000000546200";
              break;
            case 3:
              iban1 = "IT30N0103076271000001823603";
              iban2 = "IT15V0306901783100000300001";
              break;
            default:
              // The SOAP Request not implemented
              res.status(404).send("Not found iban");
          }

          const paGetPaymentResponse = paGetPaymentRes({
            outcome: "OK",
            fiscalCodePA: fiscalcode,
            creditorReferenceId,
            IBAN_1: iban1,
            IBAN_2: iban2,
          });

          logger.info(`>>> tx RESPONSE [${paGetPaymentResponse[0]}]: `);
          logger.info(paGetPaymentResponse[1]);

          return res
            .status(paGetPaymentResponse[0])
            .send(paGetPaymentResponse[1]);
        }
      }

      // The SOAP Request not implemented
      res.status(404).send("Not found");
    } catch (error) {
      // The SOAP Request isnt' correct
      res.status(500).send("Internal Server Error :( ");
    }
  });
  return app;
}
