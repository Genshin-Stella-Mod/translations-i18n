// Reports missing/orphaned translation keys for both the apps (.resx) and the website (JSON).
// Raportuje brakujące/osierocone klucze tłumaczeń zarówno dla aplikacji (.resx), jak i strony (JSON).

const fs = require('node:fs');
const path = require('node:path');
const { APP_PROJECTS, APPS_DIR, TRANSLATED_DIR, WWW_DIR, WWW_TRANSLATED_DIR, LOCALES, isMainResx, walk, difference, createMissingReport } = require('./common.js');

const DATA_REGEX = /<data name="([^"]*)"([^>]*)>\s*<value(?:\s*\/>|>[\s\S]*?<\/value>)/g;

const extractResxKeys = filePath => {
	const keys = new Set();
	if (!fs.existsSync(filePath)) return keys;

	const content = fs.readFileSync(filePath, 'utf8').replace(/<!--[\s\S]*?-->/g, '');

	let match;
	while ((match = DATA_REGEX.exec(content))) {
		const [, name, attrs] = match;
		if (!attrs.includes('xml:space="preserve"')) continue;
		if (attrs.includes('type="')) continue;
		if (name.startsWith('&gt;&gt;')) continue;

		keys.add(name);
	}

	return keys;
};

const collectKeyPaths = (value, prefix = '', result = new Set()) => {
	if (Array.isArray(value) || typeof value !== 'object' || value === null) {
		result.add(prefix);
		return result;
	}

	for (const [key, child] of Object.entries(value)) {
		collectKeyPaths(child, prefix ? `${prefix}.${key}` : key, result);
	}

	return result;
};

const loadJsonKeys = filePath => {
	if (!fs.existsSync(filePath)) return new Set();
	return collectKeyPaths(JSON.parse(fs.readFileSync(filePath, 'utf8')));
};

const PLURAL_SUFFIX_REGEX = /^(.+)_(zero|one|two|few|many|other)$/;

const pluralBases = keys => {
	const bases = new Set();
	for (const key of keys) {
		const match = key.match(PLURAL_SUFFIX_REGEX);
		if (match) bases.add(match[1]);
	}
	return bases;
};

const checkApps = report => {
	for (const { name } of APP_PROJECTS) {
		const sourceDir = path.join(APPS_DIR, name);

		for (const sourceFile of walk(sourceDir, isMainResx)) {
			const relativePath = path.relative(sourceDir, sourceFile);
			const sourceKeys = extractResxKeys(sourceFile);
			if (sourceKeys.size === 0) continue;

			for (const locale of LOCALES) {
				const translatedFile = path.join(TRANSLATED_DIR, name, relativePath.replace(/\.resx$/i, `.${locale}.resx`));
				const translatedKeys = extractResxKeys(translatedFile);

				report.add(`${name}/${relativePath} [${locale}]`, difference(sourceKeys, translatedKeys), difference(translatedKeys, sourceKeys));
			}
		}
	}
};

const checkWww = report => {
	for (const sourceFile of fs.readdirSync(WWW_DIR)) {
		if (!sourceFile.toLowerCase().endsWith('.json')) continue;

		const namespace = sourceFile.replace(/\.json$/i, '');
		const sourceKeys = loadJsonKeys(path.join(WWW_DIR, sourceFile));
		const sourcePluralBases = pluralBases(sourceKeys);

		for (const locale of LOCALES) {
			const translatedKeys = loadJsonKeys(path.join(WWW_TRANSLATED_DIR, locale, sourceFile));

			const orphaned = difference(translatedKeys, sourceKeys).filter(key => {
				const match = key.match(PLURAL_SUFFIX_REGEX);
				return !(match && sourcePluralBases.has(match[1]));
			});

			report.add(`${namespace} [${locale}]`, difference(sourceKeys, translatedKeys), orphaned);
		}
	}
};

const report = createMissingReport();
checkApps(report);
checkWww(report);
report.done();
