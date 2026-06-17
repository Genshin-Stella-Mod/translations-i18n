// Pushes apps/.translated/<name> translations back into each project repo.
// Wysyła tłumaczenia z apps/.translated/<name> z powrotem do repozytoriów projektów.

const path = require('node:path');
const { APP_PROJECTS, TRANSLATED_DIR, isResx, syncTree } = require('./common.js');

for (const { name, repo } of APP_PROJECTS) {
	syncTree(path.join(TRANSLATED_DIR, name), repo, isResx);
}
