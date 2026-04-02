import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

export function decodePdfFile(file) {
  if (!file || typeof file !== 'object') {
    const error = new Error('PDF file payload is required.');
    error.statusCode = 400;
    throw error;
  }

  if (!file.contentBase64 || typeof file.contentBase64 !== 'string') {
    const error = new Error('PDF file content is required.');
    error.statusCode = 400;
    throw error;
  }

  const buffer = Buffer.from(file.contentBase64, 'base64');

  if (!buffer.length) {
    const error = new Error('PDF file content is invalid.');
    error.statusCode = 400;
    throw error;
  }

  return buffer;
}

export async function parsePdfBuffer(buffer) {
  const parsedPdf = await pdfParse(buffer);

  return {
    text: parsedPdf.text?.trim() || '',
    pageCount: parsedPdf.numpages || 0
  };
}
