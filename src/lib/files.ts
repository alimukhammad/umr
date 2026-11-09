// Saving a file the page made (share image, data export).
// On the real site this is a normal browser download. Inside the claude.ai test link,
// the page is sandboxed, so it asks the viewer through the platform's downloads capability.

type Downloads = { save: (r: { filename: string; data: Blob | string }) => Promise<unknown> };
type ClaudeHost = { use: (name: string) => Promise<unknown> };

function host(): ClaudeHost | null {
  const c = (window as unknown as { claude?: ClaudeHost }).claude;
  return c && typeof c.use === 'function' ? c : null;
}

export async function saveFile(filename: string, data: Blob | string): Promise<boolean> {
  const h = host();
  if (h) {
    try {
      const d = (await h.use('downloads')) as Downloads | null;
      if (d) {
        await d.save({ filename, data });
        return true;
      }
    } catch {
      return false; // declined or unavailable: never retry automatically
    }
  }
  const blob = typeof data === 'string' ? new Blob([data], { type: 'application/json' }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
