// Shared config, paths and filesystem helpers for the translation sync scripts.
// Wspólna konfiguracja, ścieżki i helpery plikowe dla skryptów synchronizujących tłumaczenia.

const fs = require('node:fs');
const path = require('node:path');

const STELLA = 'D:/Projects/stella';
const RESHADE = `${STELLA}/Genshin-Impact-ReShade`;

const REPO_ROOT = path.join(__dirname, '..');
const APPS_DIR = path.join(REPO_ROOT, 'apps');
const TRANSLATED_DIR = path.join(APPS_DIR, '.translated');
const WWW_DIR = path.join(REPO_ROOT, 'www');
const WWW_TRANSLATED_DIR = path.join(WWW_DIR, '.translated');

const LOCALES = ['ar', 'de', 'es', 'fr', 'id', 'it', 'ja', 'pl', 'pt-BR', 'ru', 'sv', 'tr', 'vi', 'zh-Hans', 'zh-Hant'];

const APP_PROJECTS = [
	{ name: 'configuration-window', repo: `${RESHADE}/Stella.Configuration` },
	{ name: 'fps-unlocker', repo: `${STELLA}/Genshin-FPS-Unlocker/unlockfps_nc` },
	{ name: 'info-before-start', repo: `${RESHADE}/Stella.Welcome` },
	{ name: 'launcher', repo: `${RESHADE}/Stella.Launcher` },
	{ name: 'prepare-stella', repo: `${RESHADE}/Stella.Prepare` },
];

const CLEANUP_DIRS = [
	`${RESHADE}/Stella.Launcher`,
	`${RESHADE}/Stella.Configuration`,
	`${RESHADE}/Stella.Welcome`,
	`${RESHADE}/Stella.Core`,
	`${STELLA}/Genshin-FPS-Unlocker`,
];

const IGNORED_RESX = ['ImageResources.resx', 'Language.resx'];

const isResx = name => name.toLowerCase().endsWith('.resx');
const isMainResx = name => (/^[^.]+\.resx$/i).test(name) && !IGNORED_RESX.includes(name);
const isTranslatedResx = name => {
	const match = name.match(/^(.+)\.[^.]+\.resx$/i);
	return Boolean(match) && !IGNORED_RESX.includes(`${match[1]}.resx`);
};

const walk = (dir, filter, result = []) => {
	if (!fs.existsSync(dir)) return result;

	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(full, filter, result);
		else if (entry.isFile() && filter(entry.name)) result.push(full);
	}

	return result;
};

const copyIfChanged = (src, dest) => {
	const normalized = fs.readFileSync(src, 'utf8').replace(/\r?\n/g, '\r\n');
	const current = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : null;
	if (current === normalized) return false;

	fs.mkdirSync(path.dirname(dest), { recursive: true });
	fs.writeFileSync(dest, normalized, 'utf8');
	return true;
};

const syncTree = (srcDir, destDir, filter) => {
	for (const src of walk(srcDir, filter)) {
		const dest = path.join(destDir, path.relative(srcDir, src));
		try {
			if (copyIfChanged(src, dest)) console.log(`✔ ${src} -> ${dest}`);
		} catch (err) {
			console.error(`✖ Failed to copy ${src}`, err);
		}
	}
};

const difference = (a, b) => [...a].filter(key => !b.has(key));

const createMissingReport = () => {
	let totalMissing = 0;
	let totalOrphaned = 0;

	return {
		add(label, missing, orphaned) {
			if (missing.length === 0 && orphaned.length === 0) return;

			console.log(`\n${label}`);
			if (missing.length) {
				totalMissing += missing.length;
				console.log(`  Missing (${missing.length}): ${missing.join(', ')}`);
			}
			if (orphaned.length) {
				totalOrphaned += orphaned.length;
				console.log(`  Orphaned (${orphaned.length}): ${orphaned.join(', ')}`);
			}
		},
		done() {
			console.log(`\nTotal missing: ${totalMissing}, total orphaned: ${totalOrphaned}`);
		},
	};
};

module.exports = {
	APPS_DIR, TRANSLATED_DIR, WWW_DIR, WWW_TRANSLATED_DIR,
	LOCALES, APP_PROJECTS, CLEANUP_DIRS,
	isResx, isMainResx, isTranslatedResx,
	walk, syncTree,
	difference, createMissingReport,
};
