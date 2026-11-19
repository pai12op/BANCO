// src/lib/secureFetch.ts
// Cifrado híbrido de extremo a extremo (RSA-OAEP SHA-256 + AES-256-GCM) en el navegador
// Evita el envío de contraseñas, PINes y montos en texto plano por la red.

export const STRONG_PASS_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export function isStrongPassword(password: string): boolean {
  return STRONG_PASS_REGEX.test(password);
}

interface PublicKeyResponse {
  keyId: string;
  algorithm: string;
  publicKeySpki: string;
}

interface CachedServerKey {
  keyId: string;
  cryptoKey: CryptoKey;
}

let cachedKey: CachedServerKey | null = null;
let keyPromise: Promise<CachedServerKey> | null = null;

function base64ToUint8Array(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function generateNonce(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function clearCachedServerKey(): void {
  cachedKey = null;
  keyPromise = null;
}

export async function getServerPublicKey(forceRefresh = false): Promise<CachedServerKey> {
  if (!forceRefresh && cachedKey) {
    return cachedKey;
  }
  if (!forceRefresh && keyPromise) {
    return keyPromise;
  }

  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("El cifrado WebCrypto requiere una conexión segura HTTPS o localhost.");
  }

  keyPromise = (async () => {
    const res = await fetch("/api/auth/public-key", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error("No se pudo obtener la llave pública de seguridad del servidor.");
    }
    const data = (await res.json()) as PublicKeyResponse;
    if (!data?.keyId || !data?.publicKeySpki) {
      throw new Error("Respuesta de llave pública incompleta.");
    }

    const spkiBytes = base64ToUint8Array(data.publicKeySpki);
    const cryptoKey = await window.crypto.subtle.importKey(
      "spki",
      spkiBytes.buffer as ArrayBuffer,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["encrypt"]
    );

    cachedKey = { keyId: data.keyId, cryptoKey };
    return cachedKey;
  })();

  try {
    return await keyPromise;
  } finally {
    keyPromise = null;
  }
}

export async function encryptPayload(
  payload: Record<string, unknown>,
  forceRefresh = false
): Promise<{
  _enc: {
    keyId: string;
    encryptedKey: string;
    iv: string;
    ciphertext: string;
  };
}> {
  const { keyId, cryptoKey } = await getServerPublicKey(forceRefresh);

  const aesKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt"]
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const envelopeData = {
    ...payload,
    _ts: Date.now(),
    _nonce: generateNonce(),
  };

  const encoded = new TextEncoder().encode(JSON.stringify(envelopeData));
  const encryptedData = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    aesKey,
    encoded
  );

  const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
  const encryptedAesKey = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    cryptoKey,
    rawAesKey
  );

  return {
    _enc: {
      keyId,
      encryptedKey: arrayBufferToBase64(encryptedAesKey),
      iv: arrayBufferToBase64(iv),
      ciphertext: arrayBufferToBase64(encryptedData),
    },
  };
}

export async function securePost(
  url: string,
  payload: Record<string, unknown>,
  init: RequestInit = {}
): Promise<Response> {
  const sendWithKey = async (forceRefresh: boolean) => {
    const body = await encryptPayload(payload, forceRefresh);
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    return fetch(url, {
      ...init,
      method: init.method ?? "POST",
      credentials: init.credentials ?? "include",
      headers,
      body: JSON.stringify(body),
    });
  };

  let res = await sendWithKey(false);
  if (res.status === 428) {
    clearCachedServerKey();
    res = await sendWithKey(true);
  }
  return res;
}

const CAJERO_HANDOFF_KEY = "banca_cajero_handoff";
const CAJERO_HANDOFF_TTL_MS = 10 * 60 * 1000;

export function saveCajeroHandoff(cuenta: string, codigo: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      CAJERO_HANDOFF_KEY,
      JSON.stringify({ cuenta, codigo, exp: Date.now() + CAJERO_HANDOFF_TTL_MS })
    );
  } catch {
    // sessionStorage no disponible
  }
}

export function consumeCajeroHandoff(): { cuenta: string; codigo: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CAJERO_HANDOFF_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(CAJERO_HANDOFF_KEY);
    const parsed = JSON.parse(raw) as { cuenta?: string; codigo?: string; exp?: number };
    if (!parsed.cuenta || !parsed.codigo || !parsed.exp || parsed.exp < Date.now()) {
      return null;
    }
    return { cuenta: parsed.cuenta, codigo: parsed.codigo };
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function parseJsonResponse<T>(res: Response, defaultErrorMsg: string): Promise<T> {
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    throw new ApiError(data?.error || defaultErrorMsg, res.status, data?.code);
  }
  return data as T;
}

export async function apiGet<T>(url: string, fallbackError = "Error de comunicación con el servidor."): Promise<T> {
  const res = await fetch(url, { method: "GET", credentials: "include" });
  return parseJsonResponse<T>(res, fallbackError);
}

export async function apiPost<T>(
  url: string,
  payload?: Record<string, unknown>,
  fallbackError = "Error al procesar la solicitud."
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  return parseJsonResponse<T>(res, fallbackError);
}

export async function apiSecurePost<T>(
  url: string,
  payload: Record<string, unknown>,
  fallbackError = "Error en operación segura cifrada."
): Promise<T> {
  const res = await securePost(url, payload);
  return parseJsonResponse<T>(res, fallbackError);
}

