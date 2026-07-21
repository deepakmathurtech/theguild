export interface LayerShadow {
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

export interface CertificateLayer {
  id: string;
  name: string;
  type: 'name' | 'event' | 'date' | 'certificate_id' | 'organization' | 'role' | 'custom' | 'signature' | 'qr_code';
  x: number; // percentage (0 to 100)
  y: number; // percentage (0 to 100)
  fontSize: number; // in pixels at base (e.g. 24)
  fontFamily: string;
  fontWeight: string; // 'normal', 'bold', etc.
  italic: boolean;
  underline: boolean;
  color: string;
  opacity: number; // 0 to 1
  strokeColor?: string;
  strokeWidth?: number; // px
  shadow?: LayerShadow;
  rotation: number; // degrees (0 to 360)
  alignment: 'left' | 'center' | 'right';
  visibility: boolean;
  locked: boolean;
  text: string;
  placeholder?: string;
  letterSpacing?: number; // em or px
  lineHeight?: number; // multiplier
  scale?: number; // multiplier for signature/qr
  signatureType?: 'text' | 'image';
  signatureImageUrl?: string; // base64 string
  qrValue?: string; // e.g. {verification_url}
}

export interface CertificateTemplate {
  id: string;
  eventId: string;
  bgType: 'preset' | 'upload' | 'solid' | 'gradient';
  bgPresetId?: string; // e.g. 'classic', 'minimal', 'emerald', 'dark'
  bgImageUrl?: string; // base64 or storage url
  bgScaleMode: 'fit' | 'fill' | 'stretch' | 'center';
  bgSolidColor?: string;
  bgGradient?: {
    color1: string;
    color2: string;
    angle: number; // in degrees
  };
  orientation?: 'landscape' | 'portrait';
  layers: CertificateLayer[];
  createdAt: string;
  updatedAt: string;
}
