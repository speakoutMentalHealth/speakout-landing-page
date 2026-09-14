var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/jose/dist/webapi/lib/buffer_utils.js
var encoder = new TextEncoder();
var decoder = new TextDecoder();
var strictDecoder = new TextDecoder("utf-8", { fatal: true });
var MAX_INT32 = 2 ** 32;
function concat(...buffers) {
  const size = buffers.reduce((acc, { length }) => acc + length, 0), buf = new Uint8Array(size);
  let i = 0;
  for (const buffer of buffers)
    buf.set(buffer, i), i += buffer.length;
  return buf;
}
__name(concat, "concat");
var NON_ASCII = /[^\x00-\x7f]/;
function encode(string) {
  if (typeof string == "string" && string.length >= 128) {
    if (NON_ASCII.test(string))
      throw new TypeError("non-ASCII string encountered in encode()");
    return encoder.encode(string);
  }
  const bytes = new Uint8Array(string.length);
  for (let i = 0; i < string.length; i++) {
    const code = string.charCodeAt(i);
    if (code > 127)
      throw new TypeError("non-ASCII string encountered in encode()");
    bytes[i] = code;
  }
  return bytes;
}
__name(encode, "encode");
function encodeBase64(input, url = false) {
  if (Uint8Array.prototype.toBase64)
    return input.toBase64({ alphabet: url ? "base64url" : "base64", omitPadding: url });
  const CHUNK_SIZE = 32768, arr = [];
  for (let i = 0; i < input.length; i += CHUNK_SIZE)
    arr.push(String.fromCharCode.apply(null, input.subarray(i, i + CHUNK_SIZE)));
  const encoded = btoa(arr.join(""));
  return url ? encoded.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_") : encoded;
}
__name(encodeBase64, "encodeBase64");
function decodeBase64(encoded, url = false) {
  if (Uint8Array.fromBase64)
    return Uint8Array.fromBase64(encoded, { alphabet: url ? "base64url" : "base64" });
  if (url) {
    if (encoded.includes("+") || encoded.includes("/"))
      throw new TypeError("Invalid base64url");
    encoded = encoded.replace(/-/g, "+").replace(/_/g, "/");
  }
  const binary = atob(encoded), bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++)
    bytes[i] = binary.charCodeAt(i);
  return bytes;
}
__name(decodeBase64, "decodeBase64");

// node_modules/jose/dist/webapi/util/errors.js
var JOSEError = class extends Error {
  static {
    __name(this, "JOSEError");
  }
  static code = "ERR_JOSE_GENERIC";
  code = "ERR_JOSE_GENERIC";
  constructor(message2, options) {
    super(message2, options), this.name = this.constructor.name, Error.captureStackTrace?.(this, this.constructor);
  }
};
var JWTClaimValidationFailed = class extends JOSEError {
  static {
    __name(this, "JWTClaimValidationFailed");
  }
  static code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
  code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
  claim;
  reason;
  payload;
  constructor(message2, payload, claim = "unspecified", reason = "unspecified") {
    super(message2, { cause: { claim, reason, payload } }), this.claim = claim, this.reason = reason, this.payload = payload;
  }
};
var JWTExpired = class extends JOSEError {
  static {
    __name(this, "JWTExpired");
  }
  static code = "ERR_JWT_EXPIRED";
  code = "ERR_JWT_EXPIRED";
  claim;
  reason;
  payload;
  constructor(message2, payload, claim = "unspecified", reason = "unspecified") {
    super(message2, { cause: { claim, reason, payload } }), this.claim = claim, this.reason = reason, this.payload = payload;
  }
};
var JOSEAlgNotAllowed = class extends JOSEError {
  static {
    __name(this, "JOSEAlgNotAllowed");
  }
  static code = "ERR_JOSE_ALG_NOT_ALLOWED";
  code = "ERR_JOSE_ALG_NOT_ALLOWED";
};
var JOSENotSupported = class extends JOSEError {
  static {
    __name(this, "JOSENotSupported");
  }
  static code = "ERR_JOSE_NOT_SUPPORTED";
  code = "ERR_JOSE_NOT_SUPPORTED";
};
var JWSInvalid = class extends JOSEError {
  static {
    __name(this, "JWSInvalid");
  }
  static code = "ERR_JWS_INVALID";
  code = "ERR_JWS_INVALID";
};
var JWTInvalid = class extends JOSEError {
  static {
    __name(this, "JWTInvalid");
  }
  static code = "ERR_JWT_INVALID";
  code = "ERR_JWT_INVALID";
};
var JWKSInvalid = class extends JOSEError {
  static {
    __name(this, "JWKSInvalid");
  }
  static code = "ERR_JWKS_INVALID";
  code = "ERR_JWKS_INVALID";
};
var JWKSNoMatchingKey = class extends JOSEError {
  static {
    __name(this, "JWKSNoMatchingKey");
  }
  static code = "ERR_JWKS_NO_MATCHING_KEY";
  code = "ERR_JWKS_NO_MATCHING_KEY";
  constructor(message2 = "no applicable key found in the JSON Web Key Set", options) {
    super(message2, options);
  }
};
var JWKSMultipleMatchingKeys = class extends JOSEError {
  static {
    __name(this, "JWKSMultipleMatchingKeys");
  }
  [Symbol.asyncIterator] = async function* () {
  };
  static code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
  code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
  constructor(message2 = "multiple matching keys found in the JSON Web Key Set", options) {
    super(message2, options);
  }
};
var JWKSTimeout = class extends JOSEError {
  static {
    __name(this, "JWKSTimeout");
  }
  static code = "ERR_JWKS_TIMEOUT";
  code = "ERR_JWKS_TIMEOUT";
  constructor(message2 = "request timed out", options) {
    super(message2, options);
  }
};
var JWSSignatureVerificationFailed = class extends JOSEError {
  static {
    __name(this, "JWSSignatureVerificationFailed");
  }
  static code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
  code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
  constructor(message2 = "signature verification failed", options) {
    super(message2, options);
  }
};

// node_modules/jose/dist/webapi/util/base64url.js
var invalid = "The input to be decoded is not correctly encoded.";
function decode(input) {
  try {
    return decodeBase64(typeof input == "string" ? input : decoder.decode(input), true);
  } catch (cause) {
    throw new TypeError(invalid, { cause });
  }
}
__name(decode, "decode");
function encode2(input) {
  return encodeBase64(typeof input == "string" ? encoder.encode(input) : input, true);
}
__name(encode2, "encode");

