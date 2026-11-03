import { execSync } from "node:child_process";

const isInnerNextBuild =
  process.env.NEXT_PRIVATE_STANDALONE === "true" ||
  process.env.OPEN_NEXT_INNER_BUILD === "1";

if (!isInnerNextBuild) {
  console.log("Building Next.js + OpenNext bundle for Cloudflare Workers...");
  execSync("pnpm exec opennextjs-cloudflare build", {
    stdio: "inherit",
    env: { ...process.env, OPEN_NEXT_INNER_BUILD: "1" },
  });
} else {
  console.log("Running next build...");
  execSync("pnpm exec next build", { stdio: "inherit" });
}

