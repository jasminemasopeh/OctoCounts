import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import { transform } from "esbuild";

const cacheDir = new URL("../node_modules/.cache/octocounts-tests/", import.meta.url);
const source = await readFile(new URL("../src/githubUrl.ts", import.meta.url), "utf8");
const compiled = await transform(source, { loader: "ts", format: "esm", target: "es2020" });
await mkdir(cacheDir, { recursive: true });
const modulePath = new URL("github-url.mjs", cacheDir);
await writeFile(modulePath, compiled.code);
const { parseGithubBrowseUrl } = await import(modulePath.href);

test("plain repository URL has no ref or path", () => {
  assert.deepEqual(parseGithubBrowseUrl("https://github.com/owner/repo"), {
    owner: "owner",
    repo: "repo",
    repoUrl: "https://github.com/owner/repo",
    refName: "",
    path: "",
  });
});

test("tree URL with only a ref has no path", () => {
  assert.deepEqual(parseGithubBrowseUrl("https://github.com/owner/repo/tree/main"), {
    owner: "owner",
    repo: "repo",
    repoUrl: "https://github.com/owner/repo",
    refName: "main",
    path: "",
  });
});

test("Alarm clock tree URL splits ref and nested path with spaces", () => {
  const url = "https://github.com/Python-World/python-mini-projects/tree/master/projects/Alarm%20clock";
  assert.deepEqual(parseGithubBrowseUrl(url), {
    owner: "Python-World",
    repo: "python-mini-projects",
    repoUrl: "https://github.com/Python-World/python-mini-projects",
    refName: "master",
    path: "projects/Alarm clock",
  });
});

test("deeper nested folders stay hierarchical", () => {
  const parsed = parseGithubBrowseUrl(
    "https://github.com/owner/repo/tree/develop/packages/core/src/utils",
  );
  assert.equal(parsed.refName, "develop");
  assert.equal(parsed.path, "packages/core/src/utils");
});

test("commit browse URLs do not invent a path", () => {
  const parsed = parseGithubBrowseUrl(
    "https://github.com/owner/repo/commit/abcdef0123456789abcdef0123456789abcdef01",
  );
  assert.equal(parsed.refName, "abcdef0123456789abcdef0123456789abcdef01");
  assert.equal(parsed.path, "");
});
