import JsBarcode from "jsbarcode";
import { DOMImplementation, XMLSerializer } from "@xmldom/xmldom";

// Sunucuda DOM yok; jsbarcode'a xmldom ile sahte bir SVG document veriyoruz.
export function barcodeDataUrl(value: number | string) {
  const doc = new DOMImplementation().createDocument("http://www.w3.org/1999/xhtml", "html", null);
  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");

  JsBarcode(svg as unknown as SVGElement, String(value), {
    xmlDocument: doc as unknown as XMLDocument,
    format: "CODE128",
    width: 3,
    height: 90,
    // Code128 standardı her iki yanda en az 10 modül boşluk (quiet zone) ister: 10 × width.
    // Dar olursa okuyucu yandaki görüntüyü barkodun parçası sanıp yanlış okur.
    margin: 30,
    displayValue: true, // okunabilir sayıyı barkodun altına basar
    fontSize: 18,
  });

  const text = new XMLSerializer().serializeToString(svg);
  return `data:image/svg+xml;base64,${Buffer.from(text).toString("base64")}`;
}
