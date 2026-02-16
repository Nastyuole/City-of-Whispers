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
    } catch (e) { 
        console.error("Error processing message:", e);
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
