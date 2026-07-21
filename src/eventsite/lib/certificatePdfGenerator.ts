import { jsPDF } from 'jspdf';
import type { CertificateTemplate, CertificateLayer } from './certificateTypes';
import { PRESETS } from '../components/CertificateTemplateEditor';

export interface CertificateAttachment {
  filename: string;
  content: string; // base64-encoded PDF content (without data:application/pdf;base64, prefix)
}

export interface ParticipantInfo {
  fullName: string;
  email: string;
  organization?: string;
  role?: string;
  registrationId?: string;
}

/**
 * Generate a PDF certificate from a template and participant data.
 * Uses an off-screen HTML5 Canvas to render the certificate, then wraps it in a PDF.
 */
export async function generateCertificatePDF(
  template: CertificateTemplate,
  eventName: string,
  participant: ParticipantInfo,
  exportScale: number = 2
): Promise<CertificateAttachment> {
  const pngDataUrl = await renderCertificateCanvas(template, eventName, participant, exportScale);
  
  // Convert PNG to PDF using jsPDF
  const orientation = template.orientation === 'portrait' ? 'p' : 'l';
  const pdf = new jsPDF(orientation, 'mm', [210, 297]); // A4
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Add the PNG image to fill the PDF page
  pdf.addImage(pngDataUrl, 'PNG', 0, 0, pageWidth, pageHeight);

  // Get base64 PDF content (strip the data:application/pdf;base64, prefix)
  const pdfBase64 = pdf.output('datauristring').split(',')[1];
  const filename = `certificate-${participant.fullName.replace(/\s+/g, '_').toLowerCase()}.pdf`;

  return { filename, content: pdfBase64 };
}

/**
 * Render a certificate template to a PNG data URL using an off-screen canvas.
 * This is a standalone implementation that does not require any DOM elements to be visible.
 */
async function renderCertificateCanvas(
  template: CertificateTemplate,
  eventName: string,
  participant: ParticipantInfo,
  scale: number = 2
): Promise<string> {
  const mockCertId = `CERT-2026-${participant.registrationId?.substring(0, 6).toUpperCase() || '000000'}`;
  const currentDate = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  const canvas = document.createElement('canvas');
  const cw = template.orientation === 'portrait' ? 600 : 800;
  const ch = template.orientation === 'portrait' ? 800 : 600;
  canvas.width = cw * scale;
  canvas.height = ch * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not construct 2D context.');

  // Draw background
  const currentBG = getBackgroundUrl(template);

  if (template.bgType === 'solid') {
    ctx.fillStyle = template.bgSolidColor || '#fcfbfa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (template.bgType === 'gradient') {
    const g = template.bgGradient || { color1: '#1e3a8a', color2: '#dcb36c', angle: 135 };
    const angleRad = (g.angle * Math.PI) / 180;
    const grd = ctx.createLinearGradient(0, 0, Math.cos(angleRad) * canvas.width, Math.sin(angleRad) * canvas.height);
    grd.addColorStop(0, g.color1);
    grd.addColorStop(1, g.color2);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    // preset or upload
    const bgColor = template.bgPresetId === 'emerald' ? '#064e3b' : template.bgPresetId === 'dark' ? '#0f172a' : '#ffffff';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (currentBG) {
      const bgImg = new Image();
      bgImg.crossOrigin = 'anonymous';
      bgImg.src = currentBG;
      await new Promise<void>((resolve) => {
        bgImg.onload = () => resolve();
        bgImg.onerror = () => resolve();
      });

      if (template.bgType === 'upload' && template.bgScaleMode === 'fit') {
        const hRatio = canvas.width / bgImg.width;
        const vRatio = canvas.height / bgImg.height;
        const ratio = Math.min(hRatio, vRatio);
        const shiftX = (canvas.width - bgImg.width * ratio) / 2;
        const shiftY = (canvas.height - bgImg.height * ratio) / 2;
        ctx.drawImage(bgImg, shiftX, shiftY, bgImg.width * ratio, bgImg.height * ratio);
      } else if (template.bgType === 'upload' && template.bgScaleMode === 'fill') {
        const hRatio = canvas.width / bgImg.width;
        const vRatio = canvas.height / bgImg.height;
        const ratio = Math.max(hRatio, vRatio);
        const shiftX = (canvas.width - bgImg.width * ratio) / 2;
        const shiftY = (canvas.height - bgImg.height * ratio) / 2;
        ctx.drawImage(bgImg, shiftX, shiftY, bgImg.width * ratio, bgImg.height * ratio);
      } else {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
      }
    }
  }

  // Render layers
  for (const layer of template.layers) {
    if (!layer.visibility) continue;

    const xPos = (layer.x / 100) * canvas.width;
    const yPos = (layer.y / 100) * canvas.height;

    if (layer.type === 'qr_code') {
      renderQrCode(ctx, layer, xPos, yPos, scale);
    } else if (layer.type === 'signature' && layer.signatureType === 'image' && layer.signatureImageUrl) {
      await renderSignatureImage(ctx, layer, xPos, yPos, scale);
    } else {
      renderText(ctx, layer, xPos, yPos, scale, participant, eventName, mockCertId, currentDate);
    }
  }

  return canvas.toDataURL('image/png');
}

