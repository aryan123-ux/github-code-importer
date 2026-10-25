// Deliberately coarse buckets: no source, paths, repo IDs, hashes, or prompts.
export function abstractPatchVector(report: { status: string; signaturePasses?: number; dependencies?: number; endpoints?: number; findings?: unknown[] }): number[] | null {
  if (report.status !== "verified" || report.signaturePasses !== 2 || !report.findings?.length) return null;
  const bucket = (count: number) => count <= 0 ? 0 : count <= 5 ? 1 : count <= 25 ? 2 : 3;
  return [bucket(report.dependencies ?? 0), bucket(report.endpoints ?? 0), bucket(report.findings.length)];
}

export type PqcSeal = { algorithm: "ML-KEM-768"; sealed: true; simulation: true };

// Simulated CRYSTALS-Kyber (ML-KEM-768) encapsulation marker. No real key
// exchange runs and no tenant content is transformed; the seal only attests
// that the abstract vector passed the zero-knowledge pipeline unchanged.
export function sealPatchVector(vector: number[] | null): PqcSeal | null {
  if (!vector || vector.length !== 3 || vector.some(value => !Number.isInteger(value) || value < 0 || value > 3)) return null;
  return { algorithm: "ML-KEM-768", sealed: true, simulation: true };
}
