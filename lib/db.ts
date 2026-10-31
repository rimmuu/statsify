import type { Rec } from './stats'

const open = () =>
  new Promise<IDBDatabase>((res, rej) => {
    const r = indexedDB.open('spotify-stats', 1)
    r.onupgradeneeded = () => r.result.createObjectStore('plays', { keyPath: 'id' })
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
const done = (tx: IDBTransaction) =>
  new Promise<void>((res, rej) => {
    tx.oncomplete = () => res()
    tx.onerror = () => rej(tx.error)
    tx.onabort = () => rej(tx.error)
  })
const req = <T>(r: IDBRequest<T>) =>
  new Promise<T>((res, rej) => {
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })

export async function putMany(rs: Rec[]) {
  const db = await open()
  const tx = db.transaction('plays', 'readwrite')
  const s = tx.objectStore('plays')
  for (const r of rs) s.put(r)
  await done(tx)
  db.close()
}
export async function keys(): Promise<Set<string>> {
  const db = await open()
  const k = await req(db.transaction('plays').objectStore('plays').getAllKeys())
  db.close()
  return new Set(k as string[])
}
export async function loadAll(): Promise<Rec[]> {
  const db = await open()
  const all = await req(db.transaction('plays').objectStore('plays').getAll())
  db.close()
  return all as Rec[]
}
export async function clearAll() {
  const db = await open()
  const tx = db.transaction('plays', 'readwrite')
  tx.objectStore('plays').clear()
  await done(tx)
  db.close()
}
