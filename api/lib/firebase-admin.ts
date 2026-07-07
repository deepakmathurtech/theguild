import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

class MemoryDocument {
  private readonly store: MemoryFirestore;
  private readonly path: string;

  constructor(store: MemoryFirestore, path: string) {
    this.store = store;
    this.path = path;
  }

  collection(name: string) {
    return new MemoryCollection(this.store, `${this.path}/${name}`);
  }

  async set(data: Record<string, unknown>, _options?: unknown) {
    this.store.set(this.path, data);
  }

  async get() {
    const data = this.store.get(this.path);
    return {
      exists: data !== undefined,
      data: () => data ?? null,
    };
  }
}

class MemoryCollection {
  private readonly store: MemoryFirestore;
  private readonly path: string;

  constructor(store: MemoryFirestore, path: string) {
    this.store = store;
    this.path = path;
  }

  doc(id: string) {
    return new MemoryDocument(this.store, `${this.path}/${id}`);
  }
}

class MemoryFirestore {
  private readonly data = new Map<string, Record<string, unknown>>();

  collection(name: string) {
    return new MemoryCollection(this, name);
  }

  set(path: string, value: Record<string, unknown>) {
    this.data.set(path, value);
  }

  get(path: string) {
    return this.data.get(path);
  }
}

let fallbackDb: MemoryFirestore | null = null;
let warnedAboutFallback = false;

export function getDbOrFallback() {
  if (getApps().length) {
    return getFirestore();
  }

  const serviceAccount = process.env.FIREBASE_ADMIN_SA_JSON;
  if (serviceAccount) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'guild-b8bf9';
    initializeApp({
      credential: cert(JSON.parse(serviceAccount)),
      projectId,
    });
    return getFirestore();
  }

  if (!warnedAboutFallback) {
    console.warn('Firebase Admin credentials are not configured; using an in-memory fallback for local development.');
    warnedAboutFallback = true;
  }

  if (!fallbackDb) {
    fallbackDb = new MemoryFirestore();
  }

  return fallbackDb as unknown as ReturnType<typeof getFirestore>;
}
