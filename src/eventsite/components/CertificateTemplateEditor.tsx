import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Undo, Redo, ZoomIn, ZoomOut, Trash2, Copy, Lock, Unlock, Eye, EyeOff,
  Plus, ChevronUp, ChevronDown, AlignLeft, AlignCenter, AlignRight,
  Grid, Upload, ShieldCheck, QrCode, Type, FileJson, X, RefreshCw, FileText, Settings,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, ArrowLeft, Layers, Palette,
  ArrowUp as ArrowUpIcon, ArrowDown as ArrowDownIcon, ArrowLeft as ArrowLeftIcon, ArrowRight as ArrowRightIcon,
  Maximize2, Layout
} from 'lucide-react';
import type { CertificateTemplate, CertificateLayer } from '../lib/certificateTypes';
import { certificateTemplateStorage } from '../lib/certificateTemplateStorage';

// High-fidelity SVG certificate background presets (inline URLs)
export const PRESETS = {
  classic: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="%23fcfbfa"/><rect x="25" y="25" width="750" height="550" fill="none" stroke="%231e3a8a" stroke-width="14"/><rect x="37" y="37" width="726" height="526" fill="none" stroke="%23dcb36c" stroke-width="2"/><g fill="%23dcb36c" opacity="0.08"><circle cx="50" cy="50" r="80" fill="none" stroke="%23dcb36c" stroke-width="0.5"/><circle cx="750" cy="50" r="80" fill="none" stroke="%23dcb36c" stroke-width="0.5"/><circle cx="50" cy="550" r="80" fill="none" stroke="%23dcb36c" stroke-width="0.5"/><circle cx="750" cy="550" r="80" fill="none" stroke="%23dcb36c" stroke-width="0.5"/></g><path d="M 37,80 L 80,37 M 763,80 L 720,37 M 37,520 L 80,563 M 763,520 L 720,563" stroke="%23dcb36c" stroke-width="2"/><circle cx="400" cy="70" r="18" fill="%23dcb36c" opacity="0.2"/><path d="M 400,60 L 405,72 L 417,72 L 407,80 L 411,92 L 400,84 L 389,92 L 393,80 L 383,72 L 395,72 Z" fill="%23dcb36c"/></svg>`,
  minimal: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="%23f8fafc"/><rect x="0" y="0" width="20" height="600" fill="%23dcb36c"/><line x1="50" y1="50" x2="750" y2="50" stroke="%23e2e8f0" stroke-width="1"/><line x1="50" y1="550" x2="750" y2="550" stroke="%23e2e8f0" stroke-width="1"/><circle cx="740" cy="80" r="50" fill="%23dcb36c" opacity="0.05"/><circle cx="80" cy="520" r="80" fill="%231e293b" opacity="0.02"/></svg>`,
  emerald: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="%23064e3b"/><rect x="30" y="30" width="740" height="540" fill="none" stroke="%23dcb36c" stroke-width="4"/><rect x="42" y="42" width="716" height="516" fill="none" stroke="%23dcb36c" stroke-width="1.5" stroke-dasharray="10,5"/><g stroke="%23dcb36c" stroke-width="1.5" fill="none" opacity="0.6"><circle cx="42" cy="42" r="10"/><circle cx="758" cy="42" r="10"/><circle cx="42" cy="558" r="10"/><circle cx="758" cy="558" r="10"/></g></svg>`,
  dark: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="%230f172a"/><rect x="25" y="25" width="750" height="550" fill="none" stroke="%23334155" stroke-width="1"/><rect x="35" y="35" width="730" height="530" fill="none" stroke="%23dcb36c" stroke-width="2" opacity="0.7"/><g fill="%23dcb36c" opacity="0.1"><polygon points="400,280 404,292 416,296 404,300 400,312 396,300 384,296 396,292" /><polygon points="120,120 122,126 128,128 122,130 120,136 118,130 112,128 118,126" /><polygon points="680,480 682,486 688,488 682,490 680,496 678,490 672,488 678,486" /></g></svg>`,
};

interface CertificateTemplateEditorProps {
  eventId: string;
  eventName: string;
  onClose: () => void;
}

const PREVIEW_PARTICIPANTS = [
  { name: 'John Doe', organization: 'Google', role: 'Software Engineer', certificate_id: 'CERT-2026-000142', date: '2026-07-21' },
  { name: 'Sarah Jenkins', organization: 'Microsoft', role: 'Product Manager', certificate_id: 'CERT-2026-000143', date: '2026-07-22' },
  { name: 'Alex Rivera', organization: 'Figma', role: 'Lead Designer', certificate_id: 'CERT-2026-000144', date: '2026-07-23' },
];

const DEFAULT_LAYERS: CertificateLayer[] = [
  { id: 'layer-title', name: 'Certificate Title', type: 'custom', x: 50, y: 18, fontSize: 28, fontFamily: 'serif', fontWeight: 'bold', italic: false, underline: false, color: '#dcb36c', opacity: 1, rotation: 0, alignment: 'center', visibility: true, locked: false, text: 'CERTIFICATE OF PARTICIPATION' },
  { id: 'layer-intro', name: 'Introduction Text', type: 'custom', x: 50, y: 28, fontSize: 14, fontFamily: 'sans-serif', fontWeight: 'normal', italic: true, underline: false, color: '#64748b', opacity: 1, rotation: 0, alignment: 'center', visibility: true, locked: false, text: 'This is proudly presented to' },
  { id: 'layer-name', name: 'Recipient Name', type: 'name', x: 50, y: 40, fontSize: 36, fontFamily: 'serif', fontWeight: 'bold', italic: false, underline: false, color: '#0f172a', opacity: 1, rotation: 0, alignment: 'center', visibility: true, locked: false, text: '{name}' },
  { id: 'layer-body', name: 'Award Body Text', type: 'custom', x: 50, y: 52, fontSize: 14, fontFamily: 'sans-serif', fontWeight: 'normal', italic: false, underline: false, color: '#64748b', opacity: 1, rotation: 0, alignment: 'center', visibility: true, locked: false, text: 'for active participation and successful completion of' },
  { id: 'layer-event', name: 'Event Name', type: 'event', x: 50, y: 62, fontSize: 20, fontFamily: 'sans-serif', fontWeight: 'bold', italic: false, underline: false, color: '#0f172a', opacity: 1, rotation: 0, alignment: 'center', visibility: true, locked: false, text: '{event}' },
  { id: 'layer-date', name: 'Issue Date', type: 'date', x: 30, y: 80, fontSize: 12, fontFamily: 'sans-serif', fontWeight: 'normal', italic: false, underline: false, color: '#64748b', opacity: 1, rotation: 0, alignment: 'center', visibility: true, locked: false, text: 'Issued: {date}' },
  { id: 'layer-signature', name: 'Signature Text', type: 'signature', x: 70, y: 80, fontSize: 14, fontFamily: 'cursive', fontWeight: 'normal', italic: false, underline: false, color: '#0f172a', opacity: 1, rotation: 0, alignment: 'center', visibility: true, locked: false, text: 'Organizer Signature', signatureType: 'text' },
];

