// Çalışan Expo önizlemesini telefona vermeden önce doğrular; hesap/veri oluşturmaz.
// node scripts/check-mobile-preview.mjs https://EXPO_TUNELI EXPO_KULLANICI_ADI
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [originValue, expectedUsername] = process.argv.slice(2);
if (!originValue || !expectedUsername) {
  throw new Error('Kullanım: node scripts/check-mobile-preview.mjs https://EXPO_TUNELI EXPO_KULLANICI_ADI');
}
const origin = new URL(originValue);
assert.equal(origin.protocol, 'https:', 'Telefon önizlemesi HTTPS kullanmalı.');
assert(!origin.username && !origin.password && !origin.search && !origin.hash, 'Tünel adresi kimlik bilgisi veya sorgu içeremez.');
assert.equal(origin.pathname, '/', 'Tünelin kök adresini kullanın.');
const mobile = JSON.parse(await readFile(new URL('../apps/mobile/package.json', import.meta.url), 'utf8'));
const expectedSdk = `${mobile.dependencies.expo.split('.')[0]}.0.0`;
const apiUrl = process.env.OGGAQ_MOBILE_API_URL ?? 'https://oggsorubankasi.codentum.net';

for (const platform of ['ios', 'android']) {
  const response = await fetch(origin, {
    headers: { Accept: 'application/expo+json', 'Expo-Platform': platform, 'Cache-Control': 'no-cache' },
    signal: AbortSignal.timeout(20000),
  });
  assert.equal(response.status, 200, `${platform}: Expo manifesti alınamadı.`);
  const manifest = await response.json();
  const client = manifest.extra?.expoClient;
  assert.equal(client?.sdkVersion, expectedSdk, `${platform}: Expo Go ile proje SDK sürümü uyuşmuyor.`);
  assert.equal(manifest.extra?.expoGo?.username, expectedUsername, `${platform}: Expo CLI ve telefondaki Expo Go aynı hesaba giriş yapmalı.`);
  assert.equal(client.extra?.apiUrl, apiUrl, `${platform}: Mobil API adresi yanlış.`);
  assert.equal(client.extra?.frontendUrl, apiUrl, `${platform}: E-posta bağlantılarının web adresi yanlış.`);
  assert.equal(new URL(manifest.launchAsset.url).host, origin.host, `${platform}: Paket tünel dışındaki adrese yönleniyor.`);
  assert.equal(new URL(manifest.launchAsset.url).protocol, 'https:', `${platform}: Paket HTTPS üzerinden sunulmalı.`);
}
console.log(`PASS: iOS/Android SDK ${expectedSdk}, Expo hesabı ${expectedUsername}, HTTPS paket adresi ve sunucu API ayarı.`);