function getBackgroundUrl(template: CertificateTemplate): string {
  if (template.bgType === 'preset') {
    return PRESETS[template.bgPresetId as keyof typeof PRESETS] || PRESETS.classic;
  }
  if (template.bgType === 'gradient' || template.bgType === 'solid') {
    return '';
  }
  return template.bgImageUrl || '';
}

function getRenderText(layer: CertificateLayer, participant: ParticipantInfo, eventName: string, mockCertId: string, currentDate: string): string {
  let t = layer.text;
  t = t.replace('{name}', participant.fullName);
  t = t.replace('{event}', eventName);
  t = t.replace('{date}', currentDate);
  t = t.replace('{certificate_id}', mockCertId);
  t = t.replace('{organization}', participant.organization || 'The Guild');
  t = t.replace('{role}', participant.role || 'Attendee');
  t = t.replace('{verification_url}', `${window.location.origin}/impact`);
  return t;
}

function renderQrCode(ctx: CanvasRenderingContext2D, layer: CertificateLayer, xPos: number, yPos: number, scale: number): void {
  ctx.save();
  ctx.translate(xPos, yPos);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  const qrSize = layer.fontSize * (layer.scale || 1.0) * scale;
  let offsetX = -qrSize / 2;
  if (layer.alignment === 'left') offsetX = 0;
  else if (layer.alignment === 'right') offsetX = -qrSize;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(offsetX, -qrSize / 2, qrSize, qrSize);
  ctx.fillStyle = '#000000';
  const drawCell = (cx: number, cy: number, cw2: number, ch2: number) => {
    ctx.fillRect(offsetX + cx * (qrSize / 10), -qrSize / 2 + cy * (qrSize / 10), cw2 * (qrSize / 10), ch2 * (qrSize / 10));
  };
  drawCell(0, 0, 3, 3);
  ctx.fillStyle = '#ffffff'; drawCell(0.5, 0.5, 2, 2);
  ctx.fillStyle = '#000000'; drawCell(1, 1, 1, 1);
  drawCell(7, 0, 3, 3);
  ctx.fillStyle = '#ffffff'; drawCell(7.5, 0.5, 2, 2);
  ctx.fillStyle = '#000000'; drawCell(8, 1, 1, 1);
  drawCell(0, 7, 3, 3);
  ctx.fillStyle = '#ffffff'; drawCell(0.5, 7.5, 2, 2);
  ctx.fillStyle = '#000000'; drawCell(1, 8, 1, 1);
  // Data pattern
  drawCell(4, 1, 1, 2); drawCell(5, 3, 2, 1); drawCell(3, 5, 2, 2);
  drawCell(8, 5, 1, 1); drawCell(5, 7, 1, 2); drawCell(7, 8, 2, 1);
  ctx.restore();
}

