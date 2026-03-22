// Offline email cache using IndexedDB for large storage capacity

const DB_NAME = "afuchat-offline";
const DB_VERSION = 1;
const EMAILS_STORE = "emails";
const META_STORE = "meta";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(EMAILS_STORE)) {
        const store = db.createObjectStore(EMAILS_STORE, { keyPath: "id" });
        store.createIndex("folder_id", "folder_id", { unique: false });
        store.createIndex("email_address_id", "email_address_id", { unique: false });
        store.createIndex("user_id", "user_id", { unique: false });
        store.createIndex("created_at", "created_at", { unique: false });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };
  });
}

export async function cacheEmails(emails: any[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(EMAILS_STORE, "readwrite");
    const store = tx.objectStore(EMAILS_STORE);
    for (const email of emails) {
      store.put(email);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (e) {
    console.warn("Failed to cache emails:", e);
  }
}

export async function getCachedEmails(filters: {
  userId?: string;
  folderId?: string | null;
  emailAddressId?: string | null;
  searchQuery?: string;
}): Promise<any[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(EMAILS_STORE, "readonly");
    const store = tx.objectStore(EMAILS_STORE);

    const allEmails: any[] = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    db.close();

    let filtered = allEmails;

    if (filters.userId) {
      filtered = filtered.filter((e) => e.user_id === filters.userId);
    }
    if (filters.emailAddressId && filters.emailAddressId !== "all") {
      filtered = filtered.filter((e) => e.email_address_id === filters.emailAddressId);
    }
    if (filters.folderId) {
      filtered = filtered.filter((e) => e.folder_id === filters.folderId);
    }
    if (filters.searchQuery?.trim()) {
      const q = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.subject?.toLowerCase().includes(q) ||
          e.from_address?.toLowerCase().includes(q) ||
          e.body_text?.toLowerCase().includes(q) ||
          e.to_addresses?.some((a: string) => a.toLowerCase().includes(q))
      );
    }

    // Sort by created_at descending
    filtered.sort(
      (a, b) =>
        new Date(b.created_at || b.received_at || b.sent_at).getTime() -
        new Date(a.created_at || a.received_at || a.sent_at).getTime()
    );

    return filtered;
  } catch (e) {
    console.warn("Failed to read cached emails:", e);
    return [];
  }
}

export async function removeCachedEmail(emailId: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(EMAILS_STORE, "readwrite");
    tx.objectStore(EMAILS_STORE).delete(emailId);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (e) {
    console.warn("Failed to remove cached email:", e);
  }
}

export async function updateCachedEmail(emailId: string, updates: Record<string, any>): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(EMAILS_STORE, "readwrite");
    const store = tx.objectStore(EMAILS_STORE);
    
    const existing: any = await new Promise((resolve, reject) => {
      const req = store.get(emailId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (existing) {
      store.put({ ...existing, ...updates });
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (e) {
    console.warn("Failed to update cached email:", e);
  }
}

export function isOnline(): boolean {
  return navigator.onLine;
}

export function onOnlineStatusChange(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}
