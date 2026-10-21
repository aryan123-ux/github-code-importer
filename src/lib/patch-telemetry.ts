// Deliberately coarse buckets: no source, paths, repo IDs, hashes, or prompts.
export function abstractPatchVector(report: { status: string; signaturePasses?: number; dependencies?: number; endpoints?: number; findings?: unknown[] }): number[] | null {
  if (report.status !== "verified" || report.signaturePasses !== 2 || !report.findings?.length) return null;
  const bucket = (count: number) => count <= 0 ? 0 : count <= 5 ? 1 : count <= 25 ? 2 : 3;
  return [bucket(report.dependencies ?? 0), bucket(report.endpoints ?? 0), bucket(report.findings.length)];
}