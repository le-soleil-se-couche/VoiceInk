const { fetchLatestRelease } = require("./lib/download-utils");

const REPOSITORIES = [
  "OpenWhispr/openwhispr",
  "OpenWhispr/whisper.cpp",
  "ggml-org/llama.cpp",
];

async function main() {
  const previousGitHubToken = process.env.GITHUB_TOKEN;
  const previousGhToken = process.env.GH_TOKEN;

  process.env.GITHUB_TOKEN = "invalid-token-for-ci-fallback-check";
  delete process.env.GH_TOKEN;

  try {
    for (const repo of REPOSITORIES) {
      const release = await fetchLatestRelease(repo);
      if (!release || !release.tag) {
        throw new Error(`Failed to fetch release metadata for ${repo}`);
      }
      console.log(`fallback-ok ${repo} -> ${release.tag}`);
    }
    console.log("download-utils fallback smoke check passed");
  } finally {
    if (previousGitHubToken === undefined) {
      delete process.env.GITHUB_TOKEN;
    } else {
      process.env.GITHUB_TOKEN = previousGitHubToken;
    }
    if (previousGhToken === undefined) {
      delete process.env.GH_TOKEN;
    } else {
      process.env.GH_TOKEN = previousGhToken;
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
