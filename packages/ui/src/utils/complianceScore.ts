export function computeComplianceScore(totalDeclarations: number, violations: number): number {
  if (totalDeclarations <= 0) return 100;
  return Math.round(((totalDeclarations - violations) / totalDeclarations) * 100);
}
