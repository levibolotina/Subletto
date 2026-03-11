// Pure utility functions with no side effects
// Never use process.env or import.meta.env here — pass values as arguments.

export const isEduEmail = (email: string): boolean => {
  const domain = email.split("@")[1] ?? "";
  return domain.toLowerCase().endsWith(".edu");
};

export const isCUEmail = (email: string, domain = "colorado.edu"): boolean =>
  email.toLowerCase().endsWith(`@${domain}`);

export const formatCurrency = (cents: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
