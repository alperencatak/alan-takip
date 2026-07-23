/*
 * Balıkesir Şehir Planlama Takip Sistemi — Service Worker
 *
 * Amaç: Site her açılışta EN GÜNCEL sürümünü ağdan çeksin (network-first), böylece
 * GitHub Pages'e yapılan her güncelleme son kullanıcıya anında yansısın; kimse hard
 * refresh yapmak zorunda kalmasın. İnternet yoksa son çalışan sürüme düşülür (offline fallback).
 *
 * Not: Bu dosyanın kendisi de sürümlendirilir. Davranışı değiştirmek istediğinde
 * CACHE_VERSION değerini artırman yeterli — eski cache'ler otomatik temizlenir.
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = 'bbts-runtime-' + CACHE_VERSION;

// Yeni SW kurulur kurulmaz beklemeden aktifleşsin.
self.addEventListener('install', () => {
    self.skipWaiting();
});

// Aktifleşince eski cache'leri temizle ve açık sekmeleri hemen devral.
self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(
            keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        );
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    const req = event.request;

    // Yalnızca GET isteklerini ve kendi origin'imizdeki kaynakları yönet.
    // CDN'ler (Tailwind, Chart.js, fontlar) sürümlü olduğundan tarayıcının kendi cache'ine bırakılır.
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    event.respondWith((async () => {
        try {
            // Ağdan taze getir; tarayıcının HTTP cache'ini de baypas et.
            const fresh = await fetch(req, { cache: 'no-store' });
            // Çevrimdışı senaryo için son kopyayı sakla.
            const cache = await caches.open(CACHE_NAME);
            cache.put(req, fresh.clone());
            return fresh;
        } catch (err) {
            // Ağ yoksa son kaydedilen sürüme düş.
            const cached = await caches.match(req);
            if (cached) return cached;
            throw err;
        }
    })());
});
