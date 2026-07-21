import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { CertificateTemplate } from './certificateTypes';

export interface ICertificateTemplateStorage {
  loadTemplate(eventId: string): Promise<CertificateTemplate | null>;
  saveTemplate(eventId: string, template: CertificateTemplate): Promise<void>;
  deleteTemplate(eventId: string): Promise<void>;
}

class LocalCertificateTemplateStorage implements ICertificateTemplateStorage {
  private getStorageKey(eventId: string): string {
    return `certificate-template-${eventId}`;
  }

  async loadTemplate(eventId: string): Promise<CertificateTemplate | null> {
    try {
      const key = this.getStorageKey(eventId);
      const val = localStorage.getItem(key);
      if (!val) return null;
      
      const parsed = JSON.parse(val) as CertificateTemplate;
      
      // Basic validation
      if (!parsed.id || !parsed.eventId || !Array.isArray(parsed.layers)) {
        console.warn('Corrupted template loaded from localStorage, skipping.', parsed);
        return null;
      }
      
      return parsed;
    } catch (e) {
      console.error('Failed to load certificate template from localStorage', e);
      return null;
    }
  }

  async saveTemplate(eventId: string, template: CertificateTemplate): Promise<void> {
    try {
      const key = this.getStorageKey(eventId);
      const val = JSON.stringify(template);
      localStorage.setItem(key, val);
    } catch (e) {
      console.error('Failed to save certificate template to localStorage', e);
      throw new Error('Storage limit exceeded or localStorage unavailable');
    }
  }

  async deleteTemplate(eventId: string): Promise<void> {
    try {
      const key = this.getStorageKey(eventId);
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Failed to delete certificate template from localStorage', e);
    }
  }
}

class FirebaseCertificateTemplateStorage implements ICertificateTemplateStorage {
  private localFallback = new LocalCertificateTemplateStorage();
  private collectionName = 'certificateTemplates';

  async loadTemplate(eventId: string): Promise<CertificateTemplate | null> {
    try {
      const docRef = doc(db, this.collectionName, eventId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as CertificateTemplate;
        // Cache to localStorage for fast access and fallback
        await this.localFallback.saveTemplate(eventId, data);
        return data;
      }
      
      // Fallback to local storage if not found on server
      return await this.localFallback.loadTemplate(eventId);
    } catch (e) {
      console.warn('Failed to load template from Firebase, using LocalStorage fallback', e);
      return await this.localFallback.loadTemplate(eventId);
    }
  }

  async saveTemplate(eventId: string, template: CertificateTemplate): Promise<void> {
    try {
      // Save locally first for fast feedback
      await this.localFallback.saveTemplate(eventId, template);
      
      // Save to Firestore
      const docRef = doc(db, this.collectionName, eventId);
      await setDoc(docRef, {
        ...template,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Failed to save template to Firebase', e);
      // Don't throw if we saved locally, but log it
    }
  }

  async deleteTemplate(eventId: string): Promise<void> {
    try {
      await this.localFallback.deleteTemplate(eventId);
      const docRef = doc(db, this.collectionName, eventId);
      await deleteDoc(docRef);
    } catch (e) {
      console.error('Failed to delete template from Firebase', e);
    }
  }
}

// Export a singleton instance of the Firebase-backed storage provider.
export const certificateTemplateStorage: ICertificateTemplateStorage = new FirebaseCertificateTemplateStorage();
