import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyForgeSecurityPatch } from './forge-security-patch.mjs';

const forgeAdvisory = 'GHSA-86w9-cpqp-85rv';
const forgeChains = new Set([
  '@oggaq/mobile>expo>@expo/cli>node-forge',
  '@oggaq/mobile>expo>@expo/cli>@expo/code-signing-certificates>node-forge',
  '@oggaq/mobile>expo-updates>@expo/code-signing-certificates>node-forge',
]);
export function inspectAudit(report, tree, forgeVerified) {
  const failures = [];
  const patched = new Set();
  for (const vulnerability of Object.values(report.vulnerabilities)) {
    for (const advisory of vulnerability.via.filter(v => typeof v !== 'string')) {
      const id = advisory.url.split('/').pop();
      if (id === forgeAdvisory && vulnerability.name === 'node-forge' && forgeVerified) patched.add(id);
      else failures.push(`UNREVIEWED OR UNPATCHED: ${advisory.url} (${vulnerability.name})`);
    }
  }
  function visit(node, parents = []) {
    for (const [name, dependency] of Object.entries(node.dependencies ?? {})) {
      const chain = [...parents, name];
      if (name === 'node-forge' && !forgeChains.has(chain.join('>')))
        failures.push(`node-forge beklenmeyen bağımlılık yolunda: ${chain.join('>')}`);
      visit(dependency, chain);
    }
  }
  visit(tree);
  return { failures, patched: [...patched] };
}

function main() {
  const audit = spawnSync('npm', ['audit', '--json'], { encoding: 'utf8' });
  if (audit.error) throw audit.error;
  const report = JSON.parse(audit.stdout);
  if (report.error || !report.vulnerabilities || ![0, 1].includes(audit.status))
    throw new Error('npm audit did not return a valid vulnerability report.');
  const tree = spawnSync('npm', ['ls', 'zod', 'node-forge', '--json'], { encoding: 'utf8' });
  if (tree.error || tree.status !== 0) throw new Error('Dependency tree is invalid or could not be verified.');
  verifyForgeSecurityPatch();
  // Verify actual signature behavior as well as the installed file hash. No generic advisory bypass.
  const regression = spawnSync(process.execPath, ['--test', 'scripts/forge-security.test.mjs'], { encoding: 'utf8' });
  if (regression.status !== 0) throw new Error('node-forge security regression failed: '+regression.stdout+regression.stderr);
  const result = inspectAudit(report, JSON.parse(tree.stdout), true);
  for (const failure of result.failures) console.error(failure);
  for (const id of result.patched)
    console.warn(`VERIFIED LOCAL SECURITY PATCH: https://github.com/advisories/${id} (node-forge 1.4.0; raw npm audit still lists its upstream version).`);
  console.log(`Audit: ${result.patched.length} verified local patch; ${result.failures.length} unreviewed or unpatched issues. See docs/SECURITY.md.`);
  process.exitCode = result.failures.length ? 1 : 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
