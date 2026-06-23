// M2: scrub secrets from logs. Stub for M0 — full implementation in M4 (IG) when
// tokens start flowing. Will redact: access_token, client_secret, code,
// signed_request, and sk-ant-* / sb_secret_* key prefixes from HTTP + error logs.
export default defineNitroPlugin(() => {
  // TODO(M2/M4): wrap console + hook 'afterResponse'/'error' to redact secrets.
})
