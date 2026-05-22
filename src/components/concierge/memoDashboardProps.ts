/** Shallow compare dashboard bundles by generatedAt to skip rerenders. */
export function bundlePropsEqual<T extends { generatedAt: string }>(
  prev: { bundle: T },
  next: { bundle: T },
): boolean {
  return prev.bundle.generatedAt === next.bundle.generatedAt;
}
