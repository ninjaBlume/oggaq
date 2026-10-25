import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { constants, createHash, generateKeyPairSync, privateEncrypt, sign } from 'node:crypto';

const rootRequire = createRequire(import.meta.url);
const expoRequire = createRequire(rootRequire.resolve('expo/package.json'));
const cliRequire = createRequire(expoRequire.resolve('@expo/cli/package.json'));
const forge = cliRequire('node-forge');
// Fresh synthetic keys exist only in memory. They are never used by the app or saved as fixtures.
const keys = generateKeyPairSync('rsa', { modulusLength: 2048, publicExponent: 65537,
  publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
const publicKey = forge.pki.publicKeyFromPem(keys.publicKey);
const message = Buffer.from('Synthetic signing regression test');
const digest = createHash('sha256').update(message).digest('latin1');
const asn1 = forge.asn1;
const sequence = value => asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, value);
const oid = () => asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false, asn1.oidToDer(forge.oids.sha256).getBytes());
const nullParameter = () => asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, '');
const octets = value => asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false, value);
function signatureFor(algorithmChildren, extraOuter = []) {
  const der = Buffer.from(asn1.toDer(sequence([sequence(algorithmChildren), octets(digest), ...extraOuter])).getBytes(), 'latin1');
  const padding = Buffer.alloc(256 - der.length - 3, 0xff);
  const encoded = Buffer.concat([Buffer.from([0, 1]), padding, Buffer.from([0]), der]);
  return privateEncrypt({ key: keys.privateKey, padding: constants.RSA_NO_PADDING }, encoded).toString('latin1');
}
test('valid Node RSA signatures still verify with the actual Expo node-forge dependency', () => {
  const signature = sign('sha256', message, keys.privateKey).toString('latin1');
  assert.equal(publicKey.verify(digest, signature), true);
  assert.equal(publicKey.verify(createHash('sha256').update('other').digest('latin1'), signature), false);
});
test('SHA-256 AlgorithmIdentifier with or without optional NULL remains valid', () => {
  assert.equal(publicKey.verify(digest, signatureFor([oid(), nullParameter()])), true);
  assert.equal(publicKey.verify(digest, signatureFor([oid()])), true);
});
test('nested DigestAlgorithm garbage is rejected (CVE-2026-85393 regression)', () => {
  for (const children of [[oid(), nullParameter(), octets('garbage')], [oid(), octets('garbage')], [oid(), nullParameter(), nullParameter()]])
    assert.throws(() => publicKey.verify(digest, signatureFor(children)), /valid RSASSA-PKCS1-v1_5 DigestInfo/);
});
test('outer DigestInfo garbage remains rejected', () => {
  assert.throws(() => publicKey.verify(digest, signatureFor([oid(), nullParameter()], [octets('garbage')])), /valid RSASSA-PKCS1-v1_5 DigestInfo/);
});
test('RSA-PSS signatures remain valid', () => {
  const signature = sign('sha256', message, { key: keys.privateKey, padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 });
  const pss = forge.pss.create({ md: forge.md.sha256.create(), mgf: forge.mgf.mgf1.create(forge.md.sha256.create()), saltLength: 32 });
  assert.equal(publicKey.verify(digest, signature.toString('latin1'), pss), true);
});
