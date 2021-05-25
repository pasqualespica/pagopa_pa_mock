import { ctFaultBean_type_pafn } from "../generated/paForNode_Service/ctFaultBean_type_pafn";
import { stAmount_type_pafn } from "../generated/paForNode_Service/stAmount_type_pafn";
import { stFiscalCodePA_type_pafn } from "../generated/paForNode_Service/stFiscalCodePA_type_pafn";
import { stTransferType_type_pafn } from "../generated/paForNode_Service/stTransferType_type_pafn";

export type MockResponse = readonly [number, string];

interface IVerifyRequest {
  outcome: "OK" | "KO";
  fiscalCodePA?: stFiscalCodePA_type_pafn;
  transferType?: stTransferType_type_pafn;
  fault?: ctFaultBean_type_pafn;
  amount?: stAmount_type_pafn;
}

interface IActivateRequest {
  outcome: "OK" | "KO";
  creditorReferenceId?: string;
  fiscalCodePA?: stFiscalCodePA_type_pafn;
  transferType?: stTransferType_type_pafn;
  fault?: ctFaultBean_type_pafn;
  amount?: stAmount_type_pafn;
  description?: string;
  iban_1?: string;
  iban_2?: string;
  remittanceInformation1Bollettino?: string;
  remittanceInformation2Bollettino?: string;
}

interface IRTRequest {
  outcome: "OK" | "KO";
}

export const paVerifyPaymentNoticeRes = (
  params: IVerifyRequest
): MockResponse => [
  200,
  `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:paf="http://pagopa-api.pagopa.gov.it/pa/paForNode.xsd">
  <soapenv:Header />
  <soapenv:Body>
    <paf:paVerifyPaymentNoticeRes>
      <outcome>${params.outcome}</outcome>
      ${
        params.fiscalCodePA
          ? // tslint:disable-next-line: no-nested-template-literals
            `<paymentList>
        <paymentOptionDescription>
          <amount>${params.amount?.toFixed(2)}</amount>
          <options>EQ</options>
          <dueDate>2021-07-31</dueDate>
          <detailDescription>pagamentoTest</detailDescription>
          <allCCP>${params.transferType ? "true" : "false"}</allCCP>
        </paymentOptionDescription>
      </paymentList>
      <paymentDescription>Pagamento di Test</paymentDescription>
      <fiscalCodePA>${params.fiscalCodePA}</fiscalCodePA>
      <companyName>companyName</companyName>
      <officeName>officeName</officeName>`
          : ""
      }
      ${
        params.fault
          ? // tslint:disable-next-line: no-nested-template-literals
            `<fault>
        <faultCode>${params.fault.faultCode}</faultCode>
        <faultString>${params.fault.faultString}</faultString>
        <id>${params.fault.id}</id>
        <description>${params.fault.description}</description>
      </fault>`
          : ""
      }
    </paf:paVerifyPaymentNoticeRes>
  </soapenv:Body>
</soapenv:Envelope>`,
];

export const paGetPaymentRes = (params: IActivateRequest): MockResponse => [
         200,
         `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:paf="http://pagopa-api.pagopa.gov.it/pa/paForNode.xsd">
    <soapenv:Header/>
    <soapenv:Body>
        <paf:paGetPaymentRes>
          <outcome>${params.outcome}</outcome>
          ${
            params.fiscalCodePA
              ? // tslint:disable-next-line: no-nested-template-literals
                `<data>
                    <creditorReferenceId>${
                      params.creditorReferenceId
                    }</creditorReferenceId>
                    <paymentAmount>${params.amount?.toFixed(2)}</paymentAmount>
                    <dueDate>2021-07-31</dueDate>
                    <description>${params.description}</description>
                    <companyName>company PA</companyName>
                    <officeName>office PA</officeName>
                    <debtor>
                      <uniqueIdentifier>
                        <entityUniqueIdentifierType>F</entityUniqueIdentifierType>
                        <entityUniqueIdentifierValue>RCCGLD63D14H501F</entityUniqueIdentifierValue>
                      </uniqueIdentifier>
                      <fullName>Riccitelli Gesualdo</fullName>
                      <streetName>stradina Via</streetName>
                      <civicNumber>2</civicNumber>
                      <postalCode>54321</postalCode>
                      <city>borgo</city>
                      <stateProvinceRegion>provincia regione</stateProvinceRegion>
                      <country>IT</country>
                      <e-mail>mail@mail.it</e-mail>
                    </debtor>
                    <transferList>
                      <transfer>
                        <idTransfer>1</idTransfer>
                        <transferAmount>100.00</transferAmount>
                        <fiscalCodePA>77777777777</fiscalCodePA>
                        <IBAN>${params.iban_1}</IBAN>
                        <remittanceInformation>TARI Comune EC_TE${
                          params.remittanceInformation1Bollettino
                        }</remittanceInformation>
                        <transferCategory>0101101IM</transferCategory>
                      </transfer>
                      ${
                        params.iban_2
                          ? `<transfer>
                        <idTransfer>2</idTransfer>
                        <transferAmount>20.00</transferAmount>
                        <fiscalCodePA>01199250158</fiscalCodePA>
                        <IBAN>${params.iban_2}</IBAN>
                        <remittanceInformation>TEFA Comune Milano${params.remittanceInformation2Bollettino}</remittanceInformation>
                        <transferCategory>0201102IM</transferCategory>
                      </transfer>`
                          : ""
                      }
                    </transferList>
                  </data>`
              : ""
          }
          ${
            params.fault
              ? // tslint:disable-next-line: no-nested-template-literals
                `<fault>
            <faultCode>${params.fault.faultCode}</faultCode>
            <faultString>${params.fault.faultString}</faultString>
            <id>${params.fault.id}</id>
            <description>${params.fault.description}</description>
          </fault>`
              : ""
          }
      </paf:paGetPaymentRes>
    </soapenv:Body>
  </soapenv:Envelope>`,
       ];

export const paSendRtRes = (params: IRTRequest): MockResponse => [
  200,
  `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:paf="http://pagopa-api.pagopa.gov.it/pa/paForNode.xsd">
    <soapenv:Header/>
    <soapenv:Body>
        <paf:paSendRTRes>
          <outcome>${params.outcome}</outcome>
      </paf:paSendRTRes>
    </soapenv:Body>
  </soapenv:Envelope>`,
];
