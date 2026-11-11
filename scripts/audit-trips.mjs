import { execSync } from 'node:child_process';
execSync('npx vite-node scripts/audit-trips.ts', { stdio: 'inherit' });
