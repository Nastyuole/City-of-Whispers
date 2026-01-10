let scenes = {};
let currentLanguage = localStorage.getItem('lang') || 'en';
let gameState = {
    visitedScenes: new Set(),
    completedChoices: new Set(),
    parallelChoiceProgress: {}
};


// Load game scenes based on selected language
async function loadGameScenes(lang) {
    try {
        const langMap = { 'en': 'en', 'ru': 'ru', 'bg': 'bg' };
        const langCode = langMap[lang] || 'en';
        const response = await fetch(`../assets/locales/${langCode}/${langCode}GameTranslation.json`);
        const data = await response.json();
        scenes = data.scenes;
        resetGameState();
        showScene("start");
    } catch (error) {
        console.error('Error on loading scenes:', error);
        dialogText.textContent = "Error loading game scenes. Please refresh the page.";
    }
}

// Reset game state
function resetGameState() {
    gameState = {
        visitedScenes: new Set(['start']),
        completedChoices: new Set(),
        parallelChoiceProgress: {}
    };
}

const dialogText = document.getElementById("dialog-text");
const choicesBox = document.getElementById("choices");

// Escape text for safe insertion into innerHTML
function escapeHTML(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
}

function showScene(name) {
    const scene = scenes[name];
    if (!scene) return;
    
    // Note the scene visited
    gameState.visitedScenes.add(name);
    
        // Show dialog text: combine paragraphs into a single paragraph block (preserves previous layout)
        dialogText.innerHTML = "";
        if (scene.paragraphs && Array.isArray(scene.paragraphs)) {
            // Build HTML with spans per original paragraph so we can style individual segments,
            // but keep a single <p> element to preserve layout (no visual splitting).
            const parts = scene.paragraphs.map(p => {
                const raw = p.text || '';
                // preserve internal newlines in a paragraph
                const html = escapeHTML(raw).replace(/\n/g, '<br>');
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
            pEl.textContent = scene.text || '';
            dialogText.appendChild(pEl);
        }
    
    // Show choices
    showChoicesForScene(scene, name);
}

function showChoicesForScene(scene, sceneName) {
    choicesBox.innerHTML = "";
    
    if (!scene.choices || scene.choices.length === 0) {
        showEndButton();
        return;
    }
    
    //Filter choices based on their type and state
    const availableChoices = scene.choices.filter(choice => {
        // Check display conditions
        if (choice.condition) {
            return checkCondition(choice.condition);
        }
        
        // If choice already completed and is once-only
        if (choice.type === 'once' && gameState.completedChoices.has(choice.id)) {
            return false;
        }
        
        //it's a parallel choice and already viewed
        if (choice.type === 'parallel' && scene.parallelGroup) {
            const groupProgress = gameState.parallelChoiceProgress[scene.parallelGroup] || {};
            if (groupProgress[choice.id] && groupProgress[choice.id].viewed) {
                return false;
            }
        }
        
        return true;
    });
    
    if (availableChoices.length === 0) {
        // All choices viewed show continue
        if (scene.continueAfterParallel) {
            showContinueButton(scene.continueAfterParallel);
            return;
        }
        showEndButton();
        return;
    }
    
    //Display the available choices
    availableChoices.forEach(choice => {
        const btn = createChoiceButton(choice, sceneName);
        choicesBox.appendChild(btn);
    });
    
    // If there are already viewed parallel choices, show progress
    if (scene.parallelGroup) {
        const groupProgress = gameState.parallelChoiceProgress[scene.parallelGroup] || {};
        const totalChoices = scene.choices.filter(c => c.type === 'parallel').length;
        const viewedChoices = Object.values(groupProgress).filter(v => v.viewed).length;
        
        if (viewedChoices > 0 && viewedChoices < totalChoices) {
            const progressText = document.createElement('div');
            progressText.className = 'choice-progress';
            progressText.textContent = `Исследовано: ${viewedChoices}/${totalChoices}`;
            choicesBox.appendChild(progressText);
        }
    }
}

function createChoiceButton(choice, sceneName) {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    
    // Add icon based on choice type
    let prefix = "";
    if (choice.type === 'parallel') {
        prefix = "🔍 ";
    } else if (choice.type === 'branching') {
        prefix = "⚡ ";
    } else if (choice.type === 'once') {
        prefix = "⚠️ ";
    }
    
    btn.textContent = prefix + choice.label;
    
    // Check if this choice was already viewed
    const isViewed = choice.type === 'parallel' && sceneName && scenes[sceneName]?.parallelGroup
        ? (gameState.parallelChoiceProgress[scenes[sceneName].parallelGroup]?.[choice.id]?.viewed || false)
        : false;
    
    if (isViewed) {
        btn.classList.add('choice-viewed');
    }
    
    btn.onclick = () => handleChoice(choice, sceneName);
    return btn;
}

function handleChoice(choice, currentSceneName) {
    // Set choice as completed
    if (choice.id) {
        gameState.completedChoices.add(choice.id);
    }
    
    // Handle parallel choice tracking
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
    
    if (choice.next === "gameExit" || choice.next === null || !choice.next) {
        exitFullscreen();
        return;
    }
    
    if (choice.next) {
        // For parallel choices, show the next scene and add back button to return to main scene
        if (choice.type === 'parallel') {
            showParallelScene(choice.next, currentSceneName);
        } else {
            showScene(choice.next);
        }
    }
}

function showParallelScene(sceneName, returnSceneName) {
    // Show parallel scene with a continue button instead of back button
    const scene = scenes[sceneName];
    if (!scene) return;
    
    // Note the scene visited
    gameState.visitedScenes.add(sceneName);
    
        // Render paragraphs for parallel scenes as a single paragraph block
        dialogText.innerHTML = "";
        if (scene.paragraphs && Array.isArray(scene.paragraphs)) {
            const parts = scene.paragraphs.map(p => {
                const raw = p.text || '';
                const html = escapeHTML(raw).replace(/\n/g, '<br>');
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
            pEl.textContent = scene.text || '';
            dialogText.appendChild(pEl);
        }
    
    // Scroll to top of dialog
    dialogText.scrollTop = 0;
    
    // Show continue button
    choicesBox.innerHTML = "";
    const continueBtn = document.createElement("button");
    continueBtn.className = "choice-btn continue-btn";
    continueBtn.textContent = "Продолжить →";
    continueBtn.onclick = () => {
        // Check if all parallel choices have been viewed
        const parentScene = scenes[returnSceneName];
        if (parentScene && parentScene.parallelGroup) {
            const groupProgress = gameState.parallelChoiceProgress[parentScene.parallelGroup] || {};
            const totalParallel = parentScene.choices.filter(c => c.type === 'parallel').length;
            const viewedParallel = Object.values(groupProgress).filter(v => v.viewed).length;
            
            // If all parallel choices viewed, go to continueAfterParallel scene
            if (viewedParallel >= totalParallel && parentScene.continueAfterParallel) {
                showScene(parentScene.continueAfterParallel);
            } else {
                // Otherwise, return to the parallel choice menu
                showChoicesForScene(parentScene, returnSceneName);
            }
        }
    };
    choicesBox.appendChild(continueBtn);
}

function showContinueButton(nextScene) {
    choicesBox.innerHTML = "";
    const continueBtn = document.createElement("button");
    continueBtn.className = "choice-btn continue-btn";
    continueBtn.textContent = "Продолжить →";
    continueBtn.onclick = () => showScene(nextScene);
    choicesBox.appendChild(continueBtn);
}

function showEndButton() {
    const endBtn = document.createElement("button");
    endBtn.className = "choice-btn end-btn";
    endBtn.textContent = "Конец";
    endBtn.onclick = exitFullscreen;
    choicesBox.appendChild(endBtn);
}

function checkCondition(condition) {
    // Simple condition checks
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

// Listen for language change events
window.addEventListener('languageChanged', (event) => {
    currentLanguage = event.detail?.lang || localStorage.getItem('lang') || 'en';
    loadGameScenes(currentLanguage);
});

// Listen for messages from parent window
window.addEventListener('message', (event) => {
    try {
        if (event.data && event.data.type === 'restartGame') {
            resetGameState();
            loadGameScenes(currentLanguage);
        }
    } catch (e) { 
        console.error("Ошибка обработки сообщения:", e);
    }
});

loadGameScenes(currentLanguage);