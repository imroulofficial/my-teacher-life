// Gameplay screen wrapper around the level runner.
import { runLevel } from '../core/runner.js';
import { closeTopModal } from '../core/ui.js';

let cleanup = null;

export default {
  render(root, { level }) {
    cleanup = runLevel(root, level);
    return () => {
      if (cleanup) cleanup();
      cleanup = null;
    };
  },
  onBack() {
    // Back button pauses the game (or closes the top dialog).
    if (closeTopModal()) return true;
    if (cleanup && !cleanup.isEnded()) cleanup.openPause();
    return true;
  },
};
