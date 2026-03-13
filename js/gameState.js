// Game state management and persistence
// Using a state container to ensure references stay synchronized across modules

const state = {
    gameTranslations: {},
    scenes: {},
    currentSceneName: 'start',
    currentLanguage: localStorage.getItem('lang') || 'en',
    isLoadingScenes: false,
    parentParallelScene: null, // Track parent scene for parallel choices
    gameState: {
        visitedScenes: new Set(),
        completedChoices: new Set(),
        parallelChoiceProgress: {}
    }
};

// Export references to state properties
export const gameTranslations = state.gameTranslations;
export const scenes = state.scenes;
export const gameState = state.gameState;

export function getCurrentSceneName() {
    return state.currentSceneName;
}

export function setCurrentScene(name) {
    state.currentSceneName = name;
}

export function getCurrentLanguage() {
    return state.currentLanguage;
}

export function setCurrentLanguage(lang) {
    state.currentLanguage = lang;
}

export function getParentParallelScene() {
    return state.parentParallelScene;
}

export function setParentParallelScene(sceneName) {
    state.parentParallelScene = sceneName;
}

// Save current scene to localStorage
export function saveCurrentScene(sceneName) {
    try {
        const gameData = {
            currentScene: sceneName,
            parentParallelScene: state.parentParallelScene,
            gameState: {
                visitedScenes: Array.from(state.gameState.visitedScenes),
                completedChoices: Array.from(state.gameState.completedChoices),
                parallelChoiceProgress: state.gameState.parallelChoiceProgress
            },
            language: state.currentLanguage,
            timestamp: Date.now()
        };
        localStorage.setItem('gameProgress', JSON.stringify(gameData));
    } catch (error) {
        console.error('Error saving game progress:', error);
    }
}

// Reset game state
export function resetGameState() {
    state.gameState.visitedScenes.clear();
    state.gameState.visitedScenes.add('start');
    state.gameState.completedChoices.clear();
    state.gameState.parallelChoiceProgress = {};
    state.parentParallelScene = null;
    localStorage.removeItem('gameProgress');
}

// Load game scenes based on selected language
export async function loadGameScenes(lang) {
    if (state.isLoadingScenes) {
        return;
    }
    
    state.isLoadingScenes = true;
    try {
        const langMap = { 'en': 'en', 'ru': 'ru', 'bg': 'bg' };
        const langCode = langMap[lang] || 'en';
        const url = `./assets/locales/${langCode}/${langCode}GameTranslation.json`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} loading ${url}`);
        }
        const data = await response.json();
        
        
        // Update state directly instead of reassigning
        Object.assign(state.scenes, data.scenes || {});
        Object.assign(state.gameTranslations, data);
        
        // Update language from parameter (user's current preference)
        state.currentLanguage = lang;
        
        const savedGameData = localStorage.getItem('gameProgress');
        if (savedGameData) {
            try {
                const gameData = JSON.parse(savedGameData);
                state.gameState.visitedScenes.clear();
                state.gameState.completedChoices.clear();
                state.gameState.visitedScenes = new Set(gameData.gameState.visitedScenes);
                state.gameState.completedChoices = new Set(gameData.gameState.completedChoices);
                state.gameState.parallelChoiceProgress = gameData.gameState.parallelChoiceProgress;
                state.parentParallelScene = gameData.parentParallelScene || null;
                return gameData.currentScene; // Return scene to show
            } catch (error) {
                console.error('Error restoring saved game:', error);
                resetGameState();
                return "start";
            }
        } else {
            console.log('No saved game found, starting fresh');
            resetGameState();
            return "start";
        }
    } catch (error) {
        console.error('Error on loading scenes:', error);
        return null;
    } finally {
        state.isLoadingScenes = false;
    }
}
