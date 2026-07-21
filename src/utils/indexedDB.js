const DB_NAME = 'MalwaCRM_DB';
const DB_VERSION = 1;

const STORES = {
  profiles: 'profiles',
  customers: 'customers',
  vendors: 'vendors',
  suppliers: 'suppliers',
  labours: 'labours',
  inventory: 'inventory',
  jobs: 'jobs',
  ledgerEntries: 'ledgerEntries',
  settings: 'settings',
  syncQueue: 'syncQueue',
  companies: 'companies',
};

class IndexedDBManager {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized && this.db) {
      return this.db;
    }

    // If IndexedDB is unavailable in this environment (rare), fall back to
    // an in-memory store so the app can continue running (useful for tests
    // or non-browser contexts). Prefer native IndexedDB if available.
    const nativeIndexedDB = (typeof globalThis !== 'undefined' && (globalThis.indexedDB || (globalThis.window && globalThis.window.indexedDB))) || null;

    if (!nativeIndexedDB || typeof nativeIndexedDB.open !== 'function') {
      // Simple in-memory fallback implementation
      if (!this._inMemory) {
        this._inMemory = new Map();
        Object.values(STORES).forEach((s) => this._inMemory.set(s, new Map()));
      }

      this.db = {
        _inMemory: this._inMemory,
      };

      this.isInitialized = true;
      console.warn('IndexedDB not available — using in-memory fallback (data will not persist)');
      return Promise.resolve(this.db);
    }

    return new Promise((resolve, reject) => {
      // Open without a specific version to avoid VersionError if the
      // existing DB has a higher version than our constant.
      const request = nativeIndexedDB.open(DB_NAME);

      request.onerror = () => {
        console.error('IndexedDB failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;

        // Ensure all expected stores exist. If the DB was created with an
        // older schema, perform a minor version upgrade to add missing stores.
        const existingStores = Array.from(this.db.objectStoreNames || []);
        const missingStores = Object.values(STORES).filter((s) => !existingStores.includes(s));

        if (missingStores.length === 0) {
          this.isInitialized = true;
          console.log('IndexedDB initialized successfully');
          resolve(this.db);
          return;
        }

        console.log('IndexedDB missing stores detected, upgrading DB to add:', missingStores);

        // Close current connection and open with incremented version to trigger onupgradeneeded
        const currentVersion = this.db.version || DB_VERSION;
        this.db.close();

        const upgradeRequest = nativeIndexedDB.open(DB_NAME, currentVersion + 1);

        upgradeRequest.onerror = () => {
          console.error('IndexedDB upgrade failed:', upgradeRequest.error);
          reject(upgradeRequest.error);
        };

        upgradeRequest.onupgradeneeded = (event) => {
          const db = event.target.result;

          missingStores.forEach((storeName) => {
            if (!db.objectStoreNames.contains(storeName)) {
              const objectStore = db.createObjectStore(storeName, {
                keyPath: 'id',
                autoIncrement: false,
              });

              objectStore.createIndex('user_id', 'user_id', { unique: false });
              objectStore.createIndex('updated_at', 'updated_at', { unique: false });
              objectStore.createIndex('created_at', 'created_at', { unique: false });

              if (storeName === 'syncQueue') {
                objectStore.createIndex('status', 'status', { unique: false });
                objectStore.createIndex('timestamp', 'timestamp', { unique: false });
              }

              console.log(`Created missing object store during upgrade: ${storeName}`);
            }
          });
        };

        upgradeRequest.onsuccess = () => {
          this.db = upgradeRequest.result;
          this.isInitialized = true;
          console.log('IndexedDB upgraded and initialized successfully');
          resolve(this.db);
        };
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        Object.values(STORES).forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const objectStore = db.createObjectStore(storeName, {
              keyPath: 'id',
              autoIncrement: false,
            });

            objectStore.createIndex('user_id', 'user_id', { unique: false });
            objectStore.createIndex('updated_at', 'updated_at', { unique: false });
            objectStore.createIndex('created_at', 'created_at', { unique: false });

            if (storeName === 'syncQueue') {
              objectStore.createIndex('status', 'status', { unique: false });
              objectStore.createIndex('timestamp', 'timestamp', { unique: false });
            }

            console.log(`Created object store: ${storeName}`);
          }
        });
      };
    });
  }

  async getAll(storeName) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getById(storeName, id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async add(storeName, data) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const objectStore = transaction.objectStore(storeName);

      const dataWithTimestamp = {
        ...data,
        updated_at: new Date().toISOString(),
        created_at: data.created_at || new Date().toISOString(),
      };

      const request = objectStore.add(dataWithTimestamp);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put(storeName, data) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const objectStore = transaction.objectStore(storeName);

      const dataWithTimestamp = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      const request = objectStore.put(dataWithTimestamp);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.delete(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.clear();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async bulkPut(storeName, dataArray) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const objectStore = transaction.objectStore(storeName);

      let completed = 0;
      const errors = [];

      dataArray.forEach((data) => {
        const dataWithTimestamp = {
          ...data,
          updated_at: new Date().toISOString(),
        };

        const request = objectStore.put(dataWithTimestamp);

        request.onsuccess = () => {
          completed++;
          if (completed === dataArray.length) {
            resolve({ success: completed, errors });
          }
        };

        request.onerror = () => {
          errors.push({ id: data.id, error: request.error });
          completed++;
          if (completed === dataArray.length) {
            resolve({ success: completed - errors.length, errors });
          }
        };
      });
    });
  }

  async getByIndex(storeName, indexName, value) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const objectStore = transaction.objectStore(storeName);
      const index = objectStore.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async count(storeName) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearAll() {
    await this.init();
    const promises = Object.values(STORES).map((storeName) => this.clear(storeName));
    return Promise.all(promises);
  }
}

// Export an instance but avoid using the identifier `indexedDB` which may
// shadow the global `indexedDB` in some bundlers/environments.
const indexedDBManager = new IndexedDBManager();

export { indexedDBManager as indexedDB, STORES };
export default indexedDBManager;
