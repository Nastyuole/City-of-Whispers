// Choice handling and button creation
import { scenes, gameState } from './gameState.js';
import { showScene, showParallelScene } from './gameScenes.js';

export function createChoiceButton(choice, sceneName) {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    
    let prefix = "";
    if (choice.type === 'parallel') {
        prefix = "🔍 ";
    } else if (choice.type === 'once') {
        prefix = "⚠️ ";
    }
    
    btn.textContent = prefix + choice.label;
    
    const isViewed = choice.type === 'parallel' && sceneName && scenes[sceneName]?.parallelGroup
        ? (gameState.parallelChoiceProgress[scenes[sceneName].parallelGroup]?.[choice.id]?.viewed || false)
        : false;
    
    if (isViewed) {
        btn.classList.add('choice-viewed');
    }
    
    btn.onclick = () => handleChoice(choice, sceneName);
    return btn;
}

export function handleChoice(choice, currentSceneName) {
    if (choice.id) {
        gameState.completedChoices.add(choice.id);
    }
    
    if (choice.type === 'parallel' && currentSceneName) {
        const scene = scenes[currentSceneName];
        if (scene && scene.parallelGroup) {
            if (!gameState.parallelChoiceProgress[scene.parallelGroup]) {
                gameState.parallelChoiceProgress[scene.parallelGroup] = {};
            }
            gameState.parallelChoiceProgress[scene.parallelGroup][choice.id] = {
                viewed: true,
                timestamp: Date.now()
            };
        }
    }
    
    if (choice.next) {
        if (choice.type === 'parallel') {
            showParallelScene(choice.next, currentSceneName);
        } else {
            showScene(choice.next);
        }
    }
}
