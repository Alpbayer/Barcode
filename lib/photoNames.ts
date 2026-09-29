// Picks which photo files to upload from a folder named like "7.jpg", "7-2.jpg", "7-3.jpg":
// the number is the LotNo, and only the first two of each series are kept (N → 1, N-2 → 2).

export type PickedPhoto<F> = { file: F; lotNo: number; position: 1 | 2 };

export type PhotoPick<F> = {
  picked: PickedPhoto<F>[];
  skipped: { name: string; reason: string }[];
  conflicts: string[]; // e.g. "7.jpg" and "7.JPG" both claim LotNo 7 photo 1
};

const NAME_RE = /^(\d+)(?:-(\d+))?\.jpe?g$/i;

export function pickPhotos<F extends { name: string }>(files: F[]): PhotoPick<F> {
  const byKey = new Map<string, PickedPhoto<F>>();
  const skipped: PhotoPick<F>["skipped"] = [];
  const conflicts: string[] = [];

  for (const file of files) {
    const m = NAME_RE.exec(file.name.trim());
    if (!m) {
      skipped.push({ name: file.name, reason: "ad uymuyor" });
      continue;
    }
    const lotNo = Number(m[1]);
    const suffix = m[2] === undefined ? 1 : Number(m[2]);
    if (suffix !== 1 && suffix !== 2) {
      skipped.push({ name: file.name, reason: `${suffix}. foto` });
      continue;
    }
    // "7-1.jpg" is not part of the naming scheme; "7.jpg" is the first photo.
    if (m[2] === "1") {
      skipped.push({ name: file.name, reason: "ad uymuyor" });
      continue;
    }
    const position = suffix as 1 | 2;
    const key = `${lotNo}:${position}`;
    const existing = byKey.get(key);
    if (existing) {
      conflicts.push(`${existing.file.name} ve ${file.name}`);
      continue;
    }
    byKey.set(key, { file, lotNo, position });
  }

  const picked = Array.from(byKey.values()).sort((a, b) => a.lotNo - b.lotNo || a.position - b.position);
  return { picked, skipped, conflicts };
}
