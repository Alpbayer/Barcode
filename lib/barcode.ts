import JsBarcode from "jsbarcode";
import { DOMImplementation, XMLSerializer } from "@xmldom/xmldom";

// There's no DOM on the server; give jsbarcode a fake SVG document via xmldom.
export function barcodeDataUrl(value: number | string) {
  const doc = new DOMImplementation().createDocument("http://www.w3.org/1999/xhtml", "html", null);
  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");

  JsBarcode(svg as unknown as SVGElement, String(value), {
    xmlDocument: doc as unknown as XMLDocument,
    format: "CODE128",
    width: 3,
    height: 90,
    // The Code128 spec requires a quiet zone of at least 10 modules on each side: 10 × width.
    // If it's narrower, scanners mistake nearby content for part of the barcode and misread.
    margin: 30,
    displayValue: true, // prints the human-readable number under the barcode
    fontSize: 18,
  });

  const text = new XMLSerializer().serializeToString(svg);
  return `data:image/svg+xml;base64,${Buffer.from(text).toString("base64")}`;
}
