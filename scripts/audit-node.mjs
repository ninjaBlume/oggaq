import { spawnSync } from "node:child_process";
// Published fixes do not yet exist for these two Expo build-tool advisories.
// Reject every new advisory, changed dependency placement, or registry failure.
const reviewed = new Map([
  ["GHSA-vfj7-8cjw-p6xm", "braces"],
  ["GHSA-86w9-cpqp-85rv", "node-forge"],
]);
const audit = spawnSync("npm", ["audit", "--json"], { encoding: "utf8" });
if (audit.error) throw audit.error;
const report = JSON.parse(audit.stdout);
if (report.error || !report.vulnerabilities || ![0, 1].includes(audit.status))
  throw new Error("npm audit did not return a valid vulnerability report.");
let failures = 0;
const seen = new Set();
for (const vulnerability of Object.values(report.vulnerabilities)) {
  for (const advisory of vulnerability.via.filter(
    (v) => typeof v !== "string",
  )) {
    const id = advisory.url.split("/").pop();
    if (reviewed.get(id) !== vulnerability.name) {
      console.error(`UNREVIEWED: ${advisory.url} (${vulnerability.name})`);
      failures++;
    } else {
      seen.add(id);
      console.warn(
        `OPEN UPSTREAM BUILD-TOOL ISSUE: ${advisory.url} (${vulnerability.name})`,
      );
    }
  }
}
// These packages must remain build-only transitive dependencies of Expo.
const tree = spawnSync("npm", ["ls", "braces", "node-forge", "--json"], {
  encoding: "utf8",
});
const dependencies = JSON.parse(tree.stdout).dependencies;
if (Object.keys(dependencies ?? {}).some((name) => name !== "@oggaq/mobile")) {
  console.error("Build-tool exception appeared outside the mobile workspace.");
  failures++;
}
console.log(
  `Audit: ${seen.size} documented upstream issues; ${failures} unreviewed issues. See docs/MOBILE.md.`,
);
process.exitCode = failures ? 1 : 0;
