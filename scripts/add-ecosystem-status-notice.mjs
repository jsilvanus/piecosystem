import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPOS = [
  'picam',
  'picanva',
  'picontrol',
  'picontrol-mcp',
  'pigateway',
  'pigraphics',
  'pitally',
  'pimatrix',
  'piprogram',
  'pirundown',
  'pirundown-designer',
  'pisound',
  'pispace',
  'piswitch',
  'pitube',
  'pivoice',
  'piperception',
  'liturgos-auditor',
  'web-radio-relay',
  'fffleet'
];

const ROOT_DIR = 'D:\\';

const NOTICE = `

---

## Pi Ecosystem Integration & Status Updates

This project is an integral component of the [Pi Production Ecosystem](file:///d:/piecosystem).

> [!IMPORTANT]
> Any changes to this repository's architectural role, API routes, communication protocols, exposed ports, dependencies, or runtime status **must be documented in the central \`piecosystem\` coordination repository** (\`docs/projects-catalog.md\` and \`docs/inter-service-matrix.md\`).
> Always verify cross-system health with \`npm run status\` in \`D:\\piecosystem\`.
`;

let updatedCount = 0;

for (const repo of REPOS) {
  const readmePath = resolve(ROOT_DIR, repo, 'README.md');
  if (!existsSync(readmePath)) {
    console.warn(`README not found: ${readmePath}`);
    continue;
  }

  const content = readFileSync(readmePath, 'utf8');
  if (content.includes('Pi Ecosystem Integration & Status Updates')) {
    console.log(`Already has notice: ${repo}`);
    continue;
  }

  writeFileSync(readmePath, content.trimEnd() + NOTICE, 'utf8');
  console.log(`Updated README: ${repo}`);
  updatedCount++;
}

console.log(`\nSuccessfully updated ${updatedCount} repositories.`);
