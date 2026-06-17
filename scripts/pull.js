// Pulls everything from the project repos: English source .resx into apps/<name>
// and *.<locale>.resx translations into apps/.translated/<name>.
// Pobiera wszystko z repozytoriów projektów: źródła EN (.resx do apps/<name>)
// oraz tłumaczenia *.<locale>.resx (do apps/.translated/<name>).

const path = require('node:path');
const { APP_PROJECTS, APPS_DIR, TRANSLATED_DIR, isMainResx, isTranslatedResx, syncTree } = require('./common.js');

for (const { name, repo } of APP_PROJECTS) {
	syncTree(repo, path.join(APPS_DIR, name), isMainResx);
	syncTree(repo, path.join(TRANSLATED_DIR, name), isTranslatedResx);
}
