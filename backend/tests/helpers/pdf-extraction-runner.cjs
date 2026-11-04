/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const { extractPdfText } = require('../../src/services/pdf.service.ts');

function printResult(result) {
  process.stdout.write(`PDF_RESULT:${JSON.stringify(result)}\n`);
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  input += chunk;
});
process.stdin.on('end', async () => {
  try {
    const result = await extractPdfText(Buffer.from(input.trim(), 'base64'));
    printResult({ ok: true, result });
  } catch (error) {
    printResult({
      ok: false,
      error: {
        name: error?.name ?? 'Error',
        code: error?.code,
        message: error?.message,
      },
    });
  }
});
