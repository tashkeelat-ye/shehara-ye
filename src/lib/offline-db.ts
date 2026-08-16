const DB_NAME = "tashkilat-offline";
const DB_VERSION = 1;

export type OfflineStoreName =
  | "products"
  | "categories"
  | "settings"
  | "banners"
  | "metadata";

type IdentifiableRecord = {
  id: string;
};

type MetadataRecord = {
  key: string;
  value: unknown;
  updatedAt: string;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function openDatabase(): Promise<IDBDatabase> {
  if (!isBrowser()) {
    return Promise.reject(
      new Error("IndexedDB is only available in a browser environment."),
    );
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains("products")) {
        db.createObjectStore("products", {
          keyPath: "id",
        });
      }

      if (!db.objectStoreNames.contains("categories")) {
        db.createObjectStore("categories", {
          keyPath: "id",
        });
      }

      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", {
          keyPath: "id",
        });
      }

      if (!db.objectStoreNames.contains("banners")) {
        db.createObjectStore("banners", {
          keyPath: "id",
        });
      }

      if (!db.objectStoreNames.contains("metadata")) {
        db.createObjectStore("metadata", {
          keyPath: "key",
        });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(
        request.error ??
          new Error("Failed to open Tashkilat IndexedDB database."),
      );
    };
  });
}

async function runTransaction<T>(
  storeName: OfflineStoreName,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();

  return new Promise<T>((resolve, reject) => {
    let request: IDBRequest<T>;

    try {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);

      request = operation(store);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(
          request.error ??
            new Error(`IndexedDB operation failed: ${storeName}`),
        );
      };

      transaction.onerror = () => {
        reject(
          transaction.error ??
            new Error(`IndexedDB transaction failed: ${storeName}`),
        );
      };

      transaction.oncomplete = () => {
        db.close();
      };
    } catch (error) {
      db.close();
      reject(error);
    }
  });
}

export async function offlinePut<T extends IdentifiableRecord>(
  storeName: Exclude<OfflineStoreName, "metadata">,
  value: T,
): Promise<void> {
  if (!isBrowser()) {
    return;
  }

  await runTransaction(
    storeName,
    "readwrite",
    (store) => store.put(value),
  );
}

export async function offlinePutMany<T extends IdentifiableRecord>(
  storeName: Exclude<OfflineStoreName, "metadata">,
  values: T[],
): Promise<void> {
  if (!isBrowser() || values.length === 0) {
    return;
  }

  const db = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);

      for (const value of values) {
        store.put(value);
      }

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {
        const error =
          transaction.error ??
          new Error(`IndexedDB bulk write failed: ${storeName}`);

        db.close();
        reject(error);
      };

      transaction.onabort = () => {
        const error =
          transaction.error ??
          new Error(`IndexedDB bulk write aborted: ${storeName}`);

        db.close();
        reject(error);
      };
    } catch (error) {
      db.close();
      reject(error);
    }
  });
}

export async function offlineGet<T>(
  storeName: Exclude<OfflineStoreName, "metadata">,
  id: string,
): Promise<T | null> {
  if (!isBrowser()) {
    return null;
  }

  const result = await runTransaction(
    storeName,
    "readonly",
    (store) => store.get(id),
  );

  return result ?? null;
}

export async function offlineGetAll<T>(
  storeName: Exclude<OfflineStoreName, "metadata">,
): Promise<T[]> {
  if (!isBrowser()) {
    return [];
  }

  const result = await runTransaction(
    storeName,
    "readonly",
    (store) => store.getAll(),
  );

  return result ?? [];
}

export async function offlineDelete(
  storeName: Exclude<OfflineStoreName, "metadata">,
  id: string,
): Promise<void> {
  if (!isBrowser()) {
    return;
  }

  await runTransaction(
    storeName,
    "readwrite",
    (store) => store.delete(id),
  );
}

export async function offlineClear(
  storeName: OfflineStoreName,
): Promise<void> {
  if (!isBrowser()) {
    return;
  }

  await runTransaction(
    storeName,
    "readwrite",
    (store) => store.clear(),
  );
}

export async function offlineSetMetadata(
  key: string,
  value: unknown,
): Promise<void> {
  if (!isBrowser()) {
    return;
  }

  const record: MetadataRecord = {
    key,
    value,
    updatedAt: new Date().toISOString(),
  };

  await runTransaction(
    "metadata",
    "readwrite",
    (store) => store.put(record),
  );
}

export async function offlineGetMetadata<T>(
  key: string,
): Promise<T | null> {
  if (!isBrowser()) {
    return null;
  }

  const result = await runTransaction(
    "metadata",
    "readonly",
    (store) => store.get(key),
  );

  if (!result) {
    return null;
  }

  const record = result as MetadataRecord;

  return record.value as T;
}

export async function offlineGetDatabaseInfo(): Promise<{
  name: string;
  version: number;
  available: boolean;
}> {
  return {
    name: DB_NAME,
    version: DB_VERSION,
    available: isBrowser(),
  };
}
