// Syncs non-translatable resx content (control positions, sizes, fonts, and other WinForms
// designer metadata) from the English source into existing translated .resx files, without
// touching already-translated <value> text.

const fs = require('node:fs');
const path = require('node:path');
const { APP_PROJECTS, APPS_DIR, TRANSLATED_DIR, LOCALES, isMainResx, walk, DATA_BLOCK_REGEX, isTranslatableEntry } = require('./common.js');

// Same as DATA_BLOCK_REGEX but also captures the block's own indentation and trailing newline,
// so a translatable block that gets dropped (not yet translated) doesn't leave a blank line behind.
const DATA_BLOCK_LINE_REGEX = /([ \t]*)<data name="([^"]*)"([^>]*)>[\s\S]*?<\/data>(\r?\n)/g;

const extractTranslatableBlocks = content => {
	const stripped = content.replace(/<!--[\s\S]*?-->/g, '');
	const blocks = new Map();

	let match;
	while ((match = DATA_BLOCK_REGEX.exec(stripped))) {
		const [full, name, attrs] = match;
		if (isTranslatableEntry(name, attrs)) blocks.set(name, full);
	}

	return blocks;
};

let changed = 0, untranslated = 0;

for (const { name: project } of APP_PROJECTS) {
	const sourceDir = path.join(APPS_DIR, project);

	for (const sourceFile of walk(sourceDir, isMainResx)) {
		const relativePath = path.relative(sourceDir, sourceFile);
		const sourceContent = fs.readFileSync(sourceFile, 'utf8');

		for (const locale of LOCALES) {
			const translatedFile = path.join(TRANSLATED_DIR, project, relativePath.replace(/\.resx$/i, `.${locale}.resx`));
			if (!fs.existsSync(translatedFile)) continue;

			const translatedContent = fs.readFileSync(translatedFile, 'utf8');
			const translatedBlocks = extractTranslatableBlocks(translatedContent);

			const merged = sourceContent.replace(DATA_BLOCK_LINE_REGEX, (full, leadingWs, name, attrs, newline) => {
				if (!isTranslatableEntry(name, attrs)) return full;

				const translated = translatedBlocks.get(name);
				if (translated) return `${leadingWs}${translated}${newline}`;

				untranslated++;
				console.warn(`⚠ ${translatedFile}: "${name}" not translated, using English fallback`);
				return full;
			});

			const normalized = merged.replace(/\r?\n/g, '\r\n');
			if (normalized === translatedContent) continue;

			fs.writeFileSync(translatedFile, normalized, 'utf8');
			changed++;
			console.log(`✔ ${translatedFile}`);
		}
	}
}

console.log(`\nSynced metadata in ${changed} file(s), ${untranslated} entr${untranslated === 1 ? 'y' : 'ies'} fell back to English.`);
