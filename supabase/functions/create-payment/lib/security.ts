export const verifyCsrfToken: (
  token: string,
  nonce: string,
  hash: string
) => Promise<boolean> = async (token, nonce, hash) => {
  if (!token || !nonce || !hash) return false;
  try {
    const data = new TextEncoder().encode(`${token}:${nonce}`);
    const hashBuffer: ArrayBuffer = await crypto.subtle.digest(
      'SHA-256',
      data
    );
    const hashArray: number[] = Array.from(new Uint8Array(hashBuffer));
    const computedHash: string = hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return computedHash === hash;
  } catch {
    return false;
  }
};

export const sanitizeString: (input: string | undefined | null) => string = (
  input
) => {
  if (!input) return '';
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim()
    .substring(0, 500);
};

export const isValidEmail: (email: string) => boolean = (email) => {
  const emailRegex: RegExp =
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
};
