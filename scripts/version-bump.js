import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Paths ---
const packagePath = path.join(__dirname, '..', 'package.json');
const constantsPath = path.join(__dirname, '..', 'src', 'config', 'constants.js');

// --- 1. Update package.json ---

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const versionParts = pkg.version.split('.').map(Number);

// Increment patch version (third number)
versionParts[2] = (versionParts[2] || 0) + 1;

pkg.version = versionParts.join('.');

fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log(`✅ Version bumped to ${pkg.version} in package.json`);

// --- 2. Update constants.js ---

let constantsFileContent = fs.readFileSync(constantsPath, 'utf8');

// Get current date in YYYY-MM-DD format
const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
const buildDate = `${year}-${month}-${day}`;

// Replace APP_VERSION
constantsFileContent = constantsFileContent.replace(
    /(export const APP_VERSION = )".*";/,
    `$1"${pkg.version}";`
);

// Replace LAST_UPDATE
constantsFileContent = constantsFileContent.replace(
    /(export const LAST_UPDATE = )".*";/,
    `$1"${buildDate}";`
);

fs.writeFileSync(constantsPath, constantsFileContent, 'utf8');
console.log(`✅ Updated APP_VERSION to ${pkg.version} and LAST_UPDATE to ${buildDate} in constants.js`);
