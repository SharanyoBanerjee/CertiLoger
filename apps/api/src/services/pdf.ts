import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import { env } from '../config/env.js';

export interface CertificatePDFData {
  certificateId: string;
  institutionName: string;
  holderName: string;
  qualification: string;
  grade?: string;
  issuedAt: Date;
  expiresAt?: Date;
}

export async function generateCertificatePDF(data: CertificatePDFData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const margin = 56.69; // 20mm

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const navy = rgb(0.043, 0.122, 0.227); // #0B1F3A
  const lightGray = rgb(0.85, 0.87, 0.9);
  const darkGray = rgb(0.067, 0.094, 0.153);

  // Institution name
  page.drawText(data.institutionName, {
    x: margin,
    y: height - margin - 40,
    size: 22,
    font: fontBold,
    color: navy,
  });

  // Divider line
  page.drawLine({
    start: { x: margin, y: height - margin - 55 },
    end: { x: width - margin, y: height - margin - 55 },
    thickness: 1,
    color: lightGray,
  });

  // Certificate title
  page.drawText('CERTIFICATE OF COMPLETION', {
    x: margin,
    y: height - margin - 100,
    size: 18,
    font: fontBold,
    color: navy,
  });

  // Body text
  page.drawText('This is to certify that', {
    x: margin,
    y: height - margin - 150,
    size: 12,
    font,
    color: darkGray,
  });

  // Holder name
  page.drawText(data.holderName, {
    x: margin,
    y: height - margin - 180,
    size: 26,
    font: fontBold,
    color: darkGray,
  });

  // Qualification
  page.drawText(`has completed ${data.qualification}`, {
    x: margin,
    y: height - margin - 220,
    size: 12,
    font,
    color: darkGray,
  });

  // Grade and date
  const gradeText = data.grade ? `Grade: ${data.grade}  •  ` : '';
  const issuedText = `${gradeText}${data.issuedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
  page.drawText(issuedText, {
    x: margin,
    y: height - margin - 250,
    size: 11,
    font,
    color: darkGray,
  });

  // Certificate ID
  page.drawText(`Certificate ID: ${data.certificateId}`, {
    x: margin,
    y: height - margin - 300,
    size: 9,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  // QR code
  const verifyUrl = `${env.BASE_URL}/verify/${data.certificateId}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 120,
    margin: 1,
    color: { dark: '#0B1F3A', light: '#FFFFFF' },
  });

  const base64Data = qrDataUrl.split(',')[1];
  if (!base64Data) throw new Error('Failed to generate QR code');
  const qrImage = await pdfDoc.embedPng(base64Data);
  const qrDims = qrImage.scale(0.5);
  const qrX = width - margin - 120;
  const qrY = height - margin - 260;
  page.drawImage(qrImage, {
    x: qrX,
    y: qrY,
    width: qrDims.width,
    height: qrDims.height,
  });

  // Verify URL text
  page.drawText('Verify at:', {
    x: width - margin - 120,
    y: height - margin - 285,
    size: 9,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });
  page.drawText(verifyUrl, {
    x: width - margin - 120,
    y: height - margin - 298,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Prototype notice
  page.drawText('Academic prototype. Fictional data.', {
    x: margin,
    y: margin + 20,
    size: 8,
    font,
    color: rgb(0.6, 0.6, 0.6),
  });

  // Bottom border
  page.drawLine({
    start: { x: margin, y: margin + 35 },
    end: { x: width - margin, y: margin + 35 },
    thickness: 0.5,
    color: lightGray,
  });

  return pdfDoc.save();
}