export default function CertificateTemplateEditor({ eventId, eventName, onClose }: CertificateTemplateEditorProps) {
  const [template, setTemplate] = useState<CertificateTemplate>({
    id: `tpl-${eventId}`, eventId, bgType: 'preset', bgPresetId: 'classic', bgScaleMode: 'fit',
    bgSolidColor: '#fcfbfa', bgGradient: { color1: '#1e3a8a', color2: '#dcb36c', angle: 135 },
    orientation: 'landscape', layers: DEFAULT_LAYERS, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });

  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number | 'fit'>('fit');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Panel visibility (responsive)
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [mobilePanel, setMobilePanel] = useState<'none' | 'layers' | 'properties'>('none');

  // History stack
  const [history, setHistory] = useState<CertificateLayer[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Computed Aspect dimensions
  const canvasWidth = template.orientation === 'portrait' ? 600 : 800;
  const canvasHeight = template.orientation === 'portrait' ? 800 : 600;

  // Load template
  useEffect(() => {
    (async () => {
      const stored = await certificateTemplateStorage.loadTemplate(eventId);
      if (stored) {
        // Enforce orientation schemas
        const layout: CertificateTemplate = {
          orientation: 'landscape',
          bgSolidColor: '#fcfbfa',
          bgGradient: { color1: '#1e3a8a', color2: '#dcb36c', angle: 135 },
          ...stored
        };
        setTemplate(layout);
        setHistory([layout.layers]);
        setHistoryIndex(0);
      } else {
        setHistory([DEFAULT_LAYERS]);
        setHistoryIndex(0);
      }
    })();
  }, [eventId]);

  // History helpers
  const pushHistory = useCallback((layers: CertificateLayer[]) => {
    const fresh = JSON.parse(JSON.stringify(layers));
    setHistory(prev => {
      const next = prev.slice(0, historyIndex + 1);
      next.push(fresh);
      return next;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setTemplate(prev => ({ ...prev, layers: JSON.parse(JSON.stringify(history[prevIdx])), updatedAt: new Date().toISOString() }));
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setTemplate(prev => ({ ...prev, layers: JSON.parse(JSON.stringify(history[nextIdx])), updatedAt: new Date().toISOString() }));
    }
  }, [historyIndex, history]);

  // Keyboard shortcuts (Undo/Redo)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  // Keyboard nudges
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selectedLayerId) return;
      const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (!arrowKeys.includes(e.key)) return;

      // Disable nudge if user is inside a form input element
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA' || 
          document.activeElement?.tagName === 'SELECT') {
        return;
      }

      e.preventDefault();
      const nudge = e.shiftKey ? 2.0 : 0.5;

      setTemplate(prev => {
        const layers = prev.layers.map(l => {
          if (l.id !== selectedLayerId || l.locked) return l;
          let nextX = l.x;
          let nextY = l.y;
          if (e.key === 'ArrowUp') nextY = Math.max(0, l.y - nudge);
          else if (e.key === 'ArrowDown') nextY = Math.min(100, l.y + nudge);
          else if (e.key === 'ArrowLeft') nextX = Math.max(0, l.x - nudge);
          else if (e.key === 'ArrowRight') nextX = Math.min(100, l.x + nudge);
          return { ...l, x: nextX, y: nextY };
        });
        return { ...prev, layers, updatedAt: new Date().toISOString() };
      });
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedLayerId]);

  // Auto-save
  useEffect(() => {
    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        await certificateTemplateStorage.saveTemplate(eventId, template);
        setSaveStatus('saved');
      } catch { setSaveStatus('idle'); }
    }, 800);
    return () => clearTimeout(timer);
  }, [template, eventId]);

  // Zoom fit
  useEffect(() => {
    if (zoom === 'fit') {
      const update = () => {
        if (canvasRef.current?.parentElement) {
          const p = canvasRef.current.parentElement;
          setZoomLevel(Math.max(0.15, Math.min(1.5, Math.min((p.clientWidth - 32) / canvasWidth, (p.clientHeight - 32) / canvasHeight))));
        }
      };
      update();
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    } else {
      setZoomLevel(zoom);
    }
  }, [zoom, showLeftPanel, showRightPanel, canvasWidth, canvasHeight]);

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const currentBG = useMemo(() => {
    if (template.bgType === 'preset') return PRESETS[template.bgPresetId as keyof typeof PRESETS] || PRESETS.classic;
    return template.bgImageUrl || '';
  }, [template.bgType, template.bgPresetId, template.bgImageUrl]);

  const activeParticipant = PREVIEW_PARTICIPANTS[previewIndex];

  const getRenderText = useCallback((layer: CertificateLayer) => {
    let t = layer.text;
    t = t.replace('{name}', activeParticipant.name);
    t = t.replace('{event}', eventName);
    t = t.replace('{date}', activeParticipant.date);
    t = t.replace('{certificate_id}', activeParticipant.certificate_id);
    t = t.replace('{organization}', activeParticipant.organization);
    t = t.replace('{role}', activeParticipant.role);
    return t;
  }, [activeParticipant, eventName]);

  const updateLayers = useCallback((newLayers: CertificateLayer[]) => {
    setTemplate(prev => ({ ...prev, layers: newLayers, updatedAt: new Date().toISOString() }));
    pushHistory(newLayers);
  }, [pushHistory]);

  const updateSingleLayer = useCallback((layerId: string, updates: Partial<CertificateLayer>) => {
    setTemplate(prev => ({
      ...prev,
      layers: prev.layers.map(l => l.id === layerId ? { ...l, ...updates } : l),
      updatedAt: new Date().toISOString()
    }));
  }, []);

  const nudgeSelected = useCallback((dir: 'up' | 'down' | 'left' | 'right', amount: number) => {
    if (!selectedLayerId) return;
    setTemplate(prev => {
      const layers = prev.layers.map(l => {
        if (l.id !== selectedLayerId || l.locked) return l;
        let nextX = l.x;
        let nextY = l.y;
        if (dir === 'up') nextY = Math.max(0, l.y - amount);
        else if (dir === 'down') nextY = Math.min(100, l.y + amount);
        else if (dir === 'left') nextX = Math.max(0, l.x - amount);
        else if (dir === 'right') nextX = Math.min(100, l.x + amount);
        return { ...l, x: nextX, y: nextY };
      });
      pushHistory(layers);
      return { ...prev, layers, updatedAt: new Date().toISOString() };
    });
  }, [selectedLayerId, pushHistory]);

  // Drag handler (mouse + touch)
  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent, layer: CertificateLayer) => {
    if (layer.locked || !layer.visibility) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedLayerId(layer.id);
    setMobilePanel('none');

    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const rect = canvasEl.getBoundingClientRect();
    const getPos = (ev: MouseEvent | TouchEvent) => {
      if ('touches' in ev) return { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
      return { x: ev.clientX, y: ev.clientY };
    };

    const startPos = 'touches' in e ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
    const startLayerX = layer.x;
    const startLayerY = layer.y;

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const pos = getPos(moveEvent);
      let nextX = startLayerX + ((pos.x - startPos.x) / rect.width) * 100;
      let nextY = startLayerY + ((pos.y - startPos.y) / rect.height) * 100;
      if (snapToGrid) { nextX = Math.round(nextX / 2.5) * 2.5; nextY = Math.round(nextY / 2.5) * 2.5; }
      nextX = Math.max(0, Math.min(100, nextX));
      nextY = Math.max(0, Math.min(100, nextY));
      setTemplate(prev => ({ ...prev, layers: prev.layers.map(l => l.id === layer.id ? { ...l, x: nextX, y: nextY } : l) }));
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      // push to history
      setTemplate(prev => {
        pushHistory(prev.layers);
        return prev;
      });
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  }, [snapToGrid, pushHistory]);

  // Add Layer
  const addCustomLayer = useCallback((type: CertificateLayer['type'] = 'custom') => {
    const id = `layer-${Date.now()}`;
    const nameMap: Record<string, string> = { custom: 'Custom Text', signature: 'Signature', qr_code: 'QR Code', name: 'Attendee Name', event: 'Event Title', date: 'Date', certificate_id: 'Cert ID', organization: 'Organization', role: 'Role' };
    let text = 'New Text Block';
    if (type === 'name') text = '{name}';
    else if (type === 'event') text = '{event}';
    else if (type === 'date') text = '{date}';
    else if (type === 'certificate_id') text = '{certificate_id}';
    else if (type === 'organization') text = '{organization}';
    else if (type === 'role') text = '{role}';
    else if (type === 'qr_code') text = '{verification_url}';

    const newLayer: CertificateLayer = {
      id, name: nameMap[type] || 'New Layer', type, x: 50, y: 50,
      fontSize: type === 'qr_code' ? 80 : 16, fontFamily: type === 'signature' ? 'cursive' : 'sans-serif',
      fontWeight: 'normal', italic: false, underline: false,
      color: template.bgPresetId === 'emerald' || template.bgPresetId === 'dark' ? '#ffffff' : '#0f172a',
      opacity: 1, rotation: 0, alignment: 'center', visibility: true, locked: false, text,
      scale: (type === 'qr_code' || type === 'signature') ? 1.0 : undefined,
      signatureType: type === 'signature' ? 'text' : undefined,
    };
    updateLayers([...template.layers, newLayer]);
    setSelectedLayerId(id);
  }, [template.layers, template.bgPresetId, updateLayers]);

  const deleteLayer = useCallback((id: string) => {
    updateLayers(template.layers.filter(l => l.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  }, [template.layers, selectedLayerId, updateLayers]);

  const duplicateLayer = useCallback((layer: CertificateLayer) => {
    const id = `layer-${Date.now()}`;
    const dup: CertificateLayer = { ...JSON.parse(JSON.stringify(layer)), id, name: `${layer.name} (Copy)`, x: Math.min(95, layer.x + 5), y: Math.min(95, layer.y + 5), locked: false };
    updateLayers([...template.layers, dup]);
    setSelectedLayerId(id);
  }, [template.layers, updateLayers]);

  const moveLayer = useCallback((index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === template.layers.length - 1) return;
    if (direction === 'down' && index === 0) return;
    const targetIdx = direction === 'up' ? index + 1 : index - 1;
    const next = [...template.layers];
    [next[index], next[targetIdx]] = [next[targetIdx], next[index]];
    updateLayers(next);
  }, [template.layers, updateLayers]);

  const handleAlignment = useCallback((action: string) => {
    if (!selectedLayerId) return;
    const layer = template.layers.find(l => l.id === selectedLayerId);
    if (!layer || layer.locked) return;
    const updates: Partial<CertificateLayer> = {};
    if (action === 'left') { updates.x = 10; updates.alignment = 'left'; }
    else if (action === 'right') { updates.x = 90; updates.alignment = 'right'; }
    else if (action === 'center') { updates.x = 50; updates.alignment = 'center'; }
    else if (action === 'top') updates.y = 10;
    else if (action === 'bottom') updates.y = 90;
    else if (action === 'center-v') updates.y = 50;
    const finalized = template.layers.map(l => l.id === selectedLayerId ? { ...l, ...updates } : l);
    updateLayers(finalized);
  }, [selectedLayerId, template.layers, updateLayers]);

  const handleBGUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setTemplate(prev => ({ ...prev, bgType: 'upload', bgImageUrl: reader.result as string, bgPresetId: undefined }));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSignatureUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, layerId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const finalized = template.layers.map(l => l.id === layerId ? { ...l, signatureType: 'image' as const, signatureImageUrl: reader.result as string } : l);
        updateLayers(finalized);
      }
    };
    reader.readAsDataURL(file);
  }, [template.layers, updateLayers]);

  const exportTemplateJSON = useCallback(() => {
    const dl = document.createElement('a');
    dl.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(template, null, 2));
    dl.download = `template-${eventId}.json`;
    dl.click();
  }, [template, eventId]);

  const importTemplateJSON = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as CertificateTemplate;
        if (!parsed.id || !parsed.layers) throw new Error("Invalid schema.");
        setTemplate({ ...parsed, eventId });
        pushHistory(parsed.layers);
        setErrorMsg(null);
      } catch { setErrorMsg("Failed to import. Invalid certificate template JSON."); }
    };
    reader.readAsText(file);
  }, [eventId, pushHistory]);

  const selectedLayer = template.layers.find(l => l.id === selectedLayerId) || null;

  const getFontStyle = (layer: CertificateLayer) => {
    // Dynamic Google Fonts mapping
    const fontMapping: Record<string, string> = {
      'sans-serif': 'Inter, sans-serif',
      'serif': 'Playfair Display, Georgia, serif',
      'cursive': 'Great Vibes, Brush Script MT, cursive',
      'monospace': 'Fira Code, monospace',
      'cinzel': 'Cinzel, Georgia, serif',
      'montserrat': 'Montserrat, sans-serif',
      'outfit': 'Outfit, sans-serif',
      'alex-brush': 'Alex Brush, cursive',
    };

    return {
      fontFamily: fontMapping[layer.fontFamily] || 'Inter, sans-serif',
      fontSize: `${layer.fontSize}px`,
      fontWeight: layer.fontWeight,
      fontStyle: layer.italic ? 'italic' : ('normal' as const),
      textDecoration: layer.underline ? 'underline' : ('none' as const),
      color: layer.color,
      textAlign: layer.alignment as React.CSSProperties['textAlign'],
      letterSpacing: layer.letterSpacing ? `${layer.letterSpacing}px` : 'normal',
      lineHeight: layer.lineHeight || 1.2,
      whiteSpace: 'nowrap' as const,
      textShadow: layer.shadow ? `${layer.shadow.offsetX}px ${layer.shadow.offsetY}px ${layer.shadow.blur}px ${layer.shadow.color}` : 'none',
      WebkitTextStroke: (layer.strokeColor && layer.strokeWidth) ? `${layer.strokeWidth}px ${layer.strokeColor}` : undefined,
    };
  };

  const getBackgroundStyle = () => {
    const style: React.CSSProperties = {
      backgroundSize: '100% 100%',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundColor: '#ffffff',
    };

    if (template.bgType === 'preset') {
      style.backgroundImage = `url("${currentBG}")`;
      style.backgroundColor = template.bgPresetId === 'emerald' ? '#064e3b' : template.bgPresetId === 'dark' ? '#0f172a' : '#ffffff';
    } else if (template.bgType === 'upload') {
      style.backgroundImage = `url("${currentBG}")`;
      style.backgroundSize = template.bgScaleMode === 'fit' ? 'contain' : template.bgScaleMode === 'fill' ? 'cover' : template.bgScaleMode === 'stretch' ? '100% 100%' : 'auto';
    } else if (template.bgType === 'solid') {
      style.backgroundColor = template.bgSolidColor || '#fcfbfa';
    } else if (template.bgType === 'gradient') {
      const g = template.bgGradient || { color1: '#1e3a8a', color2: '#dcb36c', angle: 135 };
      style.backgroundImage = `linear-gradient(${g.angle}deg, ${g.color1}, ${g.color2})`;
    }

    return style;
  };

  // ─── RENDER ────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a]" style={{ height: '100dvh' }}>
      
      {/* Load Google Web Fonts dynamically */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800&family=Great+Vibes&family=Alex+Brush&family=Fira+Code&family=Montserrat:wght@500;700&family=Outfit:wght@400;700&family=Playfair+Display:ital,wght@0,600;0,800;1,400&family=Inter:wght@400;700&display=swap" />

      {/* ─── TOP TOOLBAR ─── */}
      <header className="flex items-center justify-between gap-2 border-b border-white/10 bg-[#111] px-3 py-2 md:px-4 shrink-0 z-20">

        {/* Left: Back + Event Name */}
        <div className="flex items-center gap-2 min-w-0">
          <button type="button" onClick={onClose} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:bg-white/10 hover:text-white transition" aria-label="Close editor">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          <span className="text-xs font-extrabold text-[var(--primary)] truncate max-w-40 hidden sm:block">{eventName}</span>
        </div>

        {/* Center: Undo/Redo + Zoom + Grid + Orientation */}
        <div className="flex items-center gap-1 md:gap-2">
          <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-black/30 p-0.5">
            <button type="button" onClick={undo} disabled={historyIndex <= 0} className="p-1.5 rounded text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:pointer-events-none" title="Undo (Ctrl+Z)" aria-label="Undo"><Undo className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={redo} disabled={historyIndex >= history.length - 1} className="p-1.5 rounded text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:pointer-events-none" title="Redo (Ctrl+Shift+Z)" aria-label="Redo"><Redo className="h-3.5 w-3.5" /></button>
          </div>

          <div className="h-4 w-px bg-white/10 hidden md:block" />

          {/* Orientation switch */}
          <div className="flex items-center gap-0.5 border border-white/10 bg-black/30 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setTemplate(prev => ({ ...prev, orientation: 'landscape' }))}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${template.orientation !== 'portrait' ? 'bg-[var(--primary)] text-black' : 'text-white/60 hover:text-white'}`}
              title="Landscape Aspect Ratio"
            >
              Lndsp
            </button>
            <button
              type="button"
              onClick={() => setTemplate(prev => ({ ...prev, orientation: 'portrait' }))}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${template.orientation === 'portrait' ? 'bg-[var(--primary)] text-black' : 'text-white/60 hover:text-white'}`}
              title="Portrait Aspect Ratio"
            >
              Portr
            </button>
          </div>

          <div className="h-4 w-px bg-white/10 hidden md:block" />

          <button type="button" onClick={() => setShowGrid(!showGrid)} className={`p-1.5 rounded-lg transition ${showGrid ? 'bg-[var(--primary)]/20 text-[var(--primary)]' : 'text-white/40 hover:bg-white/10 hover:text-white'}`} title="Toggle Grid" aria-label="Toggle grid"><Grid className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={() => setSnapToGrid(!snapToGrid)} className={`px-2 py-1 text-[10px] font-bold rounded-lg transition ${snapToGrid ? 'bg-[var(--primary)]/20 text-[var(--primary)]' : 'text-white/40 hover:bg-white/10 hover:text-white'}`} title="Snap to Grid" aria-label="Toggle snap">Snap</button>

          <div className="h-4 w-px bg-white/10 hidden md:block" />

          {/* Zoom */}
          <div className="hidden sm:flex items-center gap-0.5 text-xs">
            <button type="button" onClick={() => { if (typeof zoom === 'number') setZoom(Math.max(0.25, zoom - 0.25)); else setZoom(0.75); }} className="p-1.5 rounded hover:bg-white/10 text-white/60" aria-label="Zoom out"><ZoomOut className="h-3.5 w-3.5" /></button>
            <select value={zoom} onChange={(e) => setZoom(e.target.value === 'fit' ? 'fit' : parseFloat(e.target.value))} className="bg-transparent border-0 font-bold text-white/70 py-0.5 focus:ring-0 cursor-pointer text-xs" aria-label="Zoom level">
              <option value="fit" className="bg-[var(--bg)]">Fit</option>
              <option value="0.25" className="bg-[var(--bg)]">25%</option>
              <option value="0.5" className="bg-[var(--bg)]">50%</option>
              <option value="0.75" className="bg-[var(--bg)]">75%</option>
              <option value="1.0" className="bg-[var(--bg)]">100%</option>
              <option value="1.5" className="bg-[var(--bg)]">150%</option>
              <option value="2.0" className="bg-[var(--bg)]">200%</option>
            </select>
            <button type="button" onClick={() => { if (typeof zoom === 'number') setZoom(Math.min(2.0, zoom + 0.25)); else setZoom(1.25); }} className="p-1.5 rounded hover:bg-white/10 text-white/60" aria-label="Zoom in"><ZoomIn className="h-3.5 w-3.5" /></button>
          </div>
        </div>

        {/* Right: Preview + Save + Panel Toggles */}
        <div className="flex items-center gap-1.5 md:gap-2">
          <select value={previewIndex} onChange={(e) => setPreviewIndex(parseInt(e.target.value) || 0)} className="hidden lg:block bg-transparent border border-white/10 rounded-lg text-[10px] font-bold text-white/70 px-2 py-1 focus:ring-0 cursor-pointer" aria-label="Preview as attendee">
            {PREVIEW_PARTICIPANTS.map((p, i) => <option key={p.certificate_id} value={i} className="bg-[var(--bg)]">{p.name}</option>)}
          </select>

          <div className="text-[10px] font-bold text-white/40 flex items-center gap-1 hidden md:flex">
            {saveStatus === 'saving' && <RefreshCw className="h-3 w-3 animate-spin text-[var(--primary)]" />}
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved ✓' : ''}
          </div>

          {/* Export/Import */}
          <button type="button" onClick={exportTemplateJSON} className="hidden md:flex items-center gap-1 px-2 py-1.5 rounded-lg border border-white/10 text-[10px] font-bold text-white/60 hover:bg-white/10" aria-label="Export template JSON">
            <FileJson className="h-3 w-3 text-[var(--primary)]" /> Export
          </button>
          <label className="hidden md:flex items-center gap-1 px-2 py-1.5 rounded-lg border border-white/10 text-[10px] font-bold text-white/60 hover:bg-white/10 cursor-pointer" aria-label="Import template JSON">
            <Upload className="h-3 w-3 text-emerald-500" /> Import
            <input type="file" accept=".json" onChange={importTemplateJSON} className="hidden" />
          </label>

          <div className="h-4 w-px bg-white/10 hidden md:block" />

          {/* Panel toggles */}
          <button type="button" onClick={() => setShowLeftPanel(!showLeftPanel)} className="hidden md:flex p-1.5 rounded-lg text-white/40 hover:bg-white/10 hover:text-white transition" title="Toggle layers panel" aria-label="Toggle layers panel">
            {showLeftPanel ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>
          <button type="button" onClick={() => setShowRightPanel(!showRightPanel)} className="hidden md:flex p-1.5 rounded-lg text-white/40 hover:bg-white/10 hover:text-white transition" title="Toggle properties panel" aria-label="Toggle properties panel">
            {showRightPanel ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {errorMsg && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-1.5 flex items-center justify-between text-xs text-red-400 shrink-0 z-10">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} className="p-0.5 rounded hover:bg-black/20" aria-label="Dismiss error"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* ─── MAIN EDITOR BODY ─── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* ─── LEFT PANEL: Layers + Background ─── */}
        <aside className={`border-r border-white/10 bg-[#111] flex flex-col overflow-y-auto shrink-0 transition-all duration-300 ease-in-out ${showLeftPanel ? 'w-60 xl:w-64 opacity-100' : 'w-0 opacity-0 overflow-hidden'} hidden md:flex`}>
          
          {/* Background Designer section */}
          <div className="p-3 border-b border-white/5 space-y-3">
            <h3 className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.15em] uppercase text-white/40"><Palette className="h-3 w-3" /> Canvas Fill</h3>
            
            {/* Background Mode toggle */}
            <div className="grid grid-cols-4 gap-0.5 bg-black/40 border border-white/10 rounded-lg p-0.5 text-[9px] font-bold">
              {(['preset', 'solid', 'gradient', 'upload'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTemplate(prev => ({ ...prev, bgType: mode }))}
                  className={`py-1 rounded capitalize ${template.bgType === mode ? 'bg-[var(--primary)] text-black' : 'text-white/60 hover:text-white'}`}
                >
                  {mode.slice(0, 4)}
                </button>
              ))}
            </div>

            {/* Presets */}
            {template.bgType === 'preset' && (
              <div className="grid grid-cols-2 gap-1.5 animate-fade-in">
                {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((pKey) => (
                  <button key={pKey} type="button" onClick={() => setTemplate(prev => ({ ...prev, bgPresetId: pKey, bgImageUrl: undefined }))} className={`h-10 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition ${template.bgPresetId === pKey ? 'border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)]' : 'border-white/10 hover:bg-white/5 text-white/50'}`} aria-label={`${pKey} preset`}>{pKey}</button>
                ))}
              </div>
            )}

            {/* Solid color */}
            {template.bgType === 'solid' && (
              <div className="flex items-center gap-2 animate-fade-in">
                <input
                  type="color"
                  value={template.bgSolidColor || '#fcfbfa'}
                  onChange={(e) => setTemplate(prev => ({ ...prev, bgSolidColor: e.target.value }))}
                  className="h-8 w-12 border border-white/10 rounded bg-transparent cursor-pointer p-0"
                />
                <input
                  type="text"
                  value={template.bgSolidColor || ''}
                  onChange={(e) => setTemplate(prev => ({ ...prev, bgSolidColor: e.target.value }))}
                  className="flex-1 bg-black/30 border border-white/10 rounded-lg text-xs font-mono px-2 py-1 text-white/70"
                />
              </div>
            )}

            {/* Gradients */}
            {template.bgType === 'gradient' && (
              <div className="space-y-2 animate-fade-in">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={template.bgGradient?.color1 || '#1e3a8a'}
                    onChange={(e) => setTemplate(prev => ({ ...prev, bgGradient: { ...(prev.bgGradient || { color1: '', color2: '', angle: 135 }), color1: e.target.value } }))}
                    className="h-7 w-10 border border-white/10 rounded bg-transparent cursor-pointer p-0"
                    title="Color 1"
                  />
                  <input
                    type="color"
                    value={template.bgGradient?.color2 || '#dcb36c'}
                    onChange={(e) => setTemplate(prev => ({ ...prev, bgGradient: { ...(prev.bgGradient || { color1: '', color2: '', angle: 135 }), color2: e.target.value } }))}
                    className="h-7 w-10 border border-white/10 rounded bg-transparent cursor-pointer p-0"
                    title="Color 2"
                  />
                  <div className="flex-1 text-[10px] text-white/40 flex items-center justify-between">
                    <span>Angle</span>
                    <input
                      type="number"
                      value={template.bgGradient?.angle ?? 135}
                      onChange={(e) => setTemplate(prev => ({ ...prev, bgGradient: { ...(prev.bgGradient || { color1: '', color2: '', angle: 135 }), angle: parseInt(e.target.value) || 0 } }))}
                      className="w-12 bg-black/30 border border-white/10 rounded px-1.5 py-0.5 text-center text-white"
                    />
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={template.bgGradient?.angle ?? 135}
                  onChange={(e) => setTemplate(prev => ({ ...prev, bgGradient: { ...(prev.bgGradient || { color1: '', color2: '', angle: 135 }), angle: parseInt(e.target.value) || 0 } }))}
                  className="w-full accent-[var(--primary)] h-1"
                />
              </div>
            )}

            {/* Custom image background uploader */}
            {template.bgType === 'upload' && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="flex items-center justify-center gap-1 w-full py-1.5 border border-dashed border-white/15 hover:border-white/30 rounded-lg text-[10px] font-semibold text-white/50 cursor-pointer" aria-label="Upload background image">
                  <Upload className="h-3 w-3" /> Upload BG Image
                  <input type="file" accept="image/*" onChange={handleBGUpload} className="hidden" />
                </label>
                {template.bgImageUrl && (
                  <>
                    <select value={template.bgScaleMode} onChange={(e) => setTemplate(prev => ({ ...prev, bgScaleMode: e.target.value as CertificateTemplate['bgScaleMode'] }))} className="w-full bg-black/30 rounded-lg border border-white/10 text-[10px] px-2 py-1 text-white/70 focus:outline-none" aria-label="Background scale mode">
                      <option value="fit" className="bg-[var(--bg)]">Fit</option><option value="fill" className="bg-[var(--bg)]">Fill</option><option value="stretch" className="bg-[var(--bg)]">Stretch</option><option value="center" className="bg-[var(--bg)]">Center</option>
                    </select>
                    <button type="button" onClick={() => setTemplate(prev => ({ ...prev, bgType: 'preset', bgPresetId: 'classic', bgImageUrl: undefined }))} className="w-full text-center text-[9px] font-bold text-red-400 hover:text-red-300" aria-label="Remove background image">Remove Custom Image</button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Layers list */}
          <div className="p-3 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.15em] uppercase text-white/40"><Layers className="h-3 w-3" /> Layers</h3>
              <div className="relative group">
                <button type="button" className="flex items-center gap-1 px-2 py-1 bg-[var(--primary)] hover:opacity-90 text-black text-[10px] font-bold rounded-lg shadow transition" aria-label="Add layer"><Plus className="h-3 w-3" /> Add</button>
                <div className="absolute right-0 mt-1 w-40 bg-[#1a1a1a] border border-white/10 rounded-lg py-1 hidden group-hover:block hover:block z-30 shadow-2xl">
                  {([['custom', 'Custom Text', Type, 'text-blue-400'], ['name', 'Attendee Name', Type, 'text-[var(--primary)]'], ['event', 'Event Title', Type, 'text-[var(--primary)]'], ['date', 'Date', Type, 'text-[var(--primary)]'], ['certificate_id', 'Cert ID', ShieldCheck, 'text-[var(--primary)]'], ['organization', 'Organization', Type, 'text-[var(--primary)]'], ['role', 'Role', Type, 'text-[var(--primary)]'], ['signature', 'Signature', FileText, 'text-amber-500'], ['qr_code', 'QR Code', QrCode, 'text-purple-400']] as const).map(([type, label, Icon, cls]) => (
                    <button key={type} type="button" onClick={() => addCustomLayer(type as CertificateLayer['type'])} className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-left w-full text-white/70 hover:bg-white/10">
                      <Icon className={`h-3 w-3 ${cls}`} />{label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0 pr-0.5">
              {template.layers.map((layer, index) => (
                <div key={layer.id} onClick={() => { setSelectedLayerId(layer.id); setMobilePanel('none'); }} className={`flex flex-col p-2 rounded-lg border transition cursor-pointer ${selectedLayerId === layer.id ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'}`}>
                  <div className="flex items-center justify-between gap-1">
                    <input type="text" value={layer.name} onChange={(e) => updateSingleLayer(layer.id, { name: e.target.value })} onClick={(e) => e.stopPropagation()} className="bg-transparent border-0 text-[10px] font-bold text-white/80 p-0 w-24 focus:ring-0" aria-label={`Rename layer ${layer.name}`} />
                    <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => updateSingleLayer(layer.id, { locked: !layer.locked })} className={`p-0.5 rounded hover:bg-white/10 ${layer.locked ? 'text-amber-500' : 'text-white/30'}`} aria-label={layer.locked ? 'Unlock layer' : 'Lock layer'}>{layer.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}</button>
                      <button type="button" onClick={() => updateSingleLayer(layer.id, { visibility: !layer.visibility })} className={`p-0.5 rounded hover:bg-white/10 ${!layer.visibility ? 'text-red-400' : 'text-white/30'}`} aria-label={layer.visibility ? 'Hide layer' : 'Show layer'}>{layer.visibility ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}</button>
                      <button type="button" onClick={() => duplicateLayer(layer)} className="p-0.5 rounded hover:bg-white/10 text-white/30" title="Duplicate" aria-label="Duplicate layer"><Copy className="h-3 w-3" /></button>
                      <button type="button" onClick={() => deleteLayer(layer.id)} className="p-0.5 rounded hover:bg-white/10 text-red-500" title="Delete" aria-label="Delete layer"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-0.5" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[8px] text-white/25 bg-white/5 px-1 rounded">{layer.type}</span>
                    <div className="flex items-center gap-0.5">
                      <button type="button" disabled={index === template.layers.length - 1} onClick={() => moveLayer(index, 'up')} className="p-0.5 rounded hover:bg-white/10 disabled:opacity-20 text-white/30" aria-label="Move up"><ChevronUp className="h-3 w-3" /></button>
                      <button type="button" disabled={index === 0} onClick={() => moveLayer(index, 'down')} className="p-0.5 rounded hover:bg-white/10 disabled:opacity-20 text-white/30" aria-label="Move down"><ChevronDown className="h-3 w-3" /></button>
                    </div>
                  </div>
                </div>
              ))}
              {template.layers.length === 0 && <div className="text-center py-4 text-[10px] text-white/25 border border-dashed border-white/10 rounded-lg">No layers yet.</div>}
            </div>
          </div>
        </aside>

        {/* ─── CENTER: Canvas ─── */}
        <main className="flex-1 relative overflow-auto flex items-center justify-center p-4 md:p-6 min-h-0 bg-[#0d0d0d]" onClick={() => { setSelectedLayerId(null); setMobilePanel('none'); }}>
          <div
            className="relative select-none shadow-2xl transition-transform duration-100 ease-out border border-white/5"
            style={{
              width: `${canvasWidth}px`,
              height: `${canvasHeight}px`,
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center center'
            }}
          >
            <div ref={canvasRef} className="absolute inset-0 bg-no-repeat overflow-hidden transition-all duration-300" style={getBackgroundStyle()}>
              {showGrid && <>
                <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(to right, rgba(220,179,108,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(220,179,108,0.08) 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
                <div className="absolute inset-[10%] border border-dashed border-[var(--primary)]/25 pointer-events-none rounded-sm" />
                <div className="absolute left-1/2 top-0 bottom-0 border-l border-red-500/15 pointer-events-none" />
                <div className="absolute top-1/2 left-0 right-0 border-t border-red-500/15 pointer-events-none" />
              </>}

              {template.layers.map((layer) => {
                if (!layer.visibility) return null;
                const isSelected = selectedLayerId === layer.id;
                let transformStyle = `translate(-50%, -50%) rotate(${layer.rotation}deg)`;
                if (layer.alignment === 'left') transformStyle = `translate(0, -50%) rotate(${layer.rotation}deg)`;
                else if (layer.alignment === 'right') transformStyle = `translate(-100%, -50%) rotate(${layer.rotation}deg)`;

                return (
                  <div key={layer.id}
                    onMouseDown={(e) => handlePointerDown(e, layer)}
                    onTouchStart={(e) => handlePointerDown(e, layer)}
                    onClick={(e) => { e.stopPropagation(); setSelectedLayerId(layer.id); }}
                    className={`absolute select-none ${layer.locked ? 'cursor-not-allowed' : 'cursor-move'} ${isSelected ? 'ring-1 ring-[var(--primary)] ring-offset-1 ring-offset-transparent' : 'hover:ring-1 hover:ring-white/15'}`}
                    style={{
                      left: `${layer.x}%`, top: `${layer.y}%`, transform: transformStyle, opacity: layer.opacity,
                      zIndex: template.layers.findIndex(l => l.id === layer.id) + 10,
                      transformOrigin: layer.alignment === 'left' ? 'left center' : layer.alignment === 'right' ? 'right center' : 'center center',
                    }}>
                    {isSelected && (
                      <div className="absolute -inset-1 border border-dashed border-[var(--primary)]/60 pointer-events-none">
                        <div className="absolute -top-1 -left-1 w-2 h-2 bg-white border border-[var(--primary)] rounded-full" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-white border border-[var(--primary)] rounded-full" />
                        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white border border-[var(--primary)] rounded-full" />
                        <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white border border-[var(--primary)] rounded-full" />
                      </div>
                    )}

                    {layer.type === 'qr_code' ? (
                      <div className="bg-white p-1 border border-black/10 rounded flex items-center justify-center animate-fade-in" style={{ width: `${layer.fontSize * (layer.scale || 1.0)}px`, height: `${layer.fontSize * (layer.scale || 1.0)}px` }}>
                        <svg className="w-full h-full" viewBox="0 0 100 100"><rect x="0" y="0" width="25" height="25" fill="black" /><rect x="5" y="5" width="15" height="15" fill="white" /><rect x="8" y="8" width="9" height="9" fill="black" /><rect x="75" y="0" width="25" height="25" fill="black" /><rect x="80" y="5" width="15" height="15" fill="white" /><rect x="83" y="8" width="9" height="9" fill="black" /><rect x="0" y="75" width="25" height="25" fill="black" /><rect x="5" y="80" width="15" height="15" fill="white" /><rect x="8" y="83" width="9" height="9" fill="black" /><rect x="35" y="10" width="10" height="10" fill="black" /><rect x="55" y="20" width="15" height="10" fill="black" /><rect x="40" y="45" width="20" height="20" fill="black" /></svg>
                      </div>
                    ) : layer.type === 'signature' && layer.signatureType === 'image' && layer.signatureImageUrl ? (
                      <img src={layer.signatureImageUrl} alt="Signature" className="object-contain animate-fade-in" style={{ maxHeight: `${layer.fontSize * 3 * (layer.scale || 1.0)}px`, maxWidth: '180px' }} />
                    ) : (
                      <div style={getFontStyle(layer)} className="transition-all duration-75">{getRenderText(layer)}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        {/* ─── RIGHT PANEL: Properties ─── */}
        <aside className={`border-l border-white/10 bg-[#111] flex flex-col overflow-y-auto shrink-0 transition-all duration-300 ease-in-out ${showRightPanel ? 'w-64 xl:w-72 opacity-100' : 'w-0 opacity-0 overflow-hidden'} hidden md:flex`}>
          {selectedLayer ? (
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div>
                  <h3 className="text-[10px] font-bold tracking-wider uppercase text-white/40">Properties</h3>
                  <span className="text-[10px] text-[var(--primary)] font-bold">{selectedLayer.name}</span>
                </div>
                <button type="button" onClick={() => setSelectedLayerId(null)} className="p-1 rounded hover:bg-white/10 text-white/30" aria-label="Deselect layer"><X className="h-3.5 w-3.5" /></button>
              </div>

              {/* D-Pad Arrow Nudging controls */}
              <div>
                <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider block mb-1">Nudge Nudging controls</span>
                <div className="grid grid-cols-3 gap-1 w-28 mx-auto bg-black/20 p-1.5 rounded-xl border border-white/5">
                  <div />
                  <button type="button" onClick={() => nudgeSelected('up', 0.5)} className="p-1 hover:bg-white/10 text-white/60 rounded flex items-center justify-center" title="Nudge Up"><ArrowUpIcon className="h-3.5 w-3.5" /></button>
                  <div />
                  <button type="button" onClick={() => nudgeSelected('left', 0.5)} className="p-1 hover:bg-white/10 text-white/60 rounded flex items-center justify-center" title="Nudge Left"><ArrowLeftIcon className="h-3.5 w-3.5" /></button>
                  <div className="text-[8px] flex items-center justify-center font-bold text-white/30">D-Pad</div>
                  <button type="button" onClick={() => nudgeSelected('right', 0.5)} className="p-1 hover:bg-white/10 text-white/60 rounded flex items-center justify-center" title="Nudge Right"><ArrowRightIcon className="h-3.5 w-3.5" /></button>
                  <div />
                  <button type="button" onClick={() => nudgeSelected('down', 0.5)} className="p-1 hover:bg-white/10 text-white/60 rounded flex items-center justify-center" title="Nudge Down"><ArrowDownIcon className="h-3.5 w-3.5" /></button>
                  <div />
                </div>
              </div>

              {/* Position and coordinates editing */}
              <div className="grid grid-cols-2 gap-1.5 bg-white/[0.03] p-2 rounded-lg border border-white/5">
                <div>
                  <label className="text-[8px] font-bold text-white/25 uppercase tracking-wider block">X coordinate (%)</label>
                  <input type="number" step="0.5" min="0" max="100" value={Math.round(selectedLayer.x * 10) / 10} onChange={(e) => updateSingleLayer(selectedLayer.id, { x: parseFloat(e.target.value) || 0 })} onBlur={() => pushHistory(template.layers)} className="w-full mt-0.5 bg-transparent border-0 text-[10px] text-center font-mono focus:ring-0 focus:outline-none text-white/60" />
                </div>
                <div>
                  <label className="text-[8px] font-bold text-white/25 uppercase tracking-wider block">Y coordinate (%)</label>
                  <input type="number" step="0.5" min="0" max="100" value={Math.round(selectedLayer.y * 10) / 10} onChange={(e) => updateSingleLayer(selectedLayer.id, { y: parseFloat(e.target.value) || 0 })} onBlur={() => pushHistory(template.layers)} className="w-full mt-0.5 bg-transparent border-0 text-[10px] text-center font-mono focus:ring-0 focus:outline-none text-white/60" />
                </div>
              </div>

              {/* Alignments */}
              <div>
                <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider block mb-1.5">Canvas Layout Alignment</span>
                <div className="grid grid-cols-4 gap-1">
                  {([['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]] as const).map(([a, Icon]) => (
                    <button key={a} type="button" onClick={() => handleAlignment(a)} className="p-1.5 border border-white/10 bg-white/[0.03] hover:bg-white/10 rounded-lg flex items-center justify-center" title={`Align ${a}`} aria-label={`Align ${a}`}><Icon className="h-3 w-3 text-white/60" /></button>
                  ))}
                  <button type="button" onClick={() => handleAlignment('center-v')} className="p-1.5 border border-white/10 bg-white/[0.03] hover:bg-white/10 rounded-lg flex items-center justify-center text-[8px] font-bold text-white/60" title="Center Vertically" aria-label="Center vertically">V</button>
                </div>
              </div>

              {/* Custom Text Content */}
              {selectedLayer.type === 'custom' && (
                <div>
                  <label className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Text Content</label>
                  <textarea value={selectedLayer.text} onChange={(e) => updateSingleLayer(selectedLayer.id, { text: e.target.value })} onBlur={() => pushHistory(template.layers)} className="w-full mt-1 bg-white/5 rounded-lg border border-white/10 text-[10px] p-2 focus:ring-0 focus:outline-none text-white/80 resize-none" rows={2} />
                </div>
              )}

              {/* Verification link target override (QR code specific) */}
              {selectedLayer.type === 'qr_code' && (
                <div>
                  <label className="text-[9px] font-bold text-white/30 uppercase tracking-wider">QR Code verification URL</label>
                  <input type="text" placeholder="https://verify.theguild.co/..." value={selectedLayer.text} onChange={(e) => updateSingleLayer(selectedLayer.id, { text: e.target.value })} onBlur={() => pushHistory(template.layers)} className="w-full mt-1 bg-white/5 rounded-lg border border-white/10 text-[10px] px-2 py-1.5 text-white/70 focus:outline-none" />
                </div>
              )}

              {/* Signature configuration */}
              {selectedLayer.type === 'signature' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-1 text-[9px] font-bold">
                    <button type="button" onClick={() => { const f = template.layers.map(l => l.id === selectedLayer.id ? { ...l, signatureType: 'text' as const } : l); updateLayers(f); }} className={`py-1 rounded-lg border ${selectedLayer.signatureType === 'text' ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]' : 'border-white/10 text-white/50'}`}>Text signature</button>
                    <button type="button" onClick={() => { const f = template.layers.map(l => l.id === selectedLayer.id ? { ...l, signatureType: 'image' as const } : l); updateLayers(f); }} className={`py-1 rounded-lg border ${selectedLayer.signatureType === 'image' ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]' : 'border-white/10 text-white/50'}`}>PNG signature</button>
                  </div>
                  {selectedLayer.signatureType === 'text' ? (
                    <input type="text" value={selectedLayer.text} onChange={(e) => updateSingleLayer(selectedLayer.id, { text: e.target.value })} onBlur={() => pushHistory(template.layers)} className="w-full bg-white/5 rounded-lg border border-white/10 text-[10px] px-2 py-1 focus:ring-0 focus:outline-none text-white/80" />
                  ) : (
                    <label className="flex items-center justify-center gap-1 w-full py-1.5 border border-dashed border-white/15 rounded-lg text-[10px] font-semibold text-white/50 cursor-pointer">
                      <Upload className="h-3 w-3" /> Upload PNG Image
                      <input type="file" accept="image/png" onChange={(e) => handleSignatureUpload(e, selectedLayer.id)} className="hidden" />
                    </label>
                  )}
                </div>
              )}

              {/* Font Family selector */}
              {selectedLayer.type !== 'qr_code' && !(selectedLayer.type === 'signature' && selectedLayer.signatureType === 'image') && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Font Family</label>
                    <select value={selectedLayer.fontFamily} onChange={(e) => { const f = template.layers.map(l => l.id === selectedLayer.id ? { ...l, fontFamily: e.target.value } : l); updateLayers(f); }} className="w-full mt-1 bg-white/5 rounded-lg border border-white/10 text-[10px] px-2 py-1 focus:ring-0 focus:outline-none text-white/70" aria-label="Font family">
                      <option value="sans-serif" className="bg-[var(--bg)] font-sans">Default Sans (Inter)</option>
                      <option value="serif" className="bg-[var(--bg)] font-serif">Default Serif (Georgia)</option>
                      <option value="cursive" className="bg-[var(--bg)] font-mono">Calligraphy Script</option>
                      <option value="cinzel" className="bg-[var(--bg)]">Cinzel Premium</option>
                      <option value="montserrat" className="bg-[var(--bg)]">Montserrat Bold</option>
                      <option value="outfit" className="bg-[var(--bg)]">Outfit Modern</option>
                      <option value="alex-brush" className="bg-[var(--bg)]">Elegant Brush Script</option>
                      <option value="monospace" className="bg-[var(--bg)] font-mono">Fira Monospace</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Font Size</label>
                      <input type="number" min="8" max="120" value={selectedLayer.fontSize} onChange={(e) => updateSingleLayer(selectedLayer.id, { fontSize: parseInt(e.target.value) || 12 })} onBlur={() => pushHistory(template.layers)} className="w-full mt-1 bg-white/5 rounded-lg border border-white/10 text-[10px] px-2 py-1 focus:ring-0 focus:outline-none text-white/70" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Font Weight</label>
                      <select value={selectedLayer.fontWeight} onChange={(e) => { const f = template.layers.map(l => l.id === selectedLayer.id ? { ...l, fontWeight: e.target.value } : l); updateLayers(f); }} className="w-full mt-1 bg-white/5 rounded-lg border border-white/10 text-[10px] px-2 py-1 focus:ring-0 focus:outline-none text-white/70" aria-label="Font weight">
                        <option value="normal" className="bg-[var(--bg)]">Normal</option><option value="semibold" className="bg-[var(--bg)]">Semibold</option><option value="bold" className="bg-[var(--bg)]">Bold</option><option value="800" className="bg-[var(--bg)]">Extra Bold</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => { const f = template.layers.map(l => l.id === selectedLayer.id ? { ...l, italic: !l.italic } : l); updateLayers(f); }} className={`flex-1 py-1 rounded-lg border text-[9px] font-bold ${selectedLayer.italic ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]' : 'border-white/10 text-white/40'}`}>Italic</button>
                    <button type="button" onClick={() => { const f = template.layers.map(l => l.id === selectedLayer.id ? { ...l, underline: !l.underline } : l); updateLayers(f); }} className={`flex-1 py-1 rounded-lg border text-[9px] font-bold ${selectedLayer.underline ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]' : 'border-white/10 text-white/40'}`}>Underline</button>
                  </div>
                </div>
              )}

              {/* Text Outline / Stroke */}
              {selectedLayer.type !== 'qr_code' && !(selectedLayer.type === 'signature' && selectedLayer.signatureType === 'image') && (
                <div className="space-y-1.5 border-t border-white/5 pt-2">
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider block">Outline text stroke</span>
                  <div className="flex items-center gap-2">
                    <input type="color" value={selectedLayer.strokeColor || '#ffffff'} onChange={(e) => updateSingleLayer(selectedLayer.id, { strokeColor: e.target.value })} onBlur={() => pushHistory(template.layers)} className="h-6 w-8 border border-white/10 rounded bg-transparent cursor-pointer p-0" aria-label="Stroke color" />
                    <div className="flex-1 text-[10px] text-white/50 flex items-center justify-between">
                      <span>Thickness (px)</span>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={selectedLayer.strokeWidth || 0}
                        onChange={(e) => updateSingleLayer(selectedLayer.id, { strokeWidth: parseFloat(e.target.value) || 0 })}
                        onBlur={() => pushHistory(template.layers)}
                        className="w-10 bg-black/30 border border-white/10 rounded px-1 text-center font-mono text-white text-[10px]"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="8"
                    step="0.5"
                    value={selectedLayer.strokeWidth || 0}
                    onChange={(e) => updateSingleLayer(selectedLayer.id, { strokeWidth: parseFloat(e.target.value) || 0 })}
                    onMouseUp={() => pushHistory(template.layers)}
                    onTouchEnd={() => pushHistory(template.layers)}
                    className="w-full accent-[var(--primary)] h-1"
                  />
                </div>
              )}

              {/* Text Shadows */}
              {selectedLayer.type !== 'qr_code' && !(selectedLayer.type === 'signature' && selectedLayer.signatureType === 'image') && (
                <div className="space-y-2 border-t border-white/5 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Drop Shadow</span>
                    <button
                      type="button"
                      onClick={() => {
                        const nextShadow = selectedLayer.shadow ? undefined : { color: '#000000', blur: 4, offsetX: 2, offsetY: 2 };
                        const f = template.layers.map(l => l.id === selectedLayer.id ? { ...l, shadow: nextShadow } : l);
                        updateLayers(f);
                      }}
                      className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${selectedLayer.shadow ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-white/10 text-white/40'}`}
                    >
                      {selectedLayer.shadow ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  {selectedLayer.shadow && (
                    <div className="space-y-1.5 text-[9px] text-white/50 animate-fade-in">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={selectedLayer.shadow.color}
                          onChange={(e) => updateSingleLayer(selectedLayer.id, { shadow: { ...selectedLayer.shadow!, color: e.target.value } })}
                          onBlur={() => pushHistory(template.layers)}
                          className="h-5 w-7 border border-white/10 rounded cursor-pointer p-0 bg-transparent"
                        />
                        <span className="font-mono text-[8px]">{selectedLayer.shadow.color}</span>
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex justify-between"><span>Blur radius</span><span>{selectedLayer.shadow.blur}px</span></div>
                        <input type="range" min="0" max="20" value={selectedLayer.shadow.blur} onChange={(e) => updateSingleLayer(selectedLayer.id, { shadow: { ...selectedLayer.shadow!, blur: parseInt(e.target.value) || 0 } })} onMouseUp={() => pushHistory(template.layers)} className="w-full accent-[var(--primary)] h-1" />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <div className="flex justify-between text-[8px]"><span>Offset X</span><span>{selectedLayer.shadow.offsetX}px</span></div>
                          <input type="range" min="-15" max="15" value={selectedLayer.shadow.offsetX} onChange={(e) => updateSingleLayer(selectedLayer.id, { shadow: { ...selectedLayer.shadow!, offsetX: parseInt(e.target.value) || 0 } })} onMouseUp={() => pushHistory(template.layers)} className="w-full accent-[var(--primary)] h-1" />
                        </div>
                        <div>
                          <div className="flex justify-between text-[8px]"><span>Offset Y</span><span>{selectedLayer.shadow.offsetY}px</span></div>
                          <input type="range" min="-15" max="15" value={selectedLayer.shadow.offsetY} onChange={(e) => updateSingleLayer(selectedLayer.id, { shadow: { ...selectedLayer.shadow!, offsetY: parseInt(e.target.value) || 0 } })} onMouseUp={() => pushHistory(template.layers)} className="w-full accent-[var(--primary)] h-1" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Text color and Stroke color picker */}
              {selectedLayer.type !== 'qr_code' && !(selectedLayer.type === 'signature' && selectedLayer.signatureType === 'image') && (
                <div className="grid grid-cols-2 gap-1.5 border-t border-white/5 pt-2">
                  <div>
                    <label className="text-[9px] font-bold text-white/30 uppercase tracking-wider block">Font Color</label>
                    <div className="flex items-center gap-1 mt-1">
                      <input type="color" value={selectedLayer.color} onChange={(e) => updateSingleLayer(selectedLayer.id, { color: e.target.value })} onBlur={() => pushHistory(template.layers)} className="h-6 w-8 border border-white/10 rounded bg-transparent cursor-pointer p-0" aria-label="Text color" />
                      <input type="text" value={selectedLayer.color} onChange={(e) => updateSingleLayer(selectedLayer.id, { color: e.target.value })} onBlur={() => pushHistory(template.layers)} className="w-full bg-white/5 border border-white/10 rounded-lg text-[9px] px-1.5 py-0.5 text-center font-mono focus:outline-none text-white/70" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-white/30 uppercase tracking-wider block">Text Align</label>
                    <div className="flex gap-1 mt-1.5">
                      {(['left', 'center', 'right'] as const).map(a => (
                        <button key={a} type="button" onClick={() => { const f = template.layers.map(l => l.id === selectedLayer.id ? { ...l, alignment: a } : l); updateLayers(f); }} className={`flex-1 py-1 text-[8px] font-bold rounded-lg border uppercase ${selectedLayer.alignment === a ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]' : 'border-white/10 text-white/40'}`}>{a.slice(0, 3)}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Letter spacing + Line heights */}
              {selectedLayer.type !== 'qr_code' && !(selectedLayer.type === 'signature' && selectedLayer.signatureType === 'image') && (
                <div className="grid grid-cols-2 gap-1.5 border-t border-white/5 pt-2">
                  <div>
                    <label className="text-[8px] font-bold text-white/30 uppercase tracking-wider block">Spacing (px)</label>
                    <input type="number" step="0.5" value={selectedLayer.letterSpacing || 0} onChange={(e) => updateSingleLayer(selectedLayer.id, { letterSpacing: parseFloat(e.target.value) || 0 })} onBlur={() => pushHistory(template.layers)} className="w-full mt-0.5 bg-white/5 border border-white/10 rounded-lg text-[10px] text-center font-mono focus:outline-none text-white/70 py-0.5" />
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-white/30 uppercase tracking-wider block">Line Height</label>
                    <input type="number" step="0.1" min="0.5" max="3" value={selectedLayer.lineHeight || 1.2} onChange={(e) => updateSingleLayer(selectedLayer.id, { lineHeight: parseFloat(e.target.value) || 1.2 })} onBlur={() => pushHistory(template.layers)} className="w-full mt-0.5 bg-white/5 border border-white/10 rounded-lg text-[10px] text-center font-mono focus:outline-none text-white/70 py-0.5" />
                  </div>
                </div>
              )}

              {/* Opacity + Rotation */}
              <div className="space-y-2 border-t border-white/5 pt-2">
                <div>
                  <div className="flex justify-between text-[9px] font-bold text-white/30 uppercase tracking-wider"><span>Layer Opacity</span><span className="font-mono text-white/50">{Math.round(selectedLayer.opacity * 100)}%</span></div>
                  <input type="range" min="0" max="1" step="0.05" value={selectedLayer.opacity} onChange={(e) => updateSingleLayer(selectedLayer.id, { opacity: parseFloat(e.target.value) })} onMouseUp={() => pushHistory(template.layers)} onTouchEnd={() => pushHistory(template.layers)} className="w-full mt-1 accent-[var(--primary)] h-1" />
                </div>
                <div>
                  <div className="flex justify-between text-[9px] font-bold text-white/30 uppercase tracking-wider"><span>Rotation</span><span className="font-mono text-white/50">{selectedLayer.rotation}°</span></div>
                  <input type="range" min="0" max="360" step="1" value={selectedLayer.rotation} onChange={(e) => updateSingleLayer(selectedLayer.id, { rotation: parseInt(e.target.value) || 0 })} onMouseUp={() => pushHistory(template.layers)} onTouchEnd={() => pushHistory(template.layers)} className="w-full mt-1 accent-[var(--primary)] h-1" />
                </div>
              </div>

              {/* Scale for QR/Signature Image */}
              {(selectedLayer.type === 'qr_code' || (selectedLayer.type === 'signature' && selectedLayer.signatureType === 'image')) && (
                <div className="border-t border-white/5 pt-2">
                  <div className="flex justify-between text-[9px] font-bold text-white/30 uppercase tracking-wider"><span>Dimension Scale</span><span className="font-mono text-white/50">{Math.round((selectedLayer.scale || 1) * 100)}%</span></div>
                  <input type="range" min="0.2" max="3" step="0.05" value={selectedLayer.scale || 1} onChange={(e) => updateSingleLayer(selectedLayer.id, { scale: parseFloat(e.target.value) })} onMouseUp={() => pushHistory(template.layers)} onTouchEnd={() => pushHistory(template.layers)} className="w-full mt-1 accent-[var(--primary)] h-1" />
                </div>
              )}

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
              <Settings className="h-5 w-5 text-white/15 mb-2 animate-pulse" />
              <span className="text-[10px] text-white/25">Select a layer on the canvas to inspect and edit its properties.</span>
            </div>
          )}
        </aside>
      </div>

      {/* ─── MOBILE BOTTOM BAR ─── */}
      <div className="flex md:hidden border-t border-white/10 bg-[#111] px-2 py-1.5 gap-1.5 shrink-0 z-20">
        <button type="button" onClick={() => setMobilePanel(mobilePanel === 'layers' ? 'none' : 'layers')} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-bold transition ${mobilePanel === 'layers' ? 'bg-[var(--primary)]/20 text-[var(--primary)]' : 'bg-white/5 text-white/50'}`} aria-label="Toggle layers panel"><Layers className="h-3.5 w-3.5" /> Layers</button>
        <button type="button" onClick={() => setMobilePanel(mobilePanel === 'properties' ? 'none' : 'properties')} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-bold transition ${mobilePanel === 'properties' ? 'bg-[var(--primary)]/20 text-[var(--primary)]' : 'bg-white/5 text-white/50'}`} aria-label="Toggle properties panel"><Settings className="h-3.5 w-3.5" /> Properties</button>
        <select value={previewIndex} onChange={(e) => setPreviewIndex(parseInt(e.target.value) || 0)} className="flex-1 bg-white/5 rounded-lg border-0 text-[9px] font-bold text-white/60 py-2 text-center focus:ring-0" aria-label="Preview as attendee">
          {PREVIEW_PARTICIPANTS.map((p, i) => <option key={p.certificate_id} value={i} className="bg-[var(--bg)]">{p.name}</option>)}
        </select>
      </div>

      {/* ─── MOBILE SLIDE-UP PANEL ─── */}
      {mobilePanel !== 'none' && (
        <div className="fixed inset-x-0 bottom-0 z-40 md:hidden" onClick={() => setMobilePanel('none')}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-[#111] border-t border-white/10 rounded-t-2xl max-h-[70vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-[#111] border-b border-white/5 px-4 py-2.5 flex items-center justify-between z-10">
              <h3 className="text-xs font-bold text-white/70">{mobilePanel === 'layers' ? 'Layers & Background' : 'Properties'}</h3>
              <button type="button" onClick={() => setMobilePanel('none')} className="p-1 rounded-lg hover:bg-white/10 text-white/40" aria-label="Close panel"><X className="h-4 w-4" /></button>
            </div>

            <div className="p-4">
              {mobilePanel === 'layers' && (
                <div className="space-y-3">
                  {/* BG Presets */}
                  <div>
                    <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Background</h4>
                    <div className="grid grid-cols-4 gap-1.5 text-center">
                      {(['preset', 'solid', 'gradient', 'upload'] as const).map(mode => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setTemplate(prev => ({ ...prev, bgType: mode }))}
                          className={`py-1.5 rounded-lg border text-[9px] font-bold uppercase ${template.bgType === mode ? 'border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)]' : 'border-white/10 text-white/50'}`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Layers */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Layers</h4>
                      <div className="relative group">
                        <button type="button" className="flex items-center gap-1 px-2 py-1 bg-[var(--primary)] text-black text-[9px] font-bold rounded-lg"><Plus className="h-3 w-3" /> Add</button>
                        <div className="absolute right-0 bottom-full mb-1 w-40 bg-[#1a1a1a] border border-white/10 rounded-lg py-1 hidden group-hover:block hover:block z-50 shadow-2xl">
                          {(['custom', 'name', 'event', 'date', 'certificate_id', 'organization', 'role', 'signature', 'qr_code'] as const).map(type => (
                            <button key={type} type="button" onClick={() => addCustomLayer(type)} className="block px-3 py-1.5 text-[10px] w-full text-left text-white/70 hover:bg-white/10 capitalize">{type.replace('_', ' ')}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {template.layers.map((layer) => (
                        <button key={layer.id} type="button" onClick={() => { setSelectedLayerId(layer.id); setMobilePanel('properties'); }} className={`w-full text-left p-2 rounded-lg border text-[10px] font-bold ${selectedLayerId === layer.id ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]' : 'border-white/5 text-white/60'}`}>
                          {layer.name} <span className="text-[8px] text-white/25 ml-1">({layer.type})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {mobilePanel === 'properties' && selectedLayer && (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-[var(--primary)]">{selectedLayer.name}</div>
                  {selectedLayer.type === 'custom' && (
                    <textarea value={selectedLayer.text} onChange={(e) => updateSingleLayer(selectedLayer.id, { text: e.target.value })} onBlur={() => pushHistory(template.layers)} className="w-full bg-white/5 rounded-lg border border-white/10 text-xs p-2 focus:ring-0 focus:outline-none text-white/80 resize-none" rows={2} />
                  )}
                  {selectedLayer.type !== 'qr_code' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-bold text-white/30 block">Font Size</label>
                        <input type="number" value={selectedLayer.fontSize} onChange={(e) => updateSingleLayer(selectedLayer.id, { fontSize: parseInt(e.target.value) || 12 })} onBlur={() => pushHistory(template.layers)} className="w-full mt-1 bg-white/5 rounded-lg border border-white/10 text-xs px-2 py-1.5 focus:ring-0 focus:outline-none text-white/70" />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-white/30 block">Color</label>
                        <input type="color" value={selectedLayer.color} onChange={(e) => updateSingleLayer(selectedLayer.id, { color: e.target.value })} onBlur={() => pushHistory(template.layers)} className="w-full mt-1 h-8 border border-white/10 rounded-lg bg-transparent cursor-pointer" />
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="flex justify-between text-[9px] font-bold text-white/30"><span>Opacity</span><span>{Math.round(selectedLayer.opacity * 100)}%</span></div>
                    <input type="range" min="0" max="1" step="0.05" value={selectedLayer.opacity} onChange={(e) => updateSingleLayer(selectedLayer.id, { opacity: parseFloat(e.target.value) })} onTouchEnd={() => pushHistory(template.layers)} className="w-full mt-1 accent-[var(--primary)]" />
                  </div>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => deleteLayer(selectedLayer.id)} className="flex-1 py-2 bg-red-500/10 text-red-400 text-[10px] font-bold rounded-lg">Delete</button>
                    <button type="button" onClick={() => duplicateLayer(selectedLayer)} className="flex-1 py-2 bg-white/5 text-white/60 text-[10px] font-bold rounded-lg">Duplicate</button>
                  </div>
                </div>
              )}

              {mobilePanel === 'properties' && !selectedLayer && (
                <div className="text-center py-6 text-xs text-white/25">Tap a layer on the canvas to edit it.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Slide-up animation */}
      <style>{`
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </div>
  );
}
