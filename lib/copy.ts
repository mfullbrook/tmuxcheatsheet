/**
 * Copy text to the clipboard. Resolves `true` on success, `false` on any
 * failure (permissions, insecure context, missing API) — never throws.
 * Callers should surface an honest "copy failed — select manually" message
 * when this resolves false.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
