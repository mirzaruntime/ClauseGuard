import express from 'express';
import request from 'supertest';
import { uploadContractFile, UPLOAD_FIELD_NAME } from '../../src/middleware/upload';
import { errorHandler } from '../../src/middleware/errorHandler';
import { assertPdfBuffer } from '../../src/services/document.service';
import { buildTestPdf, NOT_A_PDF } from '../helpers/pdf';

/**
 * Exercises the real upload middleware in isolation, so file validation is
 * covered without needing an authenticated session or a database.
 */
function buildUploadApp() {
  const app = express();
  app.post('/upload', uploadContractFile, (req, res) => {
    if (!req.file) {
      res.status(400).json({ success: false, code: 'FILE_REQUIRED' });
      return;
    }
    // Content-based check that runs after multer's declared-type filter.
    assertPdfBuffer(req.file.buffer);
    res.status(200).json({ success: true, data: { size: req.file.size } });
  });
  app.use(errorHandler);
  return app;
}

const app = buildUploadApp();

describe('contract upload validation', () => {
  it('accepts a genuine PDF', async () => {
    const response = await request(app)
      .post('/upload')
      .attach(UPLOAD_FIELD_NAME, buildTestPdf(), {
        filename: 'agreement.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('rejects a file with a non-PDF content type', async () => {
    const response = await request(app)
      .post('/upload')
      .attach(UPLOAD_FIELD_NAME, Buffer.from('id,name\n1,a'), {
        filename: 'data.csv',
        contentType: 'text/csv',
      });

    expect(response.status).toBe(415);
    expect(response.body.code).toBe('UNSUPPORTED_FILE_TYPE');
  });

  it('rejects a non-PDF extension even when the content type is spoofed', async () => {
    const response = await request(app)
      .post('/upload')
      .attach(UPLOAD_FIELD_NAME, buildTestPdf(), {
        filename: 'payload.exe',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(415);
    expect(response.body.code).toBe('UNSUPPORTED_FILE_EXTENSION');
  });

  it('rejects a file whose bytes are not a PDF despite a .pdf name', async () => {
    const response = await request(app)
      .post('/upload')
      .attach(UPLOAD_FIELD_NAME, NOT_A_PDF, {
        filename: 'fake.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(415);
    expect(response.body.code).toBe('INVALID_PDF_SIGNATURE');
  });

  it('rejects an unexpected file field name', async () => {
    const response = await request(app)
      .post('/upload')
      .attach('somethingElse', buildTestPdf(), {
        filename: 'agreement.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('UNEXPECTED_FILE_FIELD');
  });

  it('rejects a request with no file at all', async () => {
    const response = await request(app).post('/upload');
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('FILE_REQUIRED');
  });
});