async function renderSignatureImage(ctx: CanvasRenderingContext2D, layer: CertificateLayer, xPos: number, yPos: number, scale: number): Promise<void> {
  const sigImg = new Image();
  sigImg.src = layer.signatureImageUrl!;
  await new Promise<void>((resolve) => { sigImg.onload = () => resolve(); sigImg.onerror = () => resolve(); });
  ctx.save();
  ctx.globalAlpha = layer.opacity;
  ctx.translate(xPos, yPos);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  const sigHeight = layer.fontSize * 3 * (layer.scale || 1.0) * scale;
  const sigWidth = sigHeight * (sigImg.width / (sigImg.height || 1));
  let offsetX = -sigWidth / 2;
  if (layer.alignment === 'left') offsetX = 0;
  else if (layer.alignment === 'right') offsetX = -sigWidth;
  ctx.drawImage(sigImg, offsetX, -sigHeight / 2, sigWidth, sigHeight);
  ctx.restore();
}

function renderText(
  ctx: CanvasRenderingContext2D,
  layer: CertificateLayer,
  xPos: number,
  yPos: number,
  scale: number,
  participant: ParticipantInfo,
  eventName: string,
  mockCertId: string,
  currentDate: string
): void {
  ctx.save();
  ctx.globalAlpha = layer.opacity;
  ctx.translate(xPos, yPos);
  ctx.rotate((layer.rotation * Math.PI) / 180);

  const fFamily = layer.fontFamily === 'serif' ? 'Playfair Display, Georgia, serif'
    : layer.fontFamily === 'cursive' ? 'Great Vibes, Brush Script MT, cursive'
    : layer.fontFamily === 'monospace' ? 'Fira Code, monospace'
    : layer.fontFamily === 'cinzel' ? 'Cinzel, serif'
    : layer.fontFamily === 'montserrat' ? 'Montserrat, sans-serif'
    : layer.fontFamily === 'outfit' ? 'Outfit, sans-serif'
    : 'Inter, sans-serif';

  ctx.font = `${layer.italic ? 'italic' : 'normal'} normal ${layer.fontWeight} ${layer.fontSize * scale}px ${fFamily}`;
  ctx.textAlign = layer.alignment as CanvasTextAlign;
  ctx.textBaseline = 'middle';

  const txt = getRenderText(layer, participant, eventName, mockCertId, currentDate);

  if (layer.shadow) {
    ctx.shadowColor = layer.shadow.color;
    ctx.shadowBlur = layer.shadow.blur * scale;
    ctx.shadowOffsetX = layer.shadow.offsetX * scale;
    ctx.shadowOffsetY = layer.shadow.offsetY * scale;
  }

  ctx.fillStyle = layer.color;
  ctx.fillText(txt, 0, 0);

  if (layer.strokeColor && layer.strokeWidth) {
    ctx.shadowBlur = 0;
    ctx.strokeStyle = layer.strokeColor;
    ctx.lineWidth = layer.strokeWidth * scale;
    ctx.strokeText(txt, 0, 0);
  }

  if (layer.underline) {
    ctx.lineWidth = Math.max(1, 1.5 * scale);
    ctx.strokeStyle = layer.color;
    ctx.shadowBlur = 0;
    const met = ctx.measureText(txt);
    let sx = 0;
    if (layer.alignment === 'center') sx = -met.width / 2;
    else if (layer.alignment === 'right') sx = -met.width;
    const lineY = layer.fontSize * 0.55 * scale;
    ctx.beginPath();
    ctx.moveTo(sx, lineY);
    ctx.lineTo(sx + met.width, lineY);
    ctx.stroke();
  }

  ctx.restore();
}

