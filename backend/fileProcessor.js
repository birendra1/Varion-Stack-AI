import xlsx from 'xlsx';
import mammoth from 'mammoth';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

export async function extractTextFromFile(file) {
  const mimeType = file.mimetype;
  const filePath = file.path;

  try {
    if (mimeType === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      return `[Content from PDF: ${file.originalname}]\n${data.text}`;
    } 
    else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || mimeType === 'application/vnd.ms-excel') {
      const workbook = xlsx.readFile(filePath);
      let text = `[Content from Excel: ${file.originalname}]\n`;
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        text += `--- Sheet: ${sheetName} ---\n`;
        text += xlsx.utils.sheet_to_csv(sheet);
      });
      return text;
    }
    else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ path: filePath });
      return `[Content from Word Doc: ${file.originalname}]\n${result.value}`;
    }
    else if (mimeType.startsWith('text/')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        return `[Content from Text File: ${file.originalname}]\n${content}`;
    }
    
    return `[File attached: ${file.originalname} (${mimeType}) - Content extraction not supported for this type]`;
  } catch (error) {
    console.error(`Error extracting text from ${file.originalname}:`, error);
    return `[Error extracting content from ${file.originalname}]`;
  }
}
