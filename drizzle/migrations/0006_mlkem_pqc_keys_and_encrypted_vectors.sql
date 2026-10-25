CREATE TABLE public.pqc_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_version integer NOT NULL UNIQUE,
  public_key text NOT NULL,
  secret_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  retired_at timestamptz
);
GRANT ALL ON public.pqc_keys TO service_role;
ALTER TABLE public.pqc_keys ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.pqc_keys IS 'ML-KEM-768 keypairs for telemetry vector encapsulation. Service-role only: no anon/authenticated grants or policies, so key material never reaches user sessions.';

ALTER TABLE public.patch_telemetry ADD COLUMN kem_ciphertext text;
ALTER TABLE public.patch_telemetry ADD COLUMN vector_ciphertext text;
ALTER TABLE public.patch_telemetry ADD COLUMN key_version integer;
ALTER TABLE public.patch_telemetry ALTER COLUMN patch_vector DROP NOT NULL;
COMMENT ON COLUMN public.patch_telemetry.patch_vector IS 'DEPRECATED: plaintext coarse buckets, kept only for rows written before ML-KEM encryption. New rows store NULL here and carry kem_ciphertext/vector_ciphertext instead.';
COMMENT ON COLUMN public.patch_telemetry.kem_ciphertext IS 'ML-KEM-768 encapsulation ciphertext (base64) for the row''s ephemeral shared secret.';
COMMENT ON COLUMN public.patch_telemetry.vector_ciphertext IS 'AES-256-GCM ciphertext (base64, IV prepended) of the abstract patch vector, keyed by the encapsulated shared secret.';
COMMENT ON COLUMN public.patch_telemetry.pqc_simulation IS 'True for legacy simulated-seal rows; false once the vector is genuinely ML-KEM encapsulated.';