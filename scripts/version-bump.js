import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packagePath = path.join(__dirname, '..', 'package.json');

// Read package.json
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Parse version (e.g., "1.2.3" -> [1, 2, 3])
const versionParts = pkg.version.split('.').map(Number);

// Increment minor version (second number)
if (versionParts.length < 2) {
    versionParts.push(0);
}
versionParts[1] = (versionParts[1] || 0) + 1;

// Reset patch to 0 when minor increments (optional)
if (versionParts.length > 2) {
    versionParts[2] = 0;
}

// Reconstruct version string
pkg.version = versionParts.join('.');

// Write back
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

console.log(`✅ Version bumped to ${pkg.version}`);
