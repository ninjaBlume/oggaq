export function verificationInput(search: URLSearchParams) {
  const id = search.get('id') ?? '';
  const hash = search.get('hash') ?? '';
  const signature = search.get('signature') ?? '';
  const rawExpiry = search.get('expires') ?? '';
  const expires = Number(rawExpiry);
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)
    || !/^[a-f0-9]{40}$/.test(hash) || !/^[a-f0-9]{64}$/.test(signature)
    || !/^\d+$/.test(rawExpiry) || !Number.isSafeInteger(expires) || expires <= 0) return null;
  // The backend alone validates the signature, expiry and ownership.
  return { id, hash, signature, expires };
}
