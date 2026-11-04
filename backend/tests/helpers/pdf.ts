/**
 * Test fixtures.
 *
 * SAMPLE_CONTRACT_PDF_BASE64 is a small, valid, single-page PDF with a real
 * text layer, generated once and embedded so the suite needs no PDF toolchain.
 */
const SAMPLE_CONTRACT_PDF_BASE64 =
  'JVBERi0xLjMKJenr8b8KMSAwIG9iago8PAovQ291bnQgMQovS2lkcyBbMyAwIFJdCi9NZWRpYUJv' +
  'eCBbMCAwIDU5NS4yOCA4NDEuODldCi9UeXBlIC9QYWdlcwo+PgplbmRvYmoKMiAwIG9iago8PAov' +
  'T3BlbkFjdGlvbiBbMyAwIFIgL0ZpdEggbnVsbF0KL1BhZ2VMYXlvdXQgL09uZUNvbHVtbgovUGFn' +
  'ZXMgMSAwIFIKL1R5cGUgL0NhdGFsb2cKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL0NvbnRlbnRzIDQg' +
  'MCBSCi9QYXJlbnQgMSAwIFIKL1Jlc291cmNlcyA2IDAgUgovVHlwZSAvUGFnZQo+PgplbmRvYmoK' +
  'NCAwIG9iago8PAovRmlsdGVyIC9GbGF0ZURlY29kZQovTGVuZ3RoIDI3NQo+PgpzdHJlYW0KeJxV' +
  'kDtTwzAQhHv/ii2dRviBHykDEwo6Bs3QpBHxJRYjS0a+xPjfIzs8kkLF3a12v7sMz1Eiigpj9CBx' +
  '95QizUSSQB6wldEnQjNPRVqjWteiDP0GqajqFHJELFvC66nvjSaPoVXGoCGjz6FSGL1mJgtPvfMM' +
  'duAgfzwN7LogILVv0TnLrYC8Hlx8ejWtID8CBF5uMKpCrPMLxn1WLhiLlbZnp/eEUXOrbcjSnifs' +
  '4jzZrdCoaYA7BJY96Z4FtkEVsno1izo1gcl32iqm+eeAzdETdWQZzmLQX3xF889S5CIrZpZ4F5d/' +
  'Ob+LW8cBaN7uxjAURxdOZKnB+7Qcxahxwdvao1G2wfzelKFB/KRG32sNhAkKZW5kc3RyZWFtCmVu' +
  'ZG9iago1IDAgb2JqCjw8Ci9CYXNlRm9udCAvSGVsdmV0aWNhCi9FbmNvZGluZyAvV2luQW5zaUVu' +
  'Y29kaW5nCi9TdWJ0eXBlIC9UeXBlMQovVHlwZSAvRm9udAo+PgplbmRvYmoKNiAwIG9iago8PAov' +
  'Rm9udCA8PC9GMSA1IDAgUj4+Ci9Qcm9jU2V0IFsvUERGIC9UZXh0IC9JbWFnZUIgL0ltYWdlQyAv' +
  'SW1hZ2VJXQo+PgplbmRvYmoKNyAwIG9iago8PAovQ3JlYXRpb25EYXRlIChEOjIwMjYwOTIwMTAx' +
  'MjQ1WikKPj4KZW5kb2JqCnhyZWYKMCA4CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNSAw' +
  'MDAwMCBuIAowMDAwMDAwMTAyIDAwMDAwIG4gCjAwMDAwMDAyMDUgMDAwMDAgbiAKMDAwMDAwMDI4' +
  'NSAwMDAwMCBuIAowMDAwMDAwNjMyIDAwMDAwIG4gCjAwMDAwMDA3MjkgMDAwMDAgbiAKMDAwMDAw' +
  'MDgxNiAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDgKL1Jvb3QgMiAwIFIKL0luZm8gNyAwIFIK' +
  'L0lEIFs8NzJDMThFMTI1RkQ0MTVBRDEyMTBBM0ZBMzM0MDgwNDM+PDcyQzE4RTEyNUZENDE1QUQx' +
  'MjEwQTNGQTMzNDA4MDQzPl0KPj4Kc3RhcnR4cmVmCjg3MQolJUVPRgo=';

/** A valid PDF containing readable contract-like text. */
export function buildTestPdf(): Buffer {
  return Buffer.from(SAMPLE_CONTRACT_PDF_BASE64, 'base64');
}

/** Valid PDF header, but the body is garbage - extraction must fail cleanly. */
export const CORRUPT_PDF = Buffer.concat([
  Buffer.from('%PDF-1.4\n', 'ascii'),
  Buffer.from('this is not a real pdf body', 'ascii'),
]);

/** Not a PDF at all - must be rejected before any parsing is attempted. */
export const NOT_A_PDF = Buffer.from('This is plain text pretending to be a PDF.', 'utf8');
