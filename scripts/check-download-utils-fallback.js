const EventEmitter = require("events");
const https = require("https");
const { fetchLatestRelease } = require("./lib/download-utils");

async function main() {
  const previousGitHubToken = process.env.GITHUB_TOKEN;
  const previousGhToken = process.env.GH_TOKEN;
  const originalGet = https.get;

  let callCount = 0;
  const requests = [];
  const mockRelease = {
    tag_name: "v-test-fallback",
    html_url: "https://github.com/le-soleil-se-couche/VoiceInk/releases/tag/v-test-fallback",
    assets: [
      {
        name: "dummy.zip",
        browser_download_url:
          "https://github.com/le-soleil-se-couche/VoiceInk/releases/download/v-test-fallback/dummy.zip",
      },
    ],
  };

  process.env.GITHUB_TOKEN = "invalid-token-for-ci-fallback-check";
  delete process.env.GH_TOKEN;

  https.get = (url, options, callback) => {
    callCount += 1;
    requests.push({
      url,
      authorization:
        options &&
        options.headers &&
        (options.headers.Authorization || options.headers.authorization),
    });

    const req = new EventEmitter();
    req.setTimeout = () => req;
    req.destroy = () => {};

    process.nextTick(() => {
      const res = new EventEmitter();
      res.headers = {};

      if (callCount === 1) {
        res.statusCode = 401;
        callback(res);
        process.nextTick(() => res.emit("end"));
        return;
      }

      res.statusCode = 200;
      callback(res);
      process.nextTick(() => {
        res.emit("data", JSON.stringify(mockRelease));
        res.emit("end");
      });
    });

    return req;
  };

  try {
    const release = await fetchLatestRelease("le-soleil-se-couche/VoiceInk");
    if (!release || release.tag !== "v-test-fallback") {
      throw new Error("Fallback release parsing failed");
    }
    if (requests.length !== 2) {
      throw new Error(`Expected 2 requests, got ${requests.length}`);
    }
    if (!requests[0].authorization) {
      throw new Error("First request should include Authorization header");
    }
    if (requests[1].authorization) {
      throw new Error("Retry request should not include Authorization header");
    }
    console.log("download-utils fallback smoke check passed");
  } finally {
    https.get = originalGet;
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
  console.error(error.stack || error.message);
  process.exit(1);
});
