/**
 * Fallback ambient declaration so the build passes before `npm install` brings
 * in the real `@types/pdfkit`. Once installed, the package's own types take
 * precedence over this file in node_modules resolution.
 */
declare module 'pdfkit' {
  const PDFDocument: any;
  export default PDFDocument;
}

declare namespace PDFKit {
  type PDFDocument = any;
}
