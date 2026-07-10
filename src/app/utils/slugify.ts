

export default async function slugify(
  title: string,
  model: { findUnique: (args: any) => Promise<any> },
  field: string = "slug",
  excludeId?: string,
): Promise<string> {
  const make = (s: string) =>
    s
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  const base = make(title || "");
  let slug = base || "untitled";
  let i = 1;

  while (true) {
    const where: Record<string, any> = {};
    where[field] = slug;

    const existing = await model.findUnique({ where });
    if (!existing) break;
    if (excludeId && existing.id === excludeId) break;

    slug = `${base}-${i++}`;
  }

  return slug;
}
