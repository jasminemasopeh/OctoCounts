/** Decode a path segment without turning a bare `%` into a hard failure. */
export function decodePathSegment(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

const githubRefMarkers = new Set(["tree", "blob", "commit", "commits"]);

export type ParsedGithubBrowseUrl = {
  owner: string;
  repo: string;
  /** Clean https://github.com/owner/repo URL (no tree/blob path). */
  repoUrl: string;
  /** Branch, tag, or SHA when the browse URL names one. */
  refName: string;
  /** Nested folder under /tree/{ref}/…; empty when counting the whole repo. */
  path: string;
};

/**
 * Parse a public GitHub repository or browse URL.
 *
 * `/tree/{ref}/{path…}` uses the first-segment-as-ref heuristic: `ref` is the
 * first segment after `tree`, and everything after is the subdirectory scope
 * (any depth, including spaces via `%20`). Slashy branch names still need the
 * Ref field set manually.
 */
export function parseGithubBrowseUrl(value: string): ParsedGithubBrowseUrl | null {
  try {
    const url = new URL(value.trim());
    if (url.hostname !== "github.com") return null;
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length < 2) return null;
    const owner = decodePathSegment(segments[0]);
    const repo = decodePathSegment(segments[1]).replace(/\.git$/i, "");
    if (!owner || !repo) return null;
    const repoUrl = `https://github.com/${owner}/${repo}`;
    if (segments.length === 2) {
      return { owner, repo, repoUrl, refName: "", path: "" };
    }
    const marker = segments[2];
    if (!githubRefMarkers.has(marker) || segments.length < 4) {
      return { owner, repo, repoUrl, refName: "", path: "" };
    }
    const refName = decodePathSegment(segments[3]);
    if (marker === "tree" && segments.length > 4) {
      return {
        owner,
        repo,
        repoUrl,
        refName,
        path: segments.slice(4).map(decodePathSegment).join("/"),
      };
    }
    return { owner, repo, repoUrl, refName, path: "" };
  } catch {
    return null;
  }
}