// node_modules/jose/dist/webapi/lib/validate.js
function isObject(input) {
  if (typeof input != "object" || input === null || Object.prototype.toString.call(input) !== "[object Object]")
    return false;
  const prototype = Object.getPrototypeOf(input);
  return prototype === null || Object.getPrototypeOf(prototype) === null;
}
__name(isObject, "isObject");
function isJwkSet(input) {
  return isObject(input) && Array.isArray(input.keys) && Array.from(input.keys).every(isObject);
}
__name(isJwkSet, "isJwkSet");
function isDisjoint(...headers) {
  const parameters = /* @__PURE__ */ new Set();
  for (const header of headers)
    if (header)
      for (const parameter of Object.keys(header)) {
        if (parameters.has(parameter))
          return false;
        parameters.add(parameter);
      }
  return true;
}
__name(isDisjoint, "isDisjoint");
function assertNotSet(value, name) {
  if (value !== void 0)
    throw new TypeError(`${name} can only be called once`);
}
__name(assertNotSet, "assertNotSet");
function decodeBase64url(value, label, ErrorClass) {
  try {
    return decode(value);
  } catch {
    throw new ErrorClass(`Failed to base64url decode the ${label}`);
  }
}
__name(decodeBase64url, "decodeBase64url");
function encodeBase64url(value, label, ErrorClass) {
  try {
    return encode(value);
  } catch {
    throw new ErrorClass(`The ${label} is not a valid base64url string`);
  }
}
__name(encodeBase64url, "encodeBase64url");
function parseJoseHeader(b64, ErrorClass, message2) {
  let parsed;
  try {
    parsed = JSON.parse(strictDecoder.decode(decode(b64)));
  } catch {
    throw new ErrorClass(message2);
  }
  if (!isObject(parsed))
    throw new ErrorClass(message2);
  return parsed;
}
__name(parseJoseHeader, "parseJoseHeader");
var JWS_RECOGNIZED = { __proto__: null, b64: true };
function validateAlgorithms(option, algorithms) {
  if (algorithms !== void 0 && (!Array.isArray(algorithms) || algorithms.some((s) => typeof s != "string")))
    throw new TypeError(`"${option}" option must be an array of strings`);
  return algorithms === void 0 ? void 0 : new Set(algorithms);
}
__name(validateAlgorithms, "validateAlgorithms");
function validateCritDuplicates(Err, protectedHeader) {
  const { crit } = protectedHeader ?? {};
  if (Array.isArray(crit) && new Set(crit).size !== crit.length)
    throw new Err('"crit" (Critical) Header Parameter MUST NOT contain duplicate values');
}
__name(validateCritDuplicates, "validateCritDuplicates");
function validateCrit(Err, recognizedDefault, recognizedOption, protectedHeader, joseHeader) {
  if (joseHeader.crit !== void 0 && protectedHeader?.crit === void 0)
    throw new Err('"crit" (Critical) Header Parameter MUST be integrity protected');
  if (!protectedHeader || protectedHeader.crit === void 0)
    return [];
  if (!Array.isArray(protectedHeader.crit) || protectedHeader.crit.length === 0 || protectedHeader.crit.some((input) => typeof input != "string" || input.length === 0))
    throw new Err('"crit" (Critical) Header Parameter MUST be an array of non-empty strings when present');
  const recognized = recognizedOption === void 0 ? recognizedDefault : { __proto__: null, ...recognizedOption, ...recognizedDefault };
  for (const parameter of protectedHeader.crit) {
    if (!(parameter in recognized))
      throw new JOSENotSupported(`Extension Header Parameter "${parameter}" is not recognized`);
    if (!Object.hasOwn(joseHeader, parameter) || joseHeader[parameter] === void 0)
      throw new Err(`Extension Header Parameter "${parameter}" is missing`);
    if (recognized[parameter] && (!Object.hasOwn(protectedHeader, parameter) || protectedHeader[parameter] === void 0))
      throw new Err(`Extension Header Parameter "${parameter}" MUST be integrity protected`);
  }
  return protectedHeader.crit;
}
__name(validateCrit, "validateCrit");
function validateB64(protectedHeader, extensions) {
  if (extensions.includes("b64")) {
    const b64 = protectedHeader.b64;
    if (typeof b64 != "boolean")
      throw new JWSInvalid('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
    return b64;
  }
  return true;
}
__name(validateB64, "validateB64");
function serializeJoseHeader(Err, header) {
  let serialized, parsed;
  try {
    serialized = JSON.stringify(header), parsed = JSON.parse(serialized);
  } catch (cause) {
    throw new Err("JOSE Header is not valid JSON", { cause });
  }
  if (!isObject(parsed))
    throw new Err("JOSE Header is not a JSON object");
  return [parsed, serialized];
}
__name(serializeJoseHeader, "serializeJoseHeader");

// node_modules/jose/dist/webapi/lib/key.js
var tag = /* @__PURE__ */ __name((key) => key[Symbol.toStringTag], "tag");
var jwkMatchesOp = /* @__PURE__ */ __name((entry, key, usage) => {
  const { alg } = entry;
  if (key.use !== void 0) {
    const expected = usage === "sign" || usage === "verify" ? "sig" : "enc";
    if (key.use !== expected)
      throw new TypeError(`Invalid key for this operation, its "use" must be "${expected}" when present`);
  }
  if (key.alg !== void 0 && key.alg !== alg)
    throw new TypeError(`Invalid key for this operation, its "alg" must be "${alg}" when present`);
  if (Array.isArray(key.key_ops)) {
    const expectedKeyOp = usage === "encrypt" || usage === "decrypt" ? entry.ops?.[usage === "encrypt" ? 0 : 1] : usage;
    if (expectedKeyOp && !key.key_ops.includes(expectedKeyOp))
      throw new TypeError(`Invalid key for this operation, its "key_ops" must include "${expectedKeyOp}" when present`);
  }
}, "jwkMatchesOp");
async function prepareKey(entry, key, usage) {
  const { alg, secret } = entry, privateKey = usage === "decrypt" || usage === "sign";
  if (secret && key instanceof Uint8Array)
    return key;
  let normalized2, keyObject;
  if (isObject(key)) {
    if (normalized2 = normalizeJwk(key), typeof normalized2.kty != "string")
      throw invalidKeyType(alg, key, secret);
    if (!(secret ? normalized2.kty === "oct" && typeof normalized2.k == "string" : normalized2.kty !== "oct" && (privateKey ? normalized2.kty === "AKP" && typeof normalized2.priv == "string" || typeof normalized2.d == "string" : normalized2.d === void 0 && normalized2.priv === void 0)))
      throw new TypeError(secret ? 'JSON Web Key for symmetric algorithms must have JWK "kty" (Key Type) equal to "oct" and the JWK "k" (Key Value) present' : `JSON Web Key for this operation must be a ${privateKey ? "private" : "public"} JWK`);
    if (jwkMatchesOp(entry, normalized2, usage), normalized2.kty === "oct")
      return decode(normalized2.k);
    if (!Object.isFrozen(key)) {
      const { key_ops } = key;
      Array.isArray(key_ops) && Object.freeze(key_ops), Object.freeze(key);
    }
  } else {
    if (!isKeyLike(key))
      throw invalidKeyType(alg, key, secret);
    const expectedType = secret ? "secret" : privateKey ? "private" : "public";
    if (key.type !== expectedType && (secret || ["secret", "public", "private"].includes(key.type)))
      throw new TypeError(`${tag(key)} instances must be of type "${expectedType}" for the ${alg} algorithm`);
    if (isCryptoKey(key))
      return key;
    if (keyObject = key, keyObject.type === "secret")
      return keyObject.export();
  }
  cache ||= /* @__PURE__ */ new WeakMap();
  const cacheKey = key;
  let cached = cache.get(cacheKey);
  if (cached?.[alg])
    return cached[alg];
  if (cached || cache.set(cacheKey, cached = {}), keyObject && typeof keyObject.toCryptoKey == "function") {
    const isPublic = keyObject.type === "public", crv = nist[keyObject.asymmetricKeyDetails?.namedCurve], params = entry.resolve?.({ crv, asymmetricKeyType: keyObject.asymmetricKeyType }) ?? entry.subtle;
    return cached[alg] = keyObject.toCryptoKey(params, isPublic, entry.usages[isPublic ? 0 : 1]);
  }
  return normalized2 ??= keyObject.export({ format: "jwk" }), normalized2.alg = alg, cached[alg] = await jwkToKey(entry, normalized2);
}
__name(prepareKey, "prepareKey");
var cache;
var nist = {
  __proto__: null,
  prime256v1: "P-256",
  secp384r1: "P-384",
  secp521r1: "P-521"
};
var isCryptoKey = /* @__PURE__ */ __name((key) => {
  if (key?.[Symbol.toStringTag] === "CryptoKey")
    return true;
  try {
    return key instanceof CryptoKey;
  } catch {
    return false;
  }
}, "isCryptoKey");
var isKeyObject = /* @__PURE__ */ __name((key) => key?.[Symbol.toStringTag] === "KeyObject", "isKeyObject");
var isKeyLike = /* @__PURE__ */ __name((key) => isCryptoKey(key) || isKeyObject(key), "isKeyLike");
function message(msg, actual, ...types) {
  if (types.length > 2) {
    const last = types.pop();
    msg += `one of type ${types.join(", ")}, or ${last}.`;
  } else types.length === 2 ? msg += `one of type ${types[0]} or ${types[1]}.` : msg += `of type ${types[0]}.`;
  return actual == null ? msg += ` Received ${actual}` : typeof actual == "function" && actual.name ? msg += ` Received function ${actual.name}` : typeof actual == "object" && actual != null && actual.constructor?.name && (msg += ` Received an instance of ${actual.constructor.name}`), msg;
}
__name(message, "message");
function invalidKeyType(alg, actual, secret) {
  const types = ["CryptoKey", "KeyObject", "JSON Web Key"];
  return secret && types.push("Uint8Array"), new TypeError(message(`Key for the ${alg} algorithm must be `, actual, ...types));
}
__name(invalidKeyType, "invalidKeyType");
var unusable = /* @__PURE__ */ __name((name, prop = "algorithm.name") => new TypeError(`CryptoKey does not support this operation, its ${prop} must be ${name}`), "unusable");
function checkUsage(key, usage) {
  if (usage && !key.usages.includes(usage))
    throw new TypeError(`CryptoKey does not support this operation, its usages must include ${usage}.`);
}
__name(checkUsage, "checkUsage");
function checkModulusLength(alg, key) {
  const { modulusLength } = key.algorithm;
  if (typeof modulusLength != "number" || modulusLength < 2048)
    throw new TypeError(`${alg} requires key modulusLength to be 2048 bits or larger`);
}
__name(checkModulusLength, "checkModulusLength");
function checkCryptoKey(key, expected, usage) {
  const algorithm = key.algorithm;
  if (algorithm.name !== expected.name)
    throw unusable(expected.name);
  if (expected.hash && algorithm.hash?.name !== expected.hash)
    throw unusable(expected.hash, "algorithm.hash");
  if (expected.namedCurve && algorithm.namedCurve !== expected.namedCurve)
    throw unusable(expected.namedCurve, "algorithm.namedCurve");
  if (expected.length !== void 0 && algorithm.length !== expected.length)
    throw unusable(expected.length, "algorithm.length");
  checkUsage(key, usage);
}
__name(checkCryptoKey, "checkCryptoKey");
function snapshotJwk(jwk) {
  return { __proto__: null, ...jwk };
}
__name(snapshotJwk, "snapshotJwk");
function normalizeJwk(jwk) {
  const normalized2 = snapshotJwk(jwk);
  if (normalized2.ext !== void 0 && typeof normalized2.ext != "boolean")
    throw new TypeError('"ext" (Extractable) Parameter must be a boolean');
  if (normalized2.key_ops !== void 0) {
    const value = normalized2.key_ops, keyOps = Array.isArray(value) ? [...value] : void 0;
    if (!keyOps || keyOps.some((operation) => typeof operation != "string") || new Set(keyOps).size !== keyOps.length)
      throw new TypeError('"key_ops" (Key Operations) Parameter must be an array of unique strings');
    normalized2.key_ops = keyOps;
  }
  return normalized2;
}
__name(normalizeJwk, "normalizeJwk");
function validateExtractableOption(extractable) {
  if (extractable !== void 0 && typeof extractable != "boolean")
    throw new TypeError('"extractable" option must be a boolean');
  return extractable;
}
__name(validateExtractableOption, "validateExtractableOption");
async function jwkToKey(entry, jwk, extractable) {
  if (!entry.kty.includes(jwk.kty))
    throw new JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
  const algorithm = entry.resolve?.({ kty: jwk.kty, crv: jwk.crv }) ?? entry.subtle, isPrivate = !!(jwk.d || jwk.priv), keyData = { ...jwk, ext: extractable ?? jwk.ext };
  return keyData.kty !== "AKP" && delete keyData.alg, delete keyData.use, crypto.subtle.importKey("jwk", keyData, algorithm, keyData.ext ?? !isPrivate, jwk.key_ops ?? entry.usages[isPrivate ? 1 : 0]);
}
__name(jwkToKey, "jwkToKey");
async function rawKey(key, expected, usage, extractable = false) {
  return key instanceof Uint8Array && (key = await crypto.subtle.importKey("raw", key, expected, extractable, [usage])), checkCryptoKey(key, expected, usage), key;
}
__name(rawKey, "rawKey");

// node_modules/jose/dist/webapi/lib/key_descriptor.js
function table(entries) {
  const out = { __proto__: null };
  for (const alg in entries)
    out[alg] = { ...entries[alg], alg };
  return out;
}
__name(table, "table");

// node_modules/jose/dist/webapi/lib/jwe_algorithms.js
var wrap = [
  ["encrypt", "wrapKey"],
  ["decrypt", "unwrapKey"]
];
var derive = [[], ["deriveBits"]];
var none = [[], []];
function rsaes(bits) {
  return {
    kty: ["RSA"],
    mode: "key-encryption",
    subtle: { name: "RSA-OAEP", hash: `SHA-${bits}` },
    usages: wrap,
    ops: ["wrapKey", "unwrapKey"]
  };
}
__name(rsaes, "rsaes");
function ecdh(mode) {
  return {
    kty: ["EC", "OKP"],
    mode,
    subtle: { name: "ECDH" },
    resolve: /* @__PURE__ */ __name(({ kty, crv, asymmetricKeyType }) => {
      if (crv === "X25519" || asymmetricKeyType === "x25519")
        return { name: "X25519" };
      if (kty === "OKP")
        throw new JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
      return { name: "ECDH", namedCurve: crv };
    }, "resolve"),
    usages: derive,
    ops: [void 0, "deriveBits"]
  };
}
__name(ecdh, "ecdh");
function aeskw(bits, gcm = false) {
  return {
    kty: ["oct"],
    mode: "key-wrapping",
    secret: true,
    subtle: { name: gcm ? "AES-GCM" : "AES-KW", length: bits },
    usages: none,
    ops: gcm ? ["encrypt", "decrypt"] : ["wrapKey", "unwrapKey"]
  };
}
__name(aeskw, "aeskw");
function pbes2() {
  return {
    kty: ["oct"],
    mode: "key-wrapping",
    secret: true,
    subtle: { name: "PBKDF2" },
    usages: none,
    ops: ["deriveBits", "deriveBits"]
  };
}
__name(pbes2, "pbes2");
var JWE = table({
  dir: {
    kty: ["oct"],
    mode: "direct-encryption",
    secret: true,
    subtle: { name: "AES-GCM" },
    usages: none,
    ops: ["encrypt", "decrypt"]
  },
  "RSA-OAEP": rsaes(1),
  "RSA-OAEP-256": rsaes(256),
  "RSA-OAEP-384": rsaes(384),
  "RSA-OAEP-512": rsaes(512),
  "ECDH-ES": ecdh("direct-key-agreement"),
  "ECDH-ES+A128KW": ecdh("key-agreement-with-key-wrapping"),
  "ECDH-ES+A192KW": ecdh("key-agreement-with-key-wrapping"),
  "ECDH-ES+A256KW": ecdh("key-agreement-with-key-wrapping"),
  A128KW: aeskw(128),
  A192KW: aeskw(192),
  A256KW: aeskw(256),
  A128GCMKW: aeskw(128, true),
  A192GCMKW: aeskw(192, true),
  A256GCMKW: aeskw(256, true),
  "PBES2-HS256+A128KW": pbes2(),
  "PBES2-HS384+A192KW": pbes2(),
  "PBES2-HS512+A256KW": pbes2()
});
var contentOps = ["encrypt", "decrypt"];
function contentEncryption(bits, cbc = false) {
  return {
    kty: ["oct"],
    secret: true,
    subtle: { name: cbc ? "AES-CBC" : "AES-GCM", length: bits },
    usages: none,
    ops: contentOps,
    cekBits: bits,
    ivBits: cbc ? 128 : 96,
    cbc
  };
}
__name(contentEncryption, "contentEncryption");
var ENC = table({
  A128GCM: contentEncryption(128),
  A192GCM: contentEncryption(192),
  A256GCM: contentEncryption(256),
  "A128CBC-HS256": contentEncryption(256, true),
  "A192CBC-HS384": contentEncryption(384, true),
  "A256CBC-HS512": contentEncryption(512, true)
});

// node_modules/jose/dist/webapi/lib/jws_algorithms.js
var sig = [["verify"], ["sign"]];
function hmac(bits) {
  const subtle = { name: "HMAC", hash: `SHA-${bits}` };
  return { kty: ["oct"], secret: true, subtle, signing: subtle, usages: sig };
}
__name(hmac, "hmac");
function rsa(bits, saltLength) {
  const subtle = { name: saltLength ? "RSA-PSS" : "RSASSA-PKCS1-v1_5", hash: `SHA-${bits}` };
  return {
    kty: ["RSA"],
    subtle,
    signing: saltLength ? { ...subtle, saltLength } : subtle,
    usages: sig,
    minRsaBits: 2048
  };
}
__name(rsa, "rsa");
function ecdsa(crv, bits) {
  return {
    kty: ["EC"],
    crv,
    subtle: { name: "ECDSA", namedCurve: crv },
    signing: { name: "ECDSA", hash: `SHA-${bits}` },
    usages: sig
  };
}
__name(ecdsa, "ecdsa");
function eddsa() {
  const subtle = { name: "Ed25519" };
  return {
    kty: ["OKP"],
    crv: "Ed25519",
    subtle,
    signing: subtle,
    usages: sig
  };
}
__name(eddsa, "eddsa");
function mldsa(bits) {
  const subtle = { name: `ML-DSA-${bits}` };
  return {
    kty: ["AKP"],
    subtle,
    signing: subtle,
    usages: sig
  };
}
__name(mldsa, "mldsa");
var JWS = table({
  HS256: hmac(256),
  HS384: hmac(384),
  HS512: hmac(512),
  RS256: rsa(256),
  RS384: rsa(384),
  RS512: rsa(512),
  PS256: rsa(256, 32),
  PS384: rsa(384, 48),
  PS512: rsa(512, 64),
  ES256: ecdsa("P-256", 256),
  ES384: ecdsa("P-384", 384),
  ES512: ecdsa("P-521", 512),
  EdDSA: eddsa(),
  Ed25519: eddsa(),
  "ML-DSA-44": mldsa(44),
  "ML-DSA-65": mldsa(65),
  "ML-DSA-87": mldsa(87)
});
function jwsAlgorithm(alg) {
  const entry = typeof alg == "string" ? JWS[alg] : void 0;
  if (!entry)
    throw new JOSENotSupported(`alg ${alg} is not supported either by JOSE or your javascript runtime`);
  return entry;
}
__name(jwsAlgorithm, "jwsAlgorithm");

// node_modules/jose/dist/webapi/lib/jws_verify.js
function prepareVerify(options) {
  return [options && validateAlgorithms("algorithms", options.algorithms), options?.crit];
}
__name(prepareVerify, "prepareVerify");
function parseProtectedHeader(encodedProtected) {
  return encodedProtected === void 0 ? {} : parseJoseHeader(encodedProtected, JWSInvalid, "JWS Protected Header is invalid");
}
__name(parseProtectedHeader, "parseProtectedHeader");
function encodeCompactUnencodedPayload(payload) {
  try {
    return encode(payload);
  } catch {
    throw new JWSInvalid("JWS Compact Serialization payload must use only ASCII characters");
  }
}
__name(encodeCompactUnencodedPayload, "encodeCompactUnencodedPayload");
async function verifySignature(jws, shared, key, encodeUnencodedPayload, parsedProtected) {
  const { protected: encodedProtected, header, payload: inputPayload } = jws, parsedProt = parsedProtected ?? parseProtectedHeader(encodedProtected);
  if (!isDisjoint(parsedProt, header))
    throw new JWSInvalid("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
  const joseHeader = { ...parsedProt, ...header }, b64 = validateB64(parsedProt, validateCrit(JWSInvalid, JWS_RECOGNIZED, shared[1], parsedProt, joseHeader)), { alg } = joseHeader;
  if (typeof alg != "string" || !alg)
    throw new JWSInvalid('JWS "alg" (Algorithm) Header Parameter missing or invalid');
  if (shared[0] && !shared[0].has(alg))
    throw new JOSEAlgNotAllowed('"alg" (Algorithm) Header Parameter value not allowed');
  if (b64) {
    if (typeof inputPayload != "string")
      throw new JWSInvalid("JWS Payload must be a string");
  } else if (typeof inputPayload != "string" && !(inputPayload instanceof Uint8Array))
    throw new JWSInvalid("JWS Payload must be a string or an Uint8Array instance");
  const signingPayload = b64 || typeof inputPayload != "string" ? inputPayload : encodeUnencodedPayload(inputPayload);
  let resolvedKey = false;
  typeof key == "function" && (key = await key(parsedProt, jws), resolvedKey = true);
  const entry = jwsAlgorithm(alg), data = concat(encodedProtected !== void 0 ? encode(encodedProtected) : new Uint8Array(), encode("."), typeof signingPayload == "string" ? shared[2] ??= encodeBase64url(signingPayload, "payload", JWSInvalid) : signingPayload), signature = decodeBase64url(jws.signature, "signature", JWSInvalid), k = await prepareKey(entry, key, "verify"), cryptoKey = await rawKey(k, entry.subtle, "verify");
  entry.minRsaBits && checkModulusLength(entry.alg, cryptoKey);
  let verified = false;
  try {
    verified = await crypto.subtle.verify(entry.signing, cryptoKey, signature, data);
  } catch {
  }
  if (!verified)
    throw new JWSSignatureVerificationFailed();
  const result = { payload: typeof signingPayload == "string" ? decodeBase64url(signingPayload, "payload", JWSInvalid) : signingPayload };
  return encodedProtected !== void 0 && (result.protectedHeader = parsedProt), header !== void 0 && (result.unprotectedHeader = header), resolvedKey ? [{ ...result, key: k }, b64] : [result, b64];
}
__name(verifySignature, "verifySignature");
async function verifyCompact(jws, shared, key) {
  if (jws instanceof Uint8Array && (jws = decoder.decode(jws)), typeof jws != "string")
    throw new JWSInvalid("Compact JWS must be a string or Uint8Array");
  const { 0: protectedHeader, 1: payload, 2: signature, length } = jws.split(".");
  if (length !== 3)
    throw new JWSInvalid("Invalid Compact JWS");
  return verifySignature({ payload, protected: protectedHeader, signature }, shared, key, encodeCompactUnencodedPayload);
}
__name(verifyCompact, "verifyCompact");

// node_modules/jose/dist/webapi/lib/jwt_claims_set.js
var epoch = /* @__PURE__ */ __name((date) => Math.floor(date.getTime() / 1e3), "epoch");
var multipliers = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 604800,
  y: 31557600
};
var REGEX = /^(\+|\-)? ?(\d+|\d+\.\d+) ?(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)(?: (ago|from now))?$/i;
var checkFailed = "check_failed";
function invalidDuration() {
  throw new TypeError("Invalid time period format");
}
__name(invalidDuration, "invalidDuration");
function secs(str) {
  typeof str != "string" && invalidDuration();
  const matched = REGEX.exec(str);
  (!matched || matched[4] && matched[1]) && invalidDuration();
  const value = parseFloat(matched[2]), numericDate2 = Math.round(value * multipliers[matched[3][0].toLowerCase()]);
  return Number.isFinite(numericDate2) || invalidDuration(), matched[1] === "-" || matched[4] === "ago" ? -numericDate2 : numericDate2;
}
__name(secs, "secs");
function validateInput(label, input) {
  if (!Number.isFinite(input))
    throw new TypeError(`Invalid ${label} input`);
  return input;
}
__name(validateInput, "validateInput");
function validateStringClaim(claim, value) {
  if (typeof value != "string")
    throw new TypeError(`"${claim}" claim must be a string`);
}
__name(validateStringClaim, "validateStringClaim");
function validateAudienceClaim(value) {
  if (typeof value != "string" && (!Array.isArray(value) || Array.from(value).some((member) => typeof member != "string")))
    throw new TypeError('"aud" claim must be a string or an array of strings');
}
__name(validateAudienceClaim, "validateAudienceClaim");
function numericDate(value, label) {
  return typeof value == "number" ? validateInput(label, value) : value instanceof Date ? validateInput(label, epoch(value)) : epoch(/* @__PURE__ */ new Date()) + secs(value);
}
__name(numericDate, "numericDate");
var normalizeTyp = /* @__PURE__ */ __name((value) => {
  const normalized2 = value.toLowerCase();
  return value.includes("/") ? normalized2 : `application/${normalized2}`;
}, "normalizeTyp");
var checkAudiencePresence = /* @__PURE__ */ __name((audPayload, audOption) => typeof audPayload == "string" ? audOption.includes(audPayload) : Array.isArray(audPayload) ? audOption.some((aud) => audPayload.includes(aud)) : false, "checkAudiencePresence");
function validateNumericDate(payload, claim, required = false) {
  const value = payload[claim];
  if (!(value === void 0 && !required)) {
    if (typeof value != "number")
      throw new JWTClaimValidationFailed(`"${claim}" claim must be a number`, payload, claim, "invalid");
    return value;
  }
}
__name(validateNumericDate, "validateNumericDate");
function unexpectedClaim(payload, claim) {
  throw new JWTClaimValidationFailed(`unexpected "${claim}" claim value`, payload, claim, checkFailed);
}
__name(unexpectedClaim, "unexpectedClaim");
function validateClaimsSet(protectedHeader, encodedPayload, options = {}) {
  let payload;
  try {
    payload = JSON.parse(strictDecoder.decode(encodedPayload));
  } catch {
  }
  if (!isObject(payload))
    throw new JWTInvalid("JWT Claims Set must be a top-level JSON object");
  const { typ } = options;
  if (typ !== void 0 && (typeof protectedHeader.typ != "string" || normalizeTyp(protectedHeader.typ) !== normalizeTyp(typ)))
    throw new JWTClaimValidationFailed('unexpected "typ" JWT header value', payload, "typ", checkFailed);
  const { requiredClaims = [], issuer, subject, audience, maxTokenAge } = options, presenceCheck = [...requiredClaims];
  maxTokenAge !== void 0 && presenceCheck.push("iat"), audience !== void 0 && presenceCheck.push("aud"), subject !== void 0 && presenceCheck.push("sub"), issuer !== void 0 && presenceCheck.push("iss");
  for (const claim of new Set(presenceCheck.reverse()))
    if (!Object.hasOwn(payload, claim))
      throw new JWTClaimValidationFailed(`missing required "${claim}" claim`, payload, claim, "missing");
  issuer !== void 0 && !(Array.isArray(issuer) ? issuer : [issuer]).includes(payload.iss) && unexpectedClaim(payload, "iss"), subject !== void 0 && payload.sub !== subject && unexpectedClaim(payload, "sub"), audience !== void 0 && !checkAudiencePresence(payload.aud, typeof audience == "string" ? [audience] : audience) && unexpectedClaim(payload, "aud");
  const { clockTolerance } = options;
  let tolerance = 0;
  if (typeof clockTolerance == "string")
    tolerance = secs(clockTolerance);
  else if (clockTolerance !== void 0) {
    if (typeof clockTolerance != "number")
      throw new TypeError("Invalid clockTolerance option type");
    tolerance = clockTolerance;
  }
  validateInput("clockTolerance option", tolerance);
  const { currentDate } = options, now = validateInput("currentDate option", epoch(currentDate === void 0 ? /* @__PURE__ */ new Date() : currentDate)), iat = validateNumericDate(payload, "iat", maxTokenAge !== void 0), nbf = validateNumericDate(payload, "nbf");
  if (nbf !== void 0 && nbf > now + tolerance)
    throw new JWTClaimValidationFailed('"nbf" claim timestamp check failed', payload, "nbf", checkFailed);
  const exp = validateNumericDate(payload, "exp");
  if (exp !== void 0 && exp <= now - tolerance)
    throw new JWTExpired('"exp" claim timestamp check failed', payload, "exp", checkFailed);
  if (maxTokenAge !== void 0) {
    const age = now - iat, max = validateInput("maxTokenAge option", typeof maxTokenAge == "number" ? maxTokenAge : secs(maxTokenAge));
    if (age - tolerance > max)
      throw new JWTExpired('"iat" claim timestamp check failed (too far in the past)', payload, "iat", checkFailed);
    if (age < -tolerance)
      throw new JWTClaimValidationFailed('"iat" claim timestamp check failed (it should be in the past)', payload, "iat", checkFailed);
  }
  return payload;
}
__name(validateClaimsSet, "validateClaimsSet");
var producerPayloads;
function producerPayload(producer) {
  return producerPayloads.get(producer);
}
__name(producerPayload, "producerPayload");
function jwtData(producer) {
  const payload = producerPayload(producer);
  for (const claim of ["iat", "nbf", "exp"]) {
    const value = payload[claim];
    if (typeof value == "number" && !Number.isFinite(value))
      throw new TypeError(`"${claim}" claim must be a finite number`);
  }
  return encoder.encode(JSON.stringify(payload));
}
__name(jwtData, "jwtData");
var JWTClaimsBuilder = class {
  static {
    __name(this, "JWTClaimsBuilder");
  }
  constructor(payload = {}) {
    if (!isObject(payload))
      throw new TypeError("JWT Claims Set MUST be an object");
    (producerPayloads ||= /* @__PURE__ */ new WeakMap()).set(this, structuredClone(payload));
  }
  setIssuer(value) {
    return validateStringClaim("iss", value), producerPayload(this).iss = value, this;
  }
  setSubject(value) {
    return validateStringClaim("sub", value), producerPayload(this).sub = value, this;
  }
  setAudience(value) {
    return validateAudienceClaim(value), producerPayload(this).aud = value, this;
  }
  setJti(value) {
    return validateStringClaim("jti", value), producerPayload(this).jti = value, this;
  }
  setNotBefore(value) {
    return producerPayload(this).nbf = numericDate(value, "setNotBefore"), this;
  }
  setExpirationTime(value) {
    return producerPayload(this).exp = numericDate(value, "setExpirationTime"), this;
  }
  setIssuedAt(value) {
    const payload = producerPayload(this);
    return value === void 0 ? payload.iat = epoch(/* @__PURE__ */ new Date()) : typeof value == "string" ? payload.iat = validateInput("setIssuedAt", epoch(/* @__PURE__ */ new Date()) + secs(value)) : payload.iat = numericDate(value, "setIssuedAt"), this;
  }
};

// node_modules/jose/dist/webapi/jwt/verify.js
async function jwtVerify(jwt, key, options) {
  const [verified, b64] = await verifyCompact(jwt, prepareVerify(options), key);
  if (!b64)
    throw new JWTInvalid("JWTs MUST NOT use unencoded payload");
  const payload = validateClaimsSet(verified.protectedHeader, verified.payload, options);
  return { ...verified, payload };
}
__name(jwtVerify, "jwtVerify");

// node_modules/jose/dist/webapi/lib/jws_sign.js
async function createSignature(input, key, rejectUnencoded) {
  let [payload, protectedHeader, unprotectedHeader, crit] = input, protectedHeaderString = "";
  if (protectedHeader !== void 0) {
    const normalized2 = serializeJoseHeader(JWSInvalid, protectedHeader);
    protectedHeader = normalized2[0], protectedHeaderString = encode2(normalized2[1]);
  }
  if (unprotectedHeader !== void 0 && (unprotectedHeader = serializeJoseHeader(JWSInvalid, unprotectedHeader)[0]), !protectedHeader && !unprotectedHeader)
    throw new JWSInvalid("either setProtectedHeader or setUnprotectedHeader must be called before #sign()");
  if (!isDisjoint(protectedHeader, unprotectedHeader))
    throw new JWSInvalid("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
  const joseHeader = { ...protectedHeader, ...unprotectedHeader };
  validateCritDuplicates(JWSInvalid, protectedHeader);
  const b64 = validateB64(protectedHeader, validateCrit(JWSInvalid, JWS_RECOGNIZED, crit, protectedHeader, joseHeader));
  b64 || rejectUnencoded?.();
  const { alg } = joseHeader;
  if (typeof alg != "string" || !alg)
    throw new JWSInvalid('JWS "alg" (Algorithm) Header Parameter missing or invalid');
  const entry = jwsAlgorithm(alg);
  let payloadS = "", payloadB = payload, data;
  if (b64) {
    const encoded = input[4];
    encoded ? (payloadS = encoded[0] ??= encode2(payload), payloadB = encoded[1] ??= encode(payloadS)) : (payloadS = encode2(payload), data = encoder.encode(`${protectedHeaderString}.${payloadS}`));
  }
  data ??= concat(encode(protectedHeaderString), encode("."), payloadB);
  const k = await rawKey(await prepareKey(entry, key, "sign"), entry.subtle, "sign");
  entry.minRsaBits && checkModulusLength(entry.alg, k);
  const jws = {
    signature: encode2(new Uint8Array(await crypto.subtle.sign(entry.signing, k, data))),
    payload: payloadS
  };
  return protectedHeader && (jws.protected = protectedHeaderString), unprotectedHeader && (jws.header = unprotectedHeader), [jws, b64];
}
__name(createSignature, "createSignature");
async function createCompactSignature(payload, protectedHeader, crit, key, rejectUnencoded) {
  const [jws] = await createSignature([payload, protectedHeader, void 0, crit], key, rejectUnencoded);
  return `${jws.protected}.${jws.payload}.${jws.signature}`;
}
__name(createCompactSignature, "createCompactSignature");

// node_modules/jose/dist/webapi/jwt/sign.js
var SignJWT_base = JWTClaimsBuilder;
var SignJWT = class extends SignJWT_base {
  static {
    __name(this, "SignJWT");
  }
  #protectedHeader;
  setProtectedHeader(protectedHeader) {
    return assertNotSet(this.#protectedHeader, "setProtectedHeader"), this.#protectedHeader = protectedHeader, this;
  }
  async sign(key, options) {
    return createCompactSignature(jwtData(this), this.#protectedHeader, options?.crit, key, () => {
      throw new JWTInvalid("JWTs MUST NOT use unencoded payload");
    });
  }
};

// node_modules/jose/dist/webapi/lib/key_algorithm.js
var algArgument = '"alg" (Algorithm)';
function unsupportedAlg(source = 'JWK "alg" (Algorithm) Parameter') {
  throw new JOSENotSupported(`Invalid or unsupported ${source} value`);
}
__name(unsupportedAlg, "unsupportedAlg");
function keyAlgorithm(alg, source) {
  return (typeof alg == "string" ? JWS[alg] ?? JWE[alg] : void 0) ?? unsupportedAlg(source);
}
__name(keyAlgorithm, "keyAlgorithm");

// node_modules/jose/dist/webapi/lib/asn1.js
var bytesEqual = /* @__PURE__ */ __name((a, b) => {
  if (a.byteLength !== b.length)
    return false;
  for (let i = 0; i < a.byteLength; i++)
    if (a[i] !== b[i])
      return false;
  return true;
}, "bytesEqual");
var createASN1State = /* @__PURE__ */ __name((data) => ({ data, pos: 0 }), "createASN1State");
var readByte = /* @__PURE__ */ __name((state) => {
  const byte = state.data[state.pos++];
  if (byte === void 0)
    throw new Error("Unexpected end of ASN.1 input");
  return byte;
}, "readByte");
var parseLength = /* @__PURE__ */ __name((state) => {
  const first = readByte(state);
  if (first & 128) {
    const lengthOfLen = first & 127;
    let length = 0;
    for (let i = 0; i < lengthOfLen; i++)
      length = length << 8 | readByte(state);
    return length;
  }
  return first;
}, "parseLength");
var expectTag = /* @__PURE__ */ __name((state, expectedTag, errorMessage) => {
  if (readByte(state) !== expectedTag)
    throw new Error(errorMessage);
}, "expectTag");
var getSubarray = /* @__PURE__ */ __name((state, length) => {
  if (length < 0 || state.pos + length > state.data.length)
    throw new Error("Unexpected end of ASN.1 input");
  const result = state.data.subarray(state.pos, state.pos + length);
  return state.pos += length, result;
}, "getSubarray");
var parseAlgorithmOID = /* @__PURE__ */ __name((state) => {
  expectTag(state, 6, "Expected algorithm OID");
  const oidLen = parseLength(state);
  return getSubarray(state, oidLen);
}, "parseAlgorithmOID");
function parseKeyHeader(state, keyFormat) {
  if (expectTag(state, 48, `Invalid ${keyFormat === "spki" ? "SPKI" : "PKCS#8"} structure`), parseLength(state), keyFormat === "pkcs8") {
    expectTag(state, 2, "Expected version field");
    const length = parseLength(state);
    state.pos += length;
  }
  expectTag(state, 48, "Expected algorithm identifier"), parseLength(state);
}
__name(parseKeyHeader, "parseKeyHeader");
var parseECAlgorithmIdentifier = /* @__PURE__ */ __name((state) => {
  const algOid = parseAlgorithmOID(state);
  if (bytesEqual(algOid, [43, 101, 110]))
    return "X25519";
  if (!bytesEqual(algOid, [42, 134, 72, 206, 61, 2, 1]))
    throw new Error("Unsupported key algorithm");
  expectTag(state, 6, "Expected curve OID");
  const curveOidLen = parseLength(state), curveOid = getSubarray(state, curveOidLen);
  if (bytesEqual(curveOid, [42, 134, 72, 206, 61, 3, 1, 7]))
    return "P-256";
  if (bytesEqual(curveOid, [43, 129, 4, 0, 34]))
    return "P-384";
  if (bytesEqual(curveOid, [43, 129, 4, 0, 35]))
    return "P-521";
  throw new Error("Unsupported named curve");
}, "parseECAlgorithmIdentifier");
var genericImport = /* @__PURE__ */ __name(async (keyFormat, keyData, alg, options) => {
  const extractable = validateExtractableOption(options?.extractable), entry = keyAlgorithm(alg, algArgument);
  entry.secret && unsupportedAlg(algArgument);
  const isPublic = keyFormat === "spki";
  let algorithm;
  if (entry.resolve)
    try {
      const state = createASN1State(keyData);
      parseKeyHeader(state, keyFormat), algorithm = entry.resolve({ crv: parseECAlgorithmIdentifier(state) });
    } catch {
      throw new JOSENotSupported("Invalid or unsupported key format");
    }
  else
    algorithm = entry.subtle;
  return crypto.subtle.importKey(keyFormat, keyData, algorithm, extractable ?? isPublic, entry.usages[isPublic ? 0 : 1]);
}, "genericImport");
var processPEMData = /* @__PURE__ */ __name((pem, pattern) => decodeBase64(pem.replace(pattern, "")), "processPEMData");
var fromPKCS8 = /* @__PURE__ */ __name((pem, alg, options) => {
  const keyData = processPEMData(pem, /(?:-----(?:BEGIN|END) PRIVATE KEY-----|\s)/g);
  return genericImport("pkcs8", keyData, alg, options);
}, "fromPKCS8");

// node_modules/jose/dist/webapi/jwks/local.js
function isUsableJWK(jwk, entry, alg, kid) {
  const { kty, key_ops: keyOps, ext, kid: jwkKid, alg: jwkAlg, use, crv } = jwk;
  return (ext === void 0 || typeof ext == "boolean") && (keyOps === void 0 || Array.isArray(keyOps) && keyOps.every((operation, index) => typeof operation == "string" && keyOps.indexOf(operation) === index) && keyOps.includes("verify")) && entry.kty.includes(kty) && (kid === void 0 || typeof kid == "string" && kid === jwkKid) && (jwkAlg === void 0 ? kty !== "AKP" : alg === jwkAlg) && (use === void 0 || use === "sig") && (!entry.crv || crv === entry.crv);
}
__name(isUsableJWK, "isUsableJWK");
async function importWithAlgCache(cache2, jwk, entry) {
  const cached = cache2.get(jwk) || cache2.set(jwk, {}).get(jwk), { alg } = entry;
  if (cached[alg] === void 0) {
    const pending = jwkToKey(entry, jwk, true).then((key) => {
      if (key.type !== "public")
        throw new JWKSInvalid("JSON Web Key Set members must be public keys");
      return cached[alg] = key, key;
    }).catch((error) => {
      throw cached[alg] === pending && delete cached[alg], error;
    });
    cached[alg] = pending;
  }
  return cached[alg];
}
__name(importWithAlgCache, "importWithAlgCache");
function createLocalJWKSet(jwks) {
  let snapshot;
  try {
    snapshot = structuredClone(jwks);
  } catch {
  }
  if (!isJwkSet(snapshot))
    throw new JWKSInvalid("JSON Web Key Set malformed");
  const metadata = snapshot.keys.map((jwk) => {
    const normalized2 = snapshotJwk(jwk);
    return Array.isArray(normalized2.key_ops) && (normalized2.key_ops = [...normalized2.key_ops]), normalized2;
  }), cached = /* @__PURE__ */ new WeakMap();
  return Object.defineProperty(async (protectedHeader, token) => {
    const { alg, kid } = { ...protectedHeader, ...token?.header }, entry = typeof alg == "string" ? JWS[alg] : void 0;
    if (!entry || entry.secret)
      throw new JOSENotSupported('Unsupported "alg" value for a JSON Web Key Set');
    const candidates = snapshot.keys.filter((_, index) => isUsableJWK(metadata[index], entry, alg, kid)), { 0: jwk, length } = candidates;
    if (!length)
      throw new JWKSNoMatchingKey();
    if (length !== 1) {
      const error = new JWKSMultipleMatchingKeys();
      throw error[Symbol.asyncIterator] = async function* () {
        for (const jwk2 of candidates)
          try {
            yield await importWithAlgCache(cached, jwk2, entry);
          } catch {
          }
      }, error;
    }
    return importWithAlgCache(cached, jwk, entry);
  }, "jwks", {
    value: /* @__PURE__ */ __name(() => structuredClone(snapshot), "value")
  });
}
__name(createLocalJWKSet, "createLocalJWKSet");

// node_modules/jose/dist/webapi/jwks/remote.js
function isCloudflareWorkers() {
  return typeof WebSocketPair < "u" || typeof navigator < "u" && true || typeof EdgeRuntime < "u" && EdgeRuntime === "vercel";
}
__name(isCloudflareWorkers, "isCloudflareWorkers");
var USER_AGENT;
(typeof navigator > "u" || !"Cloudflare-Workers"?.startsWith?.("Mozilla/5.0 ")) && (USER_AGENT = "jose/v6.2.12");
var customFetch = /* @__PURE__ */ Symbol();
async function fetchJwks(url, headers, signal, fetchImpl = fetch) {
  const response = await fetchImpl(url, {
    method: "GET",
    signal,
    redirect: "manual",
    headers
  }).catch((err) => {
    throw err.name === "TimeoutError" ? new JWKSTimeout() : err;
  });
  if (response.status !== 200)
    throw new JOSEError("Expected 200 OK from the JSON Web Key Set HTTP response");
  try {
    return await response.json();
  } catch {
    throw new JOSEError("Failed to parse the JSON Web Key Set HTTP response as JSON");
  }
}
__name(fetchJwks, "fetchJwks");
var jwksCache = /* @__PURE__ */ Symbol();
function isFreshFor(timestamp, duration) {
  return Number.isFinite(timestamp) && Date.now() < timestamp + duration;
}
__name(isFreshFor, "isFreshFor");
function validateDuration(value, fallback, option) {
  if (Number.isNaN(value))
    throw new TypeError(`"${option}" option must not be NaN`);
  return typeof value == "number" ? value : fallback;
}
__name(validateDuration, "validateDuration");
function createRemoteJWKSet(url, options) {
  if (!(url instanceof URL))
    throw new TypeError("url must be an instance of URL");
  const href = new URL(url.href).href, opts = options ?? {}, timeoutOption = opts.timeoutDuration;
  if (typeof timeoutOption == "number" && (!Number.isInteger(timeoutOption) || timeoutOption < 0))
    throw new TypeError('"timeoutDuration" option must be a non-negative integer');
  const timeoutDuration = typeof timeoutOption == "number" ? timeoutOption : 5e3, cooldownDuration = validateDuration(opts.cooldownDuration, 3e4, "cooldownDuration"), cacheMaxAge = validateDuration(opts.cacheMaxAge, 6e5, "cacheMaxAge"), headers = new Headers(opts.headers);
  USER_AGENT && !headers.has("User-Agent") && headers.set("User-Agent", USER_AGENT), headers.has("accept") || headers.set("accept", "application/json, application/jwk-set+json");
  const fetchImpl = opts[customFetch], cache2 = opts[jwksCache];
  let jwksTimestamp, pendingFetch, reloadSequence = 0, appliedSequence = 0, local;
  if (cache2 && typeof cache2 == "object") {
    const { uat, jwks } = cache2;
    isFreshFor(uat, cacheMaxAge) && isJwkSet(jwks) && (jwksTimestamp = uat, local = createLocalJWKSet(jwks));
  }
  const reload = /* @__PURE__ */ __name(async () => {
    if (pendingFetch && isCloudflareWorkers() && (pendingFetch = void 0), !pendingFetch) {
      const sequence = ++reloadSequence, current = pendingFetch = fetchJwks(href, headers, AbortSignal.timeout(timeoutDuration), fetchImpl).then((json2) => {
        const next = createLocalJWKSet(json2);
        if (sequence <= appliedSequence)
          return;
        local = next;
        const updatedAt = Date.now();
        cache2 && (cache2.uat = updatedAt, cache2.jwks = json2), jwksTimestamp = updatedAt, appliedSequence = sequence;
      }).finally(() => {
        pendingFetch === current && (pendingFetch = void 0);
      });
    }
    await pendingFetch;
  }, "reload");
  return Object.defineProperties(async (protectedHeader, token) => {
    (!local || !isFreshFor(jwksTimestamp, cacheMaxAge)) && await reload();
    try {
      return await local(protectedHeader, token);
    } catch (err) {
      if (err instanceof JWKSNoMatchingKey && !isFreshFor(jwksTimestamp, cooldownDuration))
        return await reload(), local(protectedHeader, token);
      throw err;
    }
  }, {
    coolingDown: {
      get: /* @__PURE__ */ __name(() => isFreshFor(jwksTimestamp, cooldownDuration), "get"),
      enumerable: true
    },
    fresh: {
      get: /* @__PURE__ */ __name(() => isFreshFor(jwksTimestamp, cacheMaxAge), "get"),
      enumerable: true
    },
    reload: {
      value: reload,
      enumerable: true
    },
    reloading: {
      get: /* @__PURE__ */ __name(() => !!pendingFetch, "get"),
      enumerable: true
    },
    jwks: {
      value: /* @__PURE__ */ __name(() => local?.jwks(), "value"),
      enumerable: true
    }
  });
}
__name(createRemoteJWKSet, "createRemoteJWKSet");

// node_modules/jose/dist/webapi/key/import.js
async function importPKCS8(pkcs8, alg, options) {
  if (typeof pkcs8 != "string" || pkcs8.indexOf("-----BEGIN PRIVATE KEY-----") !== 0)
    throw new TypeError('"pkcs8" must be PKCS#8 formatted string');
  return fromPKCS8(pkcs8, alg, options);
}
__name(importPKCS8, "importPKCS8");

// src/index.js
var json = /* @__PURE__ */ __name((body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", ...headers }
}), "json");
function corsHeaders(request, env) {
  const origin = request.headers.get("origin") || "";
  const allowed = String(env.ALLOWED_ORIGINS || "").split(",").map((x) => x.trim()).filter(Boolean);
  return allowed.includes(origin) ? {
    "access-control-allow-origin": origin,
    "access-control-allow-headers": "authorization,content-type",
    "access-control-allow-methods": "POST,OPTIONS",
    "vary": "Origin"
  } : {};
}
__name(corsHeaders, "corsHeaders");
var clean = /* @__PURE__ */ __name((value) => String(value || "").trim(), "clean");
var normalized = /* @__PURE__ */ __name((value) => clean(value).toLowerCase(), "normalized");
function safeId(value, label = "identifier") {
  const id = clean(value);
  if (!/^[A-Za-z0-9_-]{1,180}$/.test(id)) throw Object.assign(new Error(`Invalid ${label}.`), { status: 400 });
  return id;
}
__name(safeId, "safeId");
var CMS_COLLECTION_FIELDS = Object.freeze({
  homepageStats: ["title", "description", "value", "suffix", "category"],
  homepageMedia: ["title", "description", "type", "url", "imageUrl"],
  homepagePartners: ["title", "description", "logoUrl", "websiteUrl", "category"],
  homepagePodcasts: ["title", "description", "audioUrl", "category", "imageUrl"],
  homepageReports: ["title", "description", "url", "category", "imageUrl"],
  homepageVideos: ["title", "description", "youtubeUrl", "thumbnailUrl", "category"]
});
function cmsCollection(value) {
  const collectionName = clean(value);
  if (!Object.hasOwn(CMS_COLLECTION_FIELDS, collectionName)) {
    throw Object.assign(new Error("Unsupported content collection."), { status: 400 });
  }
  return collectionName;
}
__name(cmsCollection, "cmsCollection");
function cmsRecord(collectionName, input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw Object.assign(new Error("Invalid content record."), { status: 400 });
  }
  const record = {};
  for (const field of CMS_COLLECTION_FIELDS[collectionName]) {
    const value = clean(input[field]);
    if (value.length > 2e3) throw Object.assign(new Error(`${field} is too long.`), { status: 400 });
    record[field] = value;
  }
  if (!record.title) throw Object.assign(new Error("Title is required."), { status: 400 });
  const status = normalized(input.status) || "active";
  if (!["active", "draft", "hidden"].includes(status)) {
    throw Object.assign(new Error("Invalid content status."), { status: 400 });
  }
  const order = Number(input.order || 0);
  if (!Number.isFinite(order) || !Number.isInteger(order) || Math.abs(order) > 1e5) {
    throw Object.assign(new Error("Invalid content order."), { status: 400 });
  }
  return { ...record, status, order };
}
__name(cmsRecord, "cmsRecord");
async function sha1Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
__name(sha1Hex, "sha1Hex");
async function sha1Base64Url(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  let binary = "";
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
__name(sha1Base64Url, "sha1Base64Url");
async function deterministicVerificationCode(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].slice(0, 8).map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
}
__name(deterministicVerificationCode, "deterministicVerificationCode");
function toFirestore(value) {
  if (value === null || value === void 0) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestore) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toFirestore(v)])) } };
}
__name(toFirestore, "toFirestore");
function fromFirestore(value) {
  if (!value) return null;
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("stringValue" in value) return value.stringValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(fromFirestore);
  if ("mapValue" in value) return decodeFields(value.mapValue.fields || {});
  return null;
}
__name(fromFirestore, "fromFirestore");
function decodeFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fromFirestore(value)]));
}
__name(decodeFields, "decodeFields");
function encodeFields(data) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, toFirestore(value)]));
}
__name(encodeFields, "encodeFields");
async function firebaseAccessToken(env) {
  const cached = await env.TOKEN_CACHE?.get("firebase-access-token", "json");
  if (cached?.token) return cached.token;
  const key = await importPKCS8(String(env.FIREBASE_PRIVATE_KEY).replace(/\\n/g, "\n"), "RS256");
  const now = Math.floor(Date.now() / 1e3);
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/datastore" }).setProtectedHeader({ alg: "RS256", typ: "JWT" }).setIssuer(env.FIREBASE_CLIENT_EMAIL).setSubject(env.FIREBASE_CLIENT_EMAIL).setAudience("https://oauth2.googleapis.com/token").setIssuedAt(now).setExpirationTime(now + 3500).sign(key);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion })
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) throw new Error("Firebase service authorization failed.");
  await env.TOKEN_CACHE?.put("firebase-access-token", JSON.stringify({ token: result.access_token }), { expirationTtl: 3300 });
  return result.access_token;
}
__name(firebaseAccessToken, "firebaseAccessToken");
var databaseName = /* @__PURE__ */ __name((env) => `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)`, "databaseName");
var databaseUrl = /* @__PURE__ */ __name((env) => `https://firestore.googleapis.com/v1/${databaseName(env)}`, "databaseUrl");
var documentUrl = /* @__PURE__ */ __name((env, path) => `${databaseUrl(env)}/documents/${path}`, "documentUrl");
async function firestoreRequest(env, url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${await firebaseAccessToken(env)}`, "content-type": "application/json", ...init.headers || {} }
  });
  if (response.status === 404) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.error?.message || "Firestore request failed.");
    error.firestoreStatus = body?.error?.status;
    error.status = response.status;
    throw error;
  }
  return body;
}
__name(firestoreRequest, "firestoreRequest");
async function getDocument(env, path, transaction = "") {
  const url = new URL(documentUrl(env, path));
  if (transaction) url.searchParams.set("transaction", transaction);
  const doc = await firestoreRequest(env, url.toString());
  return doc ? { id: doc.name.split("/").pop(), ...decodeFields(doc.fields) } : null;
}
__name(getDocument, "getDocument");
async function listDocuments(env, collectionPath, limit = 1e3) {
  const documents = [];
  let pageToken = "";
  do {
    const url = new URL(documentUrl(env, collectionPath));
    url.searchParams.set("pageSize", String(Math.min(100, limit - documents.length)));
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const page = await firestoreRequest(env, url.toString());
    for (const doc of page?.documents || []) {
      documents.push({ id: doc.name.split("/").pop(), ...decodeFields(doc.fields) });
      if (documents.length >= limit) break;
    }
    pageToken = page?.nextPageToken || "";
  } while (pageToken && documents.length < limit);
  return { documents, truncated: Boolean(pageToken) };
}
__name(listDocuments, "listDocuments");
function documentWrite(env, path, data) {
  return { update: { name: `${databaseName(env)}/documents/${path}`, fields: encodeFields(data) } };
}
__name(documentWrite, "documentWrite");
function documentDelete(env, path) {
  return { delete: `${databaseName(env)}/documents/${path}` };
}
__name(documentDelete, "documentDelete");
async function rollbackTransaction(env, transaction) {
  await firestoreRequest(env, `${databaseUrl(env)}/documents:rollback`, {
    method: "POST",
    body: JSON.stringify({ transaction })
  }).catch(() => null);
}
__name(rollbackTransaction, "rollbackTransaction");
async function runTransaction(env, operation, maxAttempts = 4) {
  let lastError;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const started = await firestoreRequest(env, `${databaseUrl(env)}/documents:beginTransaction`, {
      method: "POST",
      body: JSON.stringify({ options: { readWrite: {} } })
    });
    const transaction = started.transaction;
    const writes = [];
    try {
      const result = await operation({
        get: /* @__PURE__ */ __name((path) => getDocument(env, path, transaction), "get"),
        set: /* @__PURE__ */ __name((path, data) => writes.push(documentWrite(env, path, data)), "set"),
        delete: /* @__PURE__ */ __name((path) => writes.push(documentDelete(env, path)), "delete")
      });
      await firestoreRequest(env, `${databaseUrl(env)}/documents:commit`, {
        method: "POST",
        body: JSON.stringify({ writes, transaction })
      });
      return result;
    } catch (error) {
      lastError = error;
      await rollbackTransaction(env, transaction);
      if (error.firestoreStatus !== "ABORTED" || attempt === maxAttempts - 1) throw error;
    }
  }
  throw lastError;
}
__name(runTransaction, "runTransaction");
async function authenticatedUser(request, env) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) throw Object.assign(new Error("Authentication required."), { status: 401 });
  const issuer = `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`;
  const jwks = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));
  const { payload } = await jwtVerify(token, jwks, { issuer, audience: env.FIREBASE_PROJECT_ID });
  const uid = clean(payload.sub);
  const profile = await getDocument(env, `users/${uid}`);
  if (!profile || normalized(profile.status) !== "approved") {
    throw Object.assign(new Error("Approved account required."), { status: 403 });
  }
  return { uid, email: clean(payload.email), profile };
}
__name(authenticatedUser, "authenticatedUser");
function requireAdmin(user) {
  if (!["admin", "super_admin"].includes(normalized(user.profile.role))) {
    throw Object.assign(new Error("Administrator access required."), { status: 403 });
  }
}
__name(requireAdmin, "requireAdmin");
var modulesOf = /* @__PURE__ */ __name((course) => Array.isArray(course.modules) ? course.modules : [], "modulesOf");
var lessonsOf = /* @__PURE__ */ __name((module) => Array.isArray(module?.lessons) ? module.lessons : [], "lessonsOf");
var lessonId = /* @__PURE__ */ __name((courseId, mi, lesson, li) => lesson?.id || `${courseId}-m${mi + 1}-l${li + 1}`, "lessonId");
var assessmentId = /* @__PURE__ */ __name((courseId, type, mi) => type === "final" ? `${courseId}__final` : `${courseId}__module__${mi}`, "assessmentId");
function emptyProgress(uid, courseId, course) {
  return { userId: uid, courseId, courseTitle: course.title || "", completedLessons: [], passedModuleQuizzes: {}, moduleQuizScores: {}, finalAssessmentPassed: false, finalAssessmentScore: 0, percent: 0, progress: 0, status: "in_progress" };
}
__name(emptyProgress, "emptyProgress");
function counts(courseId, course, progress) {
  const done = new Set(progress.completedLessons || []);
  let total = 0, complete = 0;
  modulesOf(course).forEach((module, mi) => {
    const ids = lessonsOf(module).map((lesson, li) => lessonId(courseId, mi, lesson, li));
    total += ids.length + (module.quiz ? 1 : 0);
    complete += ids.filter((id) => done.has(id)).length + (module.quiz && progress.passedModuleQuizzes?.[String(mi)] === true ? 1 : 0);
  });
  return { total, complete, percent: total ? Math.round(complete / total * 100) : 0 };
}
__name(counts, "counts");
function moduleComplete(courseId, modules, mi, progress) {
  const done = new Set(progress.completedLessons || []);
  return lessonsOf(modules[mi]).every((lesson, li) => done.has(lessonId(courseId, mi, lesson, li))) && (!modules[mi].quiz || progress.passedModuleQuizzes?.[String(mi)] === true);
}
__name(moduleComplete, "moduleComplete");
function previousModulesComplete(courseId, modules, target, progress) {
  for (let i = 0; i < target; i++) if (!moduleComplete(courseId, modules, i, progress)) return false;
  return true;
}
__name(previousModulesComplete, "previousModulesComplete");
function publicProgress(progress, course) {
  const result = counts(progress.courseId, course, progress);
  return { ...progress, percent: result.percent, progress: result.percent };
}
__name(publicProgress, "publicProgress");
async function learningContext(env, user, courseId, reader = (path) => getDocument(env, path)) {
  const course = await reader(`courses/${courseId}`);
  if (!course) throw Object.assign(new Error("Course not found."), { status: 404 });
  const progressPath = `userProgress/${user.uid}_${courseId}`;
  const progress = await reader(progressPath) || emptyProgress(user.uid, courseId, course);
  return { course, progress, progressPath, modules: modulesOf(course) };
}
__name(learningContext, "learningContext");
function safeAssessment(assessment) {
  return {
    id: assessment.id,
    type: assessment.type,
    title: assessment.title || "Assessment",
    passMark: Number(assessment.passMark || 70),
    questions: (assessment.questions || []).map((q, index) => ({ index, question: q.question || q.text || `Question ${index + 1}`, options: (q.options || []).map((x) => typeof x === "object" ? x.text || x.label || "" : x) }))
  };
}
__name(safeAssessment, "safeAssessment");
function answerIndex(question) {
  if (Number.isInteger(question.answer)) return question.answer;
  if (Number.isInteger(question.correctAnswer)) return question.correctAnswer;
  return null;
}
__name(answerIndex, "answerIndex");
async function assessmentContext(env, user, courseId, type, mi, reader = (path) => getDocument(env, path)) {
  const ctx = await learningContext(env, user, courseId, reader);
  if (!["module", "final"].includes(type)) throw Object.assign(new Error("Invalid assessment type."), { status: 400 });
  if (type === "module") {
    if (!Number.isInteger(mi) || !ctx.modules[mi]) throw Object.assign(new Error("Invalid module."), { status: 400 });
    if (!previousModulesComplete(courseId, ctx.modules, mi, ctx.progress)) throw Object.assign(new Error("Complete the previous module first."), { status: 409 });
    const done = new Set(ctx.progress.completedLessons || []);
    if (!lessonsOf(ctx.modules[mi]).every((lesson, li) => done.has(lessonId(courseId, mi, lesson, li)))) {
      throw Object.assign(new Error("Complete all lessons in this module first."), { status: 409 });
    }
  } else if (counts(courseId, ctx.course, ctx.progress).percent !== 100) {
    throw Object.assign(new Error("Complete all course requirements first."), { status: 409 });
  }
  const assessment = await reader(`courseAssessments/${assessmentId(courseId, type, mi)}`);
  if (!assessment) throw Object.assign(new Error("Secure assessment unavailable."), { status: 404 });
  return { ...ctx, assessment };
}
__name(assessmentContext, "assessmentContext");
async function authenticatedEvidenceResponse(env, record) {
  const publicId = clean(record.evidencePublicId);
  const ownerId = safeId(record.userId, "evidence owner identifier");
  const version = Number(record.evidenceVersion);
  const format = normalized(record.evidenceFormat || "jpg");
  const resourceType = normalized(record.evidenceResourceType || "image");
  const expectedPrefix = `speakout/private-evidence/${ownerId}/`;
  const assetName = publicId.slice(expectedPrefix.length);
  if (!publicId.startsWith(expectedPrefix) || !/^[A-Za-z0-9-]{8,80}$/.test(assetName) || !Number.isInteger(version) || version < 1 || !/^[a-z0-9]{2,12}$/.test(format) || resourceType !== "image") {
    throw Object.assign(new Error("This evidence record needs migration before it can be viewed securely."), { status: 409 });
  }
  const encodedPublicId = publicId.split("/").map(encodeURIComponent).join("/");
  const deliveryTail = `v${version}/${encodedPublicId}.${format}`;
  const signature = (await sha1Base64Url(`${deliveryTail}${env.CLOUDINARY_API_SECRET}`)).slice(0, 8);
  const response = await fetch(`https://res.cloudinary.com/${encodeURIComponent(env.CLOUDINARY_CLOUD_NAME)}/${resourceType}/authenticated/s--${signature}--/${deliveryTail}`);
  if (!response.ok || !response.body) {
    throw Object.assign(new Error("Secure evidence retrieval failed."), { status: response.status === 404 ? 404 : 502 });
  }
  return new Response(response.body, {
    status: 200,
    headers: {
      "content-type": response.headers.get("content-type") || `image/${format}`,
      "content-disposition": `inline; filename="evidence.${format}"`,
      "cache-control": "private, no-store, max-age=0",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow"
    }
  });
}
__name(authenticatedEvidenceResponse, "authenticatedEvidenceResponse");
async function route(request, env, path, data) {
  const user = await authenticatedUser(request, env);
  const courseId = path.startsWith("/v1/learning/") ? safeId(data.courseId, "course identifier") : clean(data.courseId);
  if (path === "/v1/admin/media/evidence") {
    requireAdmin(user);
    const recordId = safeId(data.recordId, "record identifier");
    const record = await getDocument(env, `externalLearningRecords/${recordId}`);
    if (!record) throw Object.assign(new Error("Evidence record not found."), { status: 404 });
    return authenticatedEvidenceResponse(env, record);
  }
  if (path === "/v1/media/evidence") {
    const file = data.file;
    if (!(file instanceof File)) throw Object.assign(new Error("Select an evidence image."), { status: 400 });
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) {
      throw Object.assign(new Error("Evidence must be a JPG, PNG or WebP image below 8 MB."), { status: 400 });
    }
    const timestamp = Math.floor(Date.now() / 1e3);
    const folder = `speakout/private-evidence/${user.uid}`;
    const publicId = crypto.randomUUID();
    const signatureBase = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}&type=authenticated${env.CLOUDINARY_API_SECRET}`;
    const upload = new FormData();
    upload.append("file", file);
    upload.append("api_key", env.CLOUDINARY_API_KEY);
    upload.append("timestamp", String(timestamp));
    upload.append("folder", folder);
    upload.append("public_id", publicId);
    upload.append("type", "authenticated");
    upload.append("signature", await sha1Hex(signatureBase));
    const response = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: upload });
    const result = await response.json();
    if (!response.ok) throw Object.assign(new Error("Secure evidence upload failed."), { status: 502 });
    return {
      assetId: result.asset_id,
      publicId: result.public_id,
      version: result.version,
      format: result.format,
      resourceType: result.resource_type
    };
  }
  if (path === "/v1/learning/state") {
    const ctx = await learningContext(env, user, courseId);
    return { progress: publicProgress(ctx.progress, ctx.course) };
  }
  if (path === "/v1/learning/lessons/complete") {
    return runTransaction(env, async (tx) => {
      const ctx = await learningContext(env, user, courseId, tx.get);
      const target = clean(data.lessonId);
      let found;
      ctx.modules.forEach((module, mi) => lessonsOf(module).forEach((lesson, li) => {
        if (lessonId(courseId, mi, lesson, li) === target) found = { mi, li };
      }));
      if (!found) throw Object.assign(new Error("Lesson not found."), { status: 404 });
      if (!previousModulesComplete(courseId, ctx.modules, found.mi, ctx.progress)) throw Object.assign(new Error("Complete the previous module first."), { status: 409 });
      if (found.li > 0) {
        const prior = lessonId(courseId, found.mi, ctx.modules[found.mi].lessons[found.li - 1], found.li - 1);
        if (!(ctx.progress.completedLessons || []).includes(prior)) throw Object.assign(new Error("Complete the previous lesson first."), { status: 409 });
      }
      const completed = [.../* @__PURE__ */ new Set([...ctx.progress.completedLessons || [], target])];
      const updated = publicProgress({ ...ctx.progress, completedLessons: completed, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, ctx.course);
      tx.set(ctx.progressPath, updated);
      return { progress: updated };
    });
  }
  if (path === "/v1/learning/assessments/get" || path === "/v1/learning/assessments/submit") {
    const type = normalized(data.type);
    const mi = Number(data.moduleIndex);
    if (path.endsWith("/get")) {
      const ctx = await assessmentContext(env, user, courseId, type, mi);
      return { assessment: safeAssessment(ctx.assessment) };
    }
    return runTransaction(env, async (tx) => {
      const ctx = await assessmentContext(env, user, courseId, type, mi, tx.get);
      const answers = Array.isArray(data.answers) ? data.answers : [];
      const questions = ctx.assessment.questions || [];
      if (!questions.length || answers.length !== questions.length) throw Object.assign(new Error("Answer every question."), { status: 400 });
      let correct = 0;
      questions.forEach((question, index) => {
        const key = answerIndex(question);
        if (key === null) throw Object.assign(new Error("Assessment configuration error."), { status: 500 });
        if (Number(answers[index]) === key) correct++;
      });
      const score = Math.round(correct / questions.length * 100);
      const passMark = Number(ctx.assessment.passMark || 70);
      const passed = score >= passMark;
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const updated = { ...ctx.progress, passedModuleQuizzes: { ...ctx.progress.passedModuleQuizzes || {} }, moduleQuizScores: { ...ctx.progress.moduleQuizScores || {} }, updatedAt: now };
      let certificate = null;
      if (type === "module") {
        updated.moduleQuizScores[String(mi)] = Math.max(Number(updated.moduleQuizScores[String(mi)] || 0), score);
        if (passed) updated.passedModuleQuizzes[String(mi)] = true;
      } else {
        updated.finalAssessmentScore = Math.max(Number(updated.finalAssessmentScore || 0), score);
        if (passed) {
          updated.finalAssessmentPassed = true;
          updated.status = "completed";
          const id = `${user.uid}_${courseId}`;
          const existing = await tx.get(`certificates/${id}`);
          if (!existing) {
            const verificationCode = await deterministicVerificationCode(`course:${id}`);
            const record = { id, userId: user.uid, recipientName: user.profile.fullName || user.email, courseId, courseTitle: ctx.course.title || "Course", type: "course", status: "active", finalScore: score, verificationCode, issueDate: now.slice(0, 10), createdAt: now };
            tx.set(`certificates/${id}`, record);
            tx.set(`publicCertificateVerifications/${verificationCode}`, { recipientName: record.recipientName, awardTitle: record.courseTitle, issuer: "SpeakOut Mental Health Outreach", issueDate: record.issueDate, status: record.status, certificateNumber: id });
            certificate = { id, verificationCode };
          } else certificate = { id, verificationCode: existing.verificationCode };
          updated.certificateId = id;
        }
      }
      const finalProgress = publicProgress(updated, ctx.course);
      tx.set(ctx.progressPath, finalProgress);
      return { score, passMark, passed, progress: finalProgress, certificate };
    });
  }
  if (path === "/v1/admin/assessments/migrate") {
    requireAdmin(user);
    if (data.dryRun !== true) throw Object.assign(new Error("Only dry-run migration inventory is enabled."), { status: 409 });
    const [coursesPage, assessmentsPage, certificatesPage, projectionsPage, evidencePage] = await Promise.all([
      listDocuments(env, "courses"),
      listDocuments(env, "courseAssessments"),
      listDocuments(env, "certificates"),
      listDocuments(env, "publicCertificateVerifications"),
      listDocuments(env, "externalLearningRecords")
    ]);
    const assessmentIds = new Set(assessmentsPage.documents.map((item) => item.id));
    let embeddedModuleAssessments = 0;
    let embeddedFinalAssessments = 0;
    let missingSecureAssessments = 0;
    for (const course of coursesPage.documents) {
      modulesOf(course).forEach((module, mi) => {
        if (!module.quiz) return;
        embeddedModuleAssessments++;
        if (!assessmentIds.has(assessmentId(course.id, "module", mi))) missingSecureAssessments++;
      });
      if (course.finalAssessment || course.finalQuiz) {
        embeddedFinalAssessments++;
        if (!assessmentIds.has(assessmentId(course.id, "final", 0))) missingSecureAssessments++;
      }
    }
    const certificateCodes = /* @__PURE__ */ new Map();
    let certificatesMissingCode = 0;
    let duplicateVerificationCodes = 0;
    let missingPublicProjections = 0;
    const projectionIds = new Set(projectionsPage.documents.map((item) => item.id));
    for (const certificate of certificatesPage.documents) {
      const code = clean(certificate.verificationCode);
      if (!code) certificatesMissingCode++;
      else {
        certificateCodes.set(code, (certificateCodes.get(code) || 0) + 1);
        if (!projectionIds.has(code)) missingPublicProjections++;
      }
    }
    certificateCodes.forEach((count) => {
      if (count > 1) duplicateVerificationCodes += count - 1;
    });
    const orphanPublicProjections = projectionsPage.documents.filter((item) => !certificateCodes.has(item.id)).length;
    const evidenceMetadataIncomplete = evidencePage.documents.filter((item) => {
      const hasLegacyEvidence = Boolean(item.proofData || item.proofUrl || item.evidenceUrl || item.secureUrl);
      const hasAnySecureMetadata = Boolean(item.evidenceAssetId || item.evidencePublicId || item.evidenceVersion || item.evidenceFormat || item.evidenceResourceType);
      const hasCompleteSecureMetadata = Boolean(item.evidenceAssetId && item.evidencePublicId && item.evidenceVersion && item.evidenceFormat && item.evidenceResourceType);
      return hasLegacyEvidence || hasAnySecureMetadata && !hasCompleteSecureMetadata;
    }).length;
    return {
      dryRun: true,
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      writesPerformed: 0,
      assessments: {
        coursesScanned: coursesPage.documents.length,
        secureAssessments: assessmentsPage.documents.length,
        embeddedModuleAssessments,
        embeddedFinalAssessments,
        missingSecureAssessments
      },
      certificates: {
        certificatesScanned: certificatesPage.documents.length,
        publicProjections: projectionsPage.documents.length,
        certificatesMissingCode,
        duplicateVerificationCodes,
        missingPublicProjections,
        orphanPublicProjections
      },
      evidence: { recordsScanned: evidencePage.documents.length, evidenceMetadataIncomplete },
      truncated: [coursesPage, assessmentsPage, certificatesPage, projectionsPage, evidencePage].some((page) => page.truncated),
      safeToMigrate: missingSecureAssessments === 0 && certificatesMissingCode === 0 && duplicateVerificationCodes === 0 && evidenceMetadataIncomplete === 0,
      message: "Inventory only. No data was changed. Back up Firestore and review every reported exception before enabling a migration write path."
    };
  }
  if (path === "/v1/admin/book-submissions/review") {
    requireAdmin(user);
    const submissionId = safeId(data.submissionId, "submission identifier");
    const decision = normalized(data.decision);
    if (!submissionId || !["approved", "rejected"].includes(decision)) throw Object.assign(new Error("Invalid review request."), { status: 400 });
    return runTransaction(env, async (tx) => {
      const submission = await tx.get(`bookSubmissions/${submissionId}`);
      if (!submission) throw Object.assign(new Error("Submission not found."), { status: 404 });
      if (normalized(submission.status) !== "pending") throw Object.assign(new Error("This submission has already been reviewed."), { status: 409 });
      const now = (/* @__PURE__ */ new Date()).toISOString();
      tx.set(`bookSubmissions/${submissionId}`, { ...submission, status: decision, reviewerFeedback: clean(data.note), reviewedBy: user.uid, reviewedAt: now, updatedAt: now });
      let bookId = null;
      if (decision === "approved") {
        bookId = safeId(clean(submission.bookId) || `submitted-${submissionId}`, "book identifier");
        tx.set(`books/${bookId}`, {
          title: submission.title || "Untitled resource",
          author: submission.authorName || "Independent contributor",
          category: submission.category || "general",
          audience: submission.audience || ["general"],
          shortDescription: submission.shortDescription || "",
          description: submission.description || "",
          coverUrl: submission.coverUrl || "",
          accessType: submission.accessType || "free",
          price: Number(submission.price || 0),
          currency: submission.currency || "\u20A6",
          purchasePlatform: submission.purchasePlatform || "",
          purchaseUrl: submission.purchaseUrl || "",
          status: "active",
          source: "approved-submission",
          sourceSubmissionId: submissionId,
          createdAt: now,
          updatedAt: now
        });
      }
      return { ok: true, decision, bookId };
    });
  }
  if (path === "/v1/admin/external-learning/review") {
    requireAdmin(user);
    const recordId = safeId(data.recordId, "record identifier");
    const decision = normalized(data.decision);
    if (!recordId || !["approved", "rejected", "resubmission_required"].includes(decision)) throw Object.assign(new Error("Invalid review request."), { status: 400 });
    return runTransaction(env, async (tx) => {
      const record = await tx.get(`externalLearningRecords/${recordId}`);
      if (!record) throw Object.assign(new Error("Submission not found."), { status: 404 });
      if (!["pending_review", "pending", "submitted"].includes(normalized(record.status))) throw Object.assign(new Error("This submission is not awaiting review."), { status: 409 });
      const now = (/* @__PURE__ */ new Date()).toISOString();
      tx.set(`externalLearningRecords/${recordId}`, { ...record, status: decision, verificationStatus: decision === "approved" ? "verified" : decision, reviewerFeedback: clean(data.note), reviewedBy: user.uid, reviewedAt: now, updatedAt: now });
      let certificate = null;
      if (decision === "approved") {
        const recordCourseId = safeId(record.courseId, "course identifier");
        const recordUserId = safeId(record.userId, "user identifier");
        const id = `external_${recordUserId}_${recordCourseId}`;
        const existing = await tx.get(`certificates/${id}`);
        if (!existing) {
          const verificationCode = await deterministicVerificationCode(`external:${id}`);
          const certificateRecord = { id, userId: recordUserId, recipientName: record.learnerName || "Learner", courseId: recordCourseId, courseTitle: record.courseTitle || "External course", externalProvider: record.provider || "External Provider", sourceRecordId: recordId, type: "external-completion", status: "active", verificationCode, issueDate: now.slice(0, 10), createdAt: now };
          tx.set(`certificates/${id}`, certificateRecord);
          tx.set(`publicCertificateVerifications/${verificationCode}`, { recipientName: certificateRecord.recipientName, awardTitle: certificateRecord.courseTitle, issuer: "SpeakOut Mental Health Outreach", issueDate: certificateRecord.issueDate, status: certificateRecord.status, certificateNumber: id, achievementType: "externally-completed course verified by SpeakOut" });
          certificate = { id, verificationCode };
        } else certificate = { id, verificationCode: existing.verificationCode };
      }
      return { ok: true, decision, certificate };
    });
  }
  if (path === "/v1/admin/content/upsert") {
    requireAdmin(user);
    const collectionName = cmsCollection(data.collection);
    const record = cmsRecord(collectionName, data.record);
    const recordId = data.id ? safeId(data.id, "content identifier") : `cms-${crypto.randomUUID()}`;
    return runTransaction(env, async (tx) => {
      const existing = await tx.get(`${collectionName}/${recordId}`);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      tx.set(`${collectionName}/${recordId}`, {
        ...record,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        updatedBy: user.uid
      });
      return { ok: true, id: recordId };
    });
  }
  if (path === "/v1/admin/content/status") {
    requireAdmin(user);
    const collectionName = cmsCollection(data.collection);
    const recordId = safeId(data.id, "content identifier");
    const status = normalized(data.status);
    if (!["active", "draft", "hidden"].includes(status)) {
      throw Object.assign(new Error("Invalid content status."), { status: 400 });
    }
    return runTransaction(env, async (tx) => {
      const existing = await tx.get(`${collectionName}/${recordId}`);
      if (!existing) throw Object.assign(new Error("Content record not found."), { status: 404 });
      tx.set(`${collectionName}/${recordId}`, {
        ...existing,
        status,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedBy: user.uid
      });
      return { ok: true, id: recordId, status };
    });
  }
  if (path === "/v1/admin/content/delete") {
    requireAdmin(user);
    const collectionName = cmsCollection(data.collection);
    const recordId = safeId(data.id, "content identifier");
    return runTransaction(env, async (tx) => {
      const existing = await tx.get(`${collectionName}/${recordId}`);
      if (!existing) throw Object.assign(new Error("Content record not found."), { status: 404 });
      tx.delete(`${collectionName}/${recordId}`);
      return { ok: true, id: recordId };
    });
  }
  if (path.startsWith("/v1/admin/")) {
    throw Object.assign(new Error("This privileged endpoint is not enabled until its Phase 1 audit implementation is complete."), { status: 501 });
  }
  throw Object.assign(new Error("Endpoint not found."), { status: 404 });
}
__name(route, "route");
var index_default = {
  async fetch(request, env) {
    const headers = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, headers);
    const origin = request.headers.get("origin") || "";
    if (origin && !headers["access-control-allow-origin"]) return json({ error: "Origin not allowed." }, 403);
    try {
      const type = request.headers.get("content-type") || "";
      let data = {};
      if (type.includes("application/json")) data = await request.json();
      else if (type.includes("multipart/form-data")) {
        const form = await request.formData();
        data = Object.fromEntries(form.entries());
      }
      const result = await route(request, env, new URL(request.url).pathname, data);
      if (result instanceof Response) {
        const responseHeaders = new Headers(result.headers);
        Object.entries(headers).forEach(([key, value]) => responseHeaders.set(key, value));
        return new Response(result.body, { status: result.status, statusText: result.statusText, headers: responseHeaders });
      }
      return json(result, 200, headers);
    } catch (error) {
      console.error(error);
      return json({ error: error.message || "Request failed." }, error.status || 500, headers);
    }
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
