import crypto from "node:crypto";

export function checkSignature({
  token,
  signature,
  timestamp,
  nonce,
}: {
  token: string;
  signature: string;
  timestamp: string;
  nonce: string;
}) {
  const arr = [token, timestamp, nonce].sort();
  const sha = crypto.createHash("sha1").update(arr.join("")).digest("hex");
  return sha === signature;
}
