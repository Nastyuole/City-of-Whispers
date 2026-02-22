// Main game logic - imports from modular files
import { 
    gameState,
    loadGameScenes,
    resetGameState,
    setCurrentLanguage,
    getCurrentLanguage,
    saveCurrentScene,
    getCurrentSceneName,
    getParentParallelScene
} from './gameState.js';

import { 
    showScene,
    showParallelScene
} from './gameScenes.js';

// Listen for language change events
window.addEventListener('languageChanged', (event) => {
    const lang = event.detail?.lang || localStorage.getItem('lang') || 'en';
    setCurrentLanguage(lang);
    (async () => {
        try {
            const sceneToShow = await loadGameScenes(lang);
            if (sceneToShow) {
                const parentScene = getParentParallelScene();
                if (parentScene && typeof parentScene === 'string') {
                    showParallelScene(sceneToShow, parentScene);
                } else {
                    showScene(sceneToShow);
                }
            }
        } catch (error) {
            console.error('Error when changing language:', error);
        }
    })();
});

// Listen for restart messages
window.addEventListener('message', (event) => {
    try {
        if (event.data && event.data.type === 'restartGame') {
            resetGameState();
            (async () => {
                const sceneToShow = await loadGameScenes(getCurrentLanguage());
                if (sceneToShow) {
                    showScene(sceneToShow);
                }
            })();
        }

        // Allow parent window to notify iframe about language changes via postMessage
        if (event.data && event.data.type === 'languageChanged') {
            const lang = event.data.lang || localStorage.getItem('lang') || 'en';
            // Re-dispatch as an internal CustomEvent so existing listeners react
            window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
        }
    } catch (e) { 
        console.error("Error processing message:", e);
    }
});

// Fallback: listen for storage events (fires in this document when other windows change localStorage)
window.addEventListener('storage', (e) => {
    try {
        if (e.key === 'lang') {
            const lang = e.newValue || localStorage.getItem('lang') || 'en';
            window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
        }
    } catch (err) {
        console.error('Error handling storage event:', err);
    }
});

// Auto-save every 5 seconds
setInterval(() => {
    const sceneName = getCurrentSceneName();
    if (sceneName && sceneName !== 'start' || Object.keys(gameState.visitedScenes || {}).length > 1) {
        saveCurrentScene(sceneName);
    }
}, 5000);

// Load game scenes on startup
function initializeGame() {
    (async () => {
        try {
            const sceneToShow = await loadGameScenes(getCurrentLanguage());
            if (sceneToShow) {
                const parentScene = getParentParallelScene();
                if (parentScene && typeof parentScene === 'string') {
                    // Load a saved game that was in a parallel scene
                    showParallelScene(sceneToShow, parentScene);
                } else {
                    showScene(sceneToShow);
                }
            }
        } catch (error) {
            console.error('Error during game startup:', error);
        }
    })();
}

// Wait for DOM to be ready before initializing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGame);
} else {
    // DOM is already loaded (e.g., script loaded late)
    initializeGame();
}
