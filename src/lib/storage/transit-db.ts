import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'tj_navigator_store';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta');
        }
        if (!db.objectStoreNames.contains('network')) {
          db.createObjectStore('network');
        }
        if (!db.objectStoreNames.contains('active_journey')) {
          db.createObjectStore('active_journey');
        }
      }
    });
  }
  return dbPromise;
}
