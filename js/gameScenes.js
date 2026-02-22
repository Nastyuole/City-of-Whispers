// Scene display and management
import { scenes, gameState, saveCurrentScene, gameTranslations, setCurrentScene, setParentParallelScene } from './gameState.js';
import { createChoiceButton } from './gameChoices.js';

let dialogText = null;
let choicesBox = null;

function ensureDOMReady() {
    if (!dialogText) dialogText = document.getElementById("dialog-text");
    if (!choicesBox) choicesBox = document.getElementById("choices");
}

export function showScene(name) {
    ensureDOMReady();
    const scene = scenes[name];
    if (!scene) return;
    
    saveCurrentScene(name);
    setCurrentScene(name);
    gameState.visitedScenes.add(name);
    
    dialogText.innerHTML = "";
    if (scene.paragraphs && Array.isArray(scene.paragraphs)) {
        const parts = scene.paragraphs.map(p => {
            const raw = p.text || '';
            const html = raw.replace(/\n/g, '<br>');
            if (p.style && p.style.trim() !== '') {
                const cls = p.style.trim().replace(/[^a-zA-Z0-9_-]/g, '');
                return `<span class="${cls}">${html}</span>`;
            }
            return `<span>${html}</span>`;
        });
        const pEl = document.createElement('p');
        pEl.innerHTML = parts.join('<br><br>');
        dialogText.appendChild(pEl);
    } else {
        const pEl = document.createElement('p');
        pEl.innerHTML = scene.text || '';
        dialogText.appendChild(pEl);
    }
    
    showChoicesForScene(scene, name);

    // If this scene was reached directly (e.g. restored from save) but is
    // actually a parallel sub-scene, attempt to find its parent so we can
    // render a Continue/Return button matching `showParallelScene` behavior.
    // This handles old saves that didn't store `parentParallelScene`.
    const parentKey = Object.keys(scenes).find(k => {
        const s = scenes[k];
        return Array.isArray(s?.choices) && s.choices.some(c => c.type === 'parallel' && c.next === name);
    });
    if (parentKey) {
        const parentScene = scenes[parentKey];
        if (parentScene && parentScene.parallelGroup) {
            // Append a continue button so player can return to the parent scene
            const continueBtn = document.createElement("button");
            continueBtn.className = "choice-btn continue-btn";
            continueBtn.textContent = gameTranslations.ui?.continue || "Continue →";
            continueBtn.onclick = () => {
                const groupProgress = gameState.parallelChoiceProgress[parentScene.parallelGroup] || {};
                const totalParallel = parentScene.choices.filter(c => c.type === 'parallel').length;
                const viewedParallel = Object.values(groupProgress).filter(v => v.viewed).length;

                if (viewedParallel >= totalParallel && parentScene.continueAfterParallel) {
                    setParentParallelScene(null);
                    showScene(parentScene.continueAfterParallel);
                } else {
                    setParentParallelScene(null);
                    showChoicesForScene(parentScene, parentKey);
                }
            };
            choicesBox.appendChild(continueBtn);
        }
    }
}

export function showChoicesForScene(scene, sceneName) {
    ensureDOMReady();
    choicesBox.innerHTML = "";
    dialogText.scrollTop = 0;
    
    if (!scene || !scene.choices || scene.choices.length === 0) {
        return;
    }
    
    const availableChoices = scene.choices.filter(choice => {
        if (choice.condition) {
            return checkCondition(choice.condition);
        }
        
        if (choice.type === 'once' && gameState.completedChoices.has(choice.id)) {
            return false;
        }
        
        if (choice.type === 'parallel' && scene.parallelGroup) {
            const groupProgress = gameState.parallelChoiceProgress[scene.parallelGroup] || {};
            if (groupProgress[choice.id] && groupProgress[choice.id].viewed) {
                return false;
            }
        }
        
        return true;
    });
    availableChoices.forEach(choice => {
        const btn = createChoiceButton(choice, sceneName);
        choicesBox.appendChild(btn);
    });
    
    if (scene.parallelGroup) {
        const groupProgress = gameState.parallelChoiceProgress[scene.parallelGroup] || {};
        const totalChoices = scene.choices.filter(c => c.type === 'parallel').length;
        const viewedChoices = Object.values(groupProgress).filter(v => v.viewed).length;
        
        if (viewedChoices > 0 && viewedChoices < totalChoices) {
            const progressText = document.createElement('div');
            progressText.className = 'choice-progress';
            const exploredText = gameTranslations.ui?.explored || `Explored: {0}/{1}`;
            progressText.textContent = exploredText.replace('{0}', viewedChoices).replace('{1}', totalChoices);
            choicesBox.appendChild(progressText);
        }
    }
}

export function showParallelScene(sceneName, returnSceneName) {
    ensureDOMReady();
    const scene = scenes[sceneName];
    if (!scene) return;
    
    saveCurrentScene(sceneName);
    setCurrentScene(sceneName);
    gameState.visitedScenes.add(sceneName);
    
    dialogText.innerHTML = "";
    if (scene.paragraphs && Array.isArray(scene.paragraphs)) {
        const parts = scene.paragraphs.map(p => {
            const raw = p.text || '';
            const html = raw.replace(/\n/g, '<br>');
            if (p.style && p.style.trim() !== '') {
                const cls = p.style.trim().replace(/[^a-zA-Z0-9_-]/g, '');
                return `<span class="${cls}">${html}</span>`;
            }
            return `<span>${html}</span>`;
        });
        const pEl = document.createElement('p');
        pEl.innerHTML = parts.join('<br><br>');
        dialogText.appendChild(pEl);
    } else {
        const pEl = document.createElement('p');
        pEl.innerHTML = scene.text || '';
        dialogText.appendChild(pEl);
    }
    
    dialogText.scrollTop = 0;
    
    choicesBox.innerHTML = "";
    const continueBtn = document.createElement("button");
    continueBtn.className = "choice-btn continue-btn";
    continueBtn.textContent = gameTranslations.ui?.continue || "Continue →";
    continueBtn.onclick = () => {
        const parentScene = scenes[returnSceneName];
        if (parentScene && parentScene.parallelGroup) {
            const groupProgress = gameState.parallelChoiceProgress[parentScene.parallelGroup] || {};
            const totalParallel = parentScene.choices.filter(c => c.type === 'parallel').length;
            const viewedParallel = Object.values(groupProgress).filter(v => v.viewed).length;
            
            if (viewedParallel >= totalParallel && parentScene.continueAfterParallel) {
                // Clear stored parent when leaving parallel group
                setParentParallelScene(null);
                showScene(parentScene.continueAfterParallel);
            } else {
                // Clear stored parent when returning to parent choices
                setParentParallelScene(null);
                showChoicesForScene(parentScene, returnSceneName);
            }
        }
    };
    choicesBox.appendChild(continueBtn);
}

function checkCondition(condition) {
    switch(condition.type) {
        case 'visited':
            return gameState.visitedScenes.has(condition.scene);
        case 'completed':
            return gameState.completedChoices.has(condition.choiceId);
        case 'parallelComplete':
            const group = condition.group;
            const scene = Object.values(scenes).find(s => s.parallelGroup === group);
            if (!scene) return false;
            const total = scene.choices.filter(c => c.type === 'parallel').length;
            const viewed = Object.keys(gameState.parallelChoiceProgress[group] || {}).length;
            return viewed >= total;
        default:
            return true;
    }
}
