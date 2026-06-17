// Strips unused .resx entries from the project repos via resx-cleanup.
// Usuwa nieużywane wpisy .resx z repozytoriów projektów za pomocą resx-cleanup.

const { resxCleanup } = require('resx-cleanup');
const { CLEANUP_DIRS } = require('./common.js');

resxCleanup(CLEANUP_DIRS);
