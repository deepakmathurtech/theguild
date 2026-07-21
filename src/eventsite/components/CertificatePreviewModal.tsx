import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X, Download, Send, CheckCircle, Loader2, Mail, Eye,
  ShieldCheck, ArrowRight, Maximize2, Minimize2, ZoomIn,
  ZoomOut, RefreshCw, RotateCcw, Share2
} from 'lucide-react';
import type { CertificateTemplate, CertificateLayer } from '../lib/certificateTypes';
import { PRESETS } from './CertificateTemplateEditor';
import { generateCertificatePDF } from '../lib/certificatePdfGenerator';
import type { CertificateAttachment } from '../lib/certificatePdfGenerator';

interface CertificatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: CertificateTemplate | null;
  eventName: string;
  participant: {
    fullName: string;
    email: string;
    organization?: string;
    role?: string;
    registrationId?: string;
  };
  onSendComplete: (attachments?: CertificateAttachment[]) => Promise<void>;
}

export default function CertificatePreviewModal({
  isOpen,
  onClose,
  template,
  eventName,
  participant,
  onSendComplete,
}: CertificatePreviewModalProps) {
  const [activePreviewTab, setActivePreviewTab] = useState<'certificate' | 'email'>('certificate');
  const [exportScale, setExportScale] = useState<number>(2);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [sendStep, setSendStep] = useState<number>(-1); // -1: idle, 0 to 4: progress, 5: success
  const [isSending, setIsSending] = useState<boolean>(false);
  const [previewZoom, setPreviewZoom] = useState<number>(1);
  const [isFullPreview, setIsFullPreview] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // Scroll log to bottom on new logs
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [sendStep]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSending) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isSending, onClose]);

  if (!isOpen || !template) return null;

  const currentBG = useMemo(() => {
    if (template.bgType === 'preset') {
      return PRESETS[template.bgPresetId as keyof typeof PRESETS] || PRESETS.classic;
    }
    if (template.bgType === 'gradient') {
      return '';
    }
    if (template.bgType === 'solid') {
      return '';
    }
    return template.bgImageUrl || '';
  }, [template.bgType, template.bgPresetId, template.bgImageUrl]);

  const mockCertId = `CERT-2026-${participant.registrationId?.substring(0, 6).toUpperCase() || '000142'}`;
  const currentDate = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  // Placeholder parser
  const getRenderText = (layer: CertificateLayer) => {
    let t = layer.text;
    t = t.replace('{name}', participant.fullName);
    t = t.replace('{event}', eventName);
    t = t.replace('{date}', currentDate);
    t = t.replace('{certificate_id}', mockCertId);
    t = t.replace('{organization}', participant.organization || 'The Guild');
    t = t.replace('{role}', participant.role || 'Attendee');
    return t;
  };

  // Background style for the preview div
  const getPreviewBGStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {};
    if (template.bgType === 'preset' || template.bgType === 'upload') {
      style.backgroundImage = `url("${currentBG}")`;
      style.backgroundSize = template.bgType === 'upload'
        ? (template.bgScaleMode === 'fit' ? 'contain' : template.bgScaleMode === 'fill' ? 'cover' : template.bgScaleMode === 'stretch' ? '100% 100%' : 'auto')
        : '100% 100%';
      style.backgroundPosition = 'center';
      style.backgroundColor = template.bgPresetId === 'emerald' ? '#064e3b' : template.bgPresetId === 'dark' ? '#0f172a' : '#ffffff';
    } else if (template.bgType === 'solid') {
      style.backgroundColor = template.bgSolidColor || '#fcfbfa';
    } else if (template.bgType === 'gradient') {
      const g = template.bgGradient || { color1: '#1e3a8a', color2: '#dcb36c', angle: 135 };
      style.backgroundImage = `linear-gradient(${g.angle}deg, ${g.color1}, ${g.color2})`;
    }
    return style;
  };

  // High-fidelity HTML5 Canvas exporter
  const generateCanvasImage = async (scale: number): Promise<string> => {
    const canvas = document.createElement('canvas');
    const cw = template.orientation === 'portrait' ? 600 : 800;
    const ch = template.orientation === 'portrait' ? 800 : 600;
    canvas.width = cw * scale;
    canvas.height = ch * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not construct 2D context.");

    // Draw background
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
        await new Promise((resolve) => {
          bgImg.onload = resolve;
          bgImg.onerror = resolve;
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

    // Render layers in order
    for (const layer of template.layers) {
      if (!layer.visibility) continue;

      const xPos = (layer.x / 100) * canvas.width;
      const yPos = (layer.y / 100) * canvas.height;

      if (layer.type === 'qr_code') {
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
        drawCell(4, 1, 1, 2); drawCell(5, 3, 2, 1); drawCell(3, 5, 2, 2); drawCell(8, 5, 1, 1); drawCell(5, 7, 1, 2); drawCell(7, 8, 2, 1);
        ctx.restore();
      } else if (layer.type === 'signature' && layer.signatureType === 'image' && layer.signatureImageUrl) {
        const sigImg = new Image();
        sigImg.src = layer.signatureImageUrl;
        await new Promise((resolve) => { sigImg.onload = resolve; sigImg.onerror = resolve; });
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
      } else {
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
        ctx.textAlign = layer.alignment;
        ctx.textBaseline = 'middle';
        const txt = getRenderText(layer);
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
    }

    return canvas.toDataURL('image/png');
  };

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const dataUrl = await generateCanvasImage(exportScale);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `certificate-${participant.fullName.replace(/\s+/g, '_').toLowerCase()}-${mockCertId}.png`;
      a.click();
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  // Professional Email delivery sequence with client-side mailto trigger
  const startSendingFlow = async () => {
    setIsSending(true);
    setSendStep(0);

    const delays = [900, 700, 1000, 600, 800];

    for (let i = 0; i < delays.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, delays[i]));
      setSendStep(i + 1);
    }

    try {
      // Generate PDF certificate attachment using shared utility
      const pdfAttachment = await generateCertificatePDF(
        template,
        eventName,
        participant,
        exportScale
      );
      
      await onSendComplete([pdfAttachment]);
      
      // Dispatch via local email client fallback
      const mailtoUrl = `mailto:${participant.email}?subject=Your verified certificate for ${eventName} is ready! 🎉&body=Hi ${participant.fullName.split(' ')[0]},%0D%0A%0D%0ACongratulations! Your completion certificate for "${eventName}" is registered and verified on the Guild Trust Ledger. A PDF copy is attached to this email.%0D%0A%0D%0ACertificate ID: ${mockCertId}%0D%0APassport Verification Link: ${window.location.origin}/impact%0D%0A%0D%0ABest regards,%0D%0AThe Guild Team`;
      window.location.href = mailtoUrl;
      
      setSendStep(5);
    } catch (err) {
      console.error(err);
      setSendStep(-1);
      setIsSending(false);
    }
  };

  const deliverySteps = [
    { label: 'Preparing Layout', icon: '📋' },
    { label: 'Rendering Certificate', icon: '🎨' },
    { label: 'Storage Upload', icon: '☁️' },
    { label: 'Signing Metadata', icon: '🔐' },
    { label: 'Sending Email', icon: '✉️' },
  ];

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-[#0d0d0f] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full max-w-4xl max-h-[95dvh] sm:max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">

        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-extrabold text-white truncate">Review & Issue Certificate</h2>
            <p className="text-[11px] text-white/40 mt-0.5 truncate">
              For <span className="text-[var(--primary)] font-semibold">{participant.fullName}</span>
              <span className="text-white/25 mx-1.5">·</span>
              <span>{participant.email}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSending && sendStep < 5}
            className="p-2 rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition disabled:opacity-20 ml-3 shrink-0"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex px-5 border-b border-white/10 shrink-0 gap-1">
          {[
            { key: 'certificate' as const, label: 'Certificate Preview', icon: <Eye className="h-3.5 w-3.5" /> },
            { key: 'email' as const, label: 'Email Preview', icon: <Mail className="h-3.5 w-3.5" /> },
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActivePreviewTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-bold border-b-2 transition ${
                activePreviewTab === tab.key
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-white/40 hover:text-white/70'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden min-h-0">

          {/* Left: Preview Area — fixed height on mobile */}
          <div className="flex-none sm:flex-1 bg-[#080808] flex flex-col min-h-0" style={{ maxHeight: '45vh' }}>
            <div className="flex-1 flex flex-col items-center justify-start gap-2 p-3 sm:p-4 overflow-auto min-h-0">

              {/* Zoom controls */}
              {activePreviewTab === 'certificate' && (
                <div className="flex items-center gap-1 self-end">
                  <button
                    type="button"
                    onClick={() => setPreviewZoom(z => Math.max(0.3, z - 0.1))}
                    className="p-1.5 rounded-lg text-white/40 hover:bg-white/10 hover:text-white transition"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-[10px] text-white/40 font-mono w-10 text-center">{Math.round(previewZoom * 100)}%</span>
                  <button
                    type="button"
                    onClick={() => setPreviewZoom(z => Math.min(2, z + 0.1))}
                    className="p-1.5 rounded-lg text-white/40 hover:bg-white/10 hover:text-white transition"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewZoom(1)}
                    className="p-1.5 rounded-lg text-white/40 hover:bg-white/10 hover:text-white transition"
                    title="Reset zoom"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Certificate render */}
              {activePreviewTab === 'certificate' && (
                <>
                  <div className="flex items-center justify-center w-full min-h-0 overflow-auto flex-1">
                  <div
                    className="relative select-none shadow-2xl overflow-hidden border border-white/10 shrink-0"
                    style={{
                      width: template.orientation === 'portrait' ? `${300 * previewZoom}px` : `${400 * previewZoom}px`,
                      aspectRatio: template.orientation === 'portrait' ? '600/800' : '800/600',
                      ...getPreviewBGStyle(),
                    }}
                  >
                    {template.layers.map((layer) => {
                      if (!layer.visibility) return null;

                      let transformStyle = `translate(-50%, -50%) rotate(${layer.rotation}deg)`;
                      if (layer.alignment === 'left') transformStyle = `translate(0, -50%) rotate(${layer.rotation}deg)`;
                      else if (layer.alignment === 'right') transformStyle = `translate(-100%, -50%) rotate(${layer.rotation}deg)`;

                      const scaleFactor = previewZoom * (template.orientation === 'portrait' ? 300 / 600 : 400 / 800);

                      return (
                        <div
                          key={layer.id}
                          className="absolute"
                          style={{
                            left: `${layer.x}%`,
                            top: `${layer.y}%`,
                            transform: transformStyle,
                            opacity: layer.opacity,
                            transformOrigin: layer.alignment === 'left' ? 'left center' : layer.alignment === 'right' ? 'right center' : 'center center',
                          }}
                        >
                          {layer.type === 'qr_code' ? (
                            <div
                              className="bg-white p-0.5 border border-black/10 rounded flex items-center justify-center"
                              style={{
                                width: `${layer.fontSize * (layer.scale || 1.0) * scaleFactor}px`,
                                height: `${layer.fontSize * (layer.scale || 1.0) * scaleFactor}px`,
                              }}
                            >
                              <svg className="w-full h-full" viewBox="0 0 100 100">
                                <rect x="0" y="0" width="25" height="25" fill="black" />
                                <rect x="5" y="5" width="15" height="15" fill="white" />
                                <rect x="8" y="8" width="9" height="9" fill="black" />
                                <rect x="75" y="0" width="25" height="25" fill="black" />
                                <rect x="80" y="5" width="15" height="15" fill="white" />
                                <rect x="83" y="8" width="9" height="9" fill="black" />
                                <rect x="0" y="75" width="25" height="25" fill="black" />
                                <rect x="5" y="80" width="15" height="15" fill="white" />
                                <rect x="8" y="83" width="9" height="9" fill="black" />
                                <rect x="35" y="10" width="10" height="10" fill="black" />
                                <rect x="55" y="20" width="15" height="10" fill="black" />
                                <rect x="40" y="45" width="20" height="20" fill="black" />
                              </svg>
                            </div>
                          ) : layer.type === 'signature' && layer.signatureType === 'image' && layer.signatureImageUrl ? (
                            <img
                              src={layer.signatureImageUrl}
                              alt="Signature"
                              className="object-contain"
                              style={{
                                maxHeight: `${layer.fontSize * 3 * (layer.scale || 1.0) * scaleFactor}px`,
                                maxWidth: '120px',
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                fontFamily: layer.fontFamily === 'serif' ? 'Playfair Display, Georgia, serif'
                                  : layer.fontFamily === 'cursive' ? 'Great Vibes, Brush Script MT, cursive'
                                  : layer.fontFamily === 'cinzel' ? 'Cinzel, serif'
                                  : layer.fontFamily === 'monospace' ? 'Fira Code, monospace'
                                  : 'Inter, sans-serif',
                                fontSize: `${layer.fontSize * scaleFactor}px`,
                                fontWeight: layer.fontWeight,
                                fontStyle: layer.italic ? 'italic' : 'normal',
                                textDecoration: layer.underline ? 'underline' : 'none',
                                color: layer.color,
                                textAlign: layer.alignment,
                                letterSpacing: layer.letterSpacing ? `${layer.letterSpacing * scaleFactor}px` : 'normal',
                                lineHeight: layer.lineHeight || 1.2,
                                whiteSpace: 'nowrap',
                                textShadow: layer.shadow
                                  ? `${layer.shadow.offsetX * scaleFactor}px ${layer.shadow.offsetY * scaleFactor}px ${layer.shadow.blur * scaleFactor}px ${layer.shadow.color}`
                                  : 'none',
                              }}
                            >
                              {getRenderText(layer)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Certificate ID badge */}
                <div className="flex items-center gap-2 text-[10px] text-white/30 font-mono shrink-0">
                  <ShieldCheck className="h-3 w-3 text-emerald-500/60 shrink-0" />
                  <span className="truncate">{mockCertId}</span>
                  <span className="text-white/15 hidden sm:inline">·</span>
                  <span className="hidden sm:inline">{currentDate}</span>
                </div>
              </>
            )}

            {/* Email Preview */}
            {activePreviewTab === 'email' && (
              <div className="flex items-start justify-center overflow-auto w-full">
                <div className="w-full max-w-sm bg-[#16161a] border border-white/10 rounded-xl overflow-hidden text-xs text-white/80">
                  {/* Mac-style window chrome */}
                  <div className="bg-black/30 px-4 py-2 border-b border-white/5 flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <span className="text-[10px] text-white/20 font-bold uppercase tracking-wider mx-auto">Mail Client</span>
                  </div>

                  {/* Email metadata */}
                  <div className="p-3 border-b border-white/5 bg-black/10 space-y-1 text-[11px]">
                    <div><span className="text-white/35">From:</span> verification@theguild.co</div>
                    <div><span className="text-white/35">To:</span> <span className="text-[var(--primary)]">{participant.email}</span></div>
                    <div><span className="text-white/35">Subject:</span> Your verified certificate is ready! 🎉</div>
                  </div>

                  {/* Email body */}
                  <div className="p-4 space-y-4">
                    <div className="bg-[#1a1a24] border border-white/10 rounded-xl p-4 space-y-3">
                      {/* Brand header */}
                      <div className="flex items-center justify-between pb-2.5 border-b border-white/5">
                        <div className="font-extrabold text-[var(--primary)] text-sm flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          The Guild
                        </div>
                        <span className="text-[9px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">VERIFIED</span>
                      </div>

                      {/* Greeting */}
                      <div>
                        <div className="text-xs font-bold text-white">Hi {participant.fullName.split(' ')[0]},</div>
                        <p className="text-[10px] text-white/50 leading-relaxed mt-1">
                          Congratulations on completing <strong className="text-white/70">{eventName}</strong>! Your official certificate has been registered successfully.
                        </p>
                      </div>

                      {/* Certificate preview thumbnail */}
                      <div className="relative rounded-lg overflow-hidden border border-white/10 aspect-[4/3] bg-black/40">
                        <div
                          className="absolute inset-0 opacity-50"
                          style={{ ...getPreviewBGStyle(), backgroundSize: 'cover' }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-2.5">
                          <div className="text-[8px] font-bold text-[var(--primary)] uppercase tracking-widest">Certificate</div>
                          <div className="text-[11px] font-bold text-white truncate">{participant.fullName}</div>
                          <div className="text-[9px] text-white/40 truncate">{eventName}</div>
                        </div>
                      </div>

                      {/* CTA */}
                      <button
                        type="button"
                        onClick={() => alert(`Verification: https://verify.theguild.co/records/${mockCertId}`)}
                        className="w-full py-2 rounded-lg bg-[var(--primary)] text-black text-[10px] font-bold flex items-center justify-center gap-1 hover:opacity-90"
                      >
                        <span>Claim & Verify Certificate</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>

                      <div className="text-[8px] text-white/20 text-center">
                        {mockCertId} · SHA-256 Signed
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

          {/* Right: Actions Panel — scrollable, sits below on mobile */}
          <div className="flex-none sm:flex-none border-t sm:border-t-0 sm:border-l border-white/10 flex flex-col bg-[#0f0f13] sm:w-64 md:w-72 overflow-y-auto max-h-[45dvh] sm:max-h-none">
            {/* Delivery steps */}
            {sendStep >= 0 && (
              <div className="p-4 border-b border-white/10">
                <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-white/40 mb-3">
                  {sendStep === 5 ? '✓ Delivery Complete' : 'Delivery Progress'}
                </h4>

                {sendStep === 5 ? (
                  <div className="text-center py-3 space-y-2">
                    <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto" />
                    <div className="text-xs font-extrabold text-white">Delivered Successfully!</div>
                    <div className="text-[10px] text-white/40">Verification record saved.</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {deliverySteps.map((step, idx) => {
                      const isDone = sendStep > idx;
                      const isCurrent = sendStep === idx;
                      return (
                        <div key={idx} className="flex items-center gap-2.5">
                          <span className="text-sm shrink-0">
                            {isDone ? (
                              <span className="h-5 w-5 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-[10px] font-bold inline-flex">✓</span>
                            ) : isCurrent ? (
                              <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)] inline" />
                            ) : (
                              <span className="h-5 w-5 bg-black/30 border border-white/10 rounded-full flex items-center justify-center text-[9px] text-white/30 inline-flex">{idx + 1}</span>
                            )}
                          </span>
                          <span className={`text-[11px] ${isDone ? 'text-white/30 line-through' : isCurrent ? 'text-[var(--primary)] font-bold' : 'text-white/40'}`}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Export Settings */}
            <div className="p-4 border-b border-white/10">
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-white/30 mb-3">PNG Export Quality</h3>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { scale: 1, label: '1×', desc: '800px' },
                  { scale: 2, label: '2×', desc: '1600px' },
                  { scale: 4, label: '4×', desc: '3200px' },
                ].map(({ scale, label, desc }) => (
                  <button
                    key={scale}
                    type="button"
                    onClick={() => setExportScale(scale)}
                    disabled={isSending && sendStep < 5}
                    className={`py-2 rounded-xl border text-[10px] font-bold transition ${
                      exportScale === scale
                        ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                        : 'border-white/10 text-white/40 hover:bg-white/5'
                    }`}
                  >
                    <div>{label}</div>
                    <div className="text-[8px] font-normal opacity-60">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 space-y-2.5 mt-auto">
              <button
                type="button"
                onClick={handleDownload}
                disabled={isExporting || (isSending && sendStep < 5)}
                className="w-full inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 text-sm font-bold text-white hover:bg-white/5 transition disabled:opacity-40"
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-[var(--primary)]" />}
                <span>{isExporting ? 'Generating...' : 'Download PNG'}</span>
              </button>

              {sendStep === 5 ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Done — Close Window</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startSendingFlow}
                  disabled={isSending}
                  className="w-full inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] text-black text-sm font-bold hover:opacity-95 active:scale-95 transition disabled:opacity-50 shadow-lg shadow-[var(--primary)]/20"
                >
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  <span>{isSending ? 'Sending...' : 'Send Certificate'}</span>
                </button>
              )}

              <p className="text-center text-[10px] text-white/40">
                {isSending && sendStep < 5 ? 'Please wait while we process your certificate.' : 'This will register the certificate and open your native email composer with pre-filled details.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
