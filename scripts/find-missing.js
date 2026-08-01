// Reports missing/orphaned translation keys for the apps (.resx).
// Raportuje brakujące/osierocone klucze tłumaczeń dla aplikacji (.resx).

const fs = require('node:fs');
const path = require('node:path');
const { APP_PROJECTS, APPS_DIR, TRANSLATED_DIR, LOCALES, isMainResx, walk, difference, createMissingReport } = require('./common.js');

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

const report = createMissingReport();
checkApps(report);
report.done();
