let scenes = {};
let currentLanguage = localStorage.getItem('lang') || 'en';
let gameTranslations = {};
let currentSceneName = 'start'; // Track current scene for menu display
let isLoadingScenes = false; // Prevent duplicate concurrent loads
let gameState = {
    visitedScenes: new Set(),
    completedChoices: new Set(),
    parallelChoiceProgress: {}
};

// Save current scene to localStorage
function saveCurrentScene(sceneName) {
    try {
        const gameData = {
            currentScene: sceneName,
            gameState: {
                visitedScenes: Array.from(gameState.visitedScenes),
                completedChoices: Array.from(gameState.completedChoices),
                parallelChoiceProgress: gameState.parallelChoiceProgress
            },
            language: currentLanguage,
            timestamp: Date.now()
        };
        localStorage.setItem('gameProgress', JSON.stringify(gameData));
    } catch (error) {
        console.error('Error saving game progress:', error);
    }
}



// Load game scenes based on selected language
async function loadGameScenes(lang) {
    // Prevent concurrent loads
    if (isLoadingScenes) {
        console.log('Scenes already loading, skipping duplicate request');
        return;
    }
    
    isLoadingScenes = true;
    try {
        const langMap = { 'en': 'en', 'ru': 'ru', 'bg': 'bg' };
        const langCode = langMap[lang] || 'en';
        const url = `./assets/locales/${langCode}/${langCode}GameTranslation.json`;
        console.log('Attempting to load scenes from:', url);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} loading ${url}`);
        }
        const data = await response.json();
        scenes = data.scenes || {};
        gameTranslations = data;
        console.log('Scenes loaded successfully:', Object.keys(scenes).length, 'scenes');
        
        // Check if there's a saved game to restore
        const savedGameData = localStorage.getItem('gameProgress');
        if (savedGameData) {
            try {
                const gameData = JSON.parse(savedGameData);
                // Restore game state from save
                gameState.visitedScenes = new Set(gameData.gameState.visitedScenes);
                gameState.completedChoices = new Set(gameData.gameState.completedChoices);
                gameState.parallelChoiceProgress = gameData.gameState.parallelChoiceProgress;
                // Show the saved scene
                showScene(gameData.currentScene);
            } catch (error) {
                console.error('Error restoring saved game:', error);
                resetGameState();
                showScene("start");
            }
        } else {
            resetGameState();
            showScene("start");
        }
    } catch (error) {
        console.error('Error on loading scenes:', error);
        dialogText.textContent = "Error loading game scenes. Please refresh the page.";
    } finally {
        isLoadingScenes = false;
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
    
    // Save current scene to localStorage
    saveCurrentScene(name);
    currentSceneName = name; // Update current scene for menu display
    
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
    
    // Show choices
    showChoicesForScene(scene, name);
}

function showChoicesForScene(scene, sceneName) {
    choicesBox.innerHTML = "";
    // Scroll to top of dialog
    dialogText.scrollTop = 0;
    
    // Handle missing or empty choices
    if (!scene || !scene.choices || scene.choices.length === 0) {
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
            const exploredText = gameTranslations.ui?.explored || `Explored: {0}/{1}`;
            progressText.textContent = exploredText.replace('{0}', viewedChoices).replace('{1}', totalChoices);
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
    
    // Save current scene to localStorage
    saveCurrentScene(sceneName);
    currentSceneName = sceneName; // Update current scene for menu display
    
    // Note the scene visited
    gameState.visitedScenes.add(sceneName);
    
        // Render paragraphs for parallel scenes as a single paragraph block
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
    
    // Scroll to top of dialog
    dialogText.scrollTop = 0;
    
    // Show continue button
    choicesBox.innerHTML = "";
    const continueBtn = document.createElement("button");
    continueBtn.className = "choice-btn continue-btn";
    continueBtn.textContent = gameTranslations.ui?.continue || "Continue →";
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
        console.error("Error processing message:", e);
    }
});

// Load game scenes
loadGameScenes(currentLanguage);

// Auto-save game state periodically (every 5 seconds)
let autoSaveEnabled = true;
setInterval(() => {
    if (!autoSaveEnabled) return; // Skip auto-save if disabled
    if (currentSceneName && currentSceneName !== 'start' || Object.keys(gameState.visitedScenes || {}).length > 1) {
        // Save current progress to main gameProgress slot
        saveCurrentScene(currentSceneName);
    }
}, 5000);
// Load game-specific translations from GameTranslation.json
async function loadGameTranslations() {
  const lang = localStorage.getItem('lang') || 'en';
  try {
    const res = await fetch(`./assets/locales/${lang}/${lang}GameTranslation.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const translations = data.ui || {};
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const value = translations[key];
      if (value) {
        el.innerHTML = value;
      }
    });
  } catch (err) {
    console.warn('Error loading game translations:', err);
  }
}

// Update title screen load slots with save info
function updateTitleScreenSlots() {
  const loadGameSlotsButtons = document.querySelectorAll('.load-game-slot-btn');
  loadGameSlotsButtons.forEach((btn) => {
    const slot = btn.getAttribute('data-slot');
    const saveData = localStorage.getItem(`gameProgress_slot${slot}`);
    if (saveData) {
      try {
        const data = JSON.parse(saveData);
        const timeString = new Date(data.timestamp).toLocaleString();
        btn.querySelector('.slot-title').textContent = `Save Slot ${slot}`;
        btn.querySelector('.slot-info').textContent = `Scene: ${data.currentScene} - ${timeString}`;
      } catch (e) {
        console.warn(`Failed to parse save slot ${slot}:`, e);
      }
    } else {
      btn.querySelector('.slot-title').textContent = `Save Slot ${slot}`;
      btn.querySelector('.slot-info').textContent = 'Empty';
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
    const newGameBtn = document.getElementById('new-game-btn');
    const continueGameBtn = document.getElementById('continue-game-btn');
    const loadGameBtn = document.getElementById('load-game-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const backBtn = document.getElementById('back-btn');
    const loadBackBtn = document.getElementById('load-back-btn');
    const exitBtn = document.getElementById('exit-btn');
    const titleScreen = document.getElementById('title-screen');
    const videoScreen = document.getElementById('video-screen');
    const video = document.getElementById('intro-video');
    const gameContainer = document.getElementById('game');
    const menuContainer = document.getElementById('menu-container');
    const settingsContainer = document.getElementById('settings-container');
    const loadGameContainer = document.getElementById('load-game-container');
    const fontSizeSlider = document.getElementById('font-size-slider');
    const fontSizeValue = document.getElementById('font-size-value');
    const langBtns = document.querySelectorAll('.lang-btn');
    const loadGameSlotsButtons = document.querySelectorAll('.load-game-slot-btn');

    // Helper: check if any save exists (main progress or slot)
    function hasAnySave() {
      if (localStorage.getItem('gameProgress')) return true;
      for (let i = 1; i <= 3; i++) {
        if (localStorage.getItem(`gameProgress_slot${i}`)) return true;
      }
      return false;
    }

    // Toggle between New Game and Continue Game buttons based on save state
    function updateMenuButtonVisibility() {
      if (hasAnySave()) {
        newGameBtn.classList.add('hidden');
        continueGameBtn.classList.remove('hidden');
      } else {
        newGameBtn.classList.remove('hidden');
        continueGameBtn.classList.add('hidden');
      }
    }

    // Update title screen slots on initial load
    updateTitleScreenSlots();
    updateMenuButtonVisibility();



    // Try to use icondelete.png if available, otherwise keep existing SVG
    (async function setDeleteIconIfAvailable(){
      const pngPath = './assets/images/icondelete.png';
      try {
        const res = await fetch(pngPath, { method: 'HEAD' });
        if (res.ok) {
          document.querySelectorAll('.delete-slot-btn img, .delete-slot-btn-in-game img').forEach(img => {
            img.src = pngPath;
          });
        }
      } catch (e) {
        // network error or file not present — leave existing SVG
        console.warn('icondelete.png not available, using fallback svg');
      }
    })();

    // Settings button click
    settingsBtn.addEventListener('click', function() {
        menuContainer.classList.add('hidden');
        settingsContainer.classList.add('active');
    });

    // Back button click for settings
    backBtn.addEventListener('click', function() {
        menuContainer.classList.remove('hidden');
        settingsContainer.classList.remove('active');
    });

    // Exit button click
    exitBtn.addEventListener('click', function() {
        window.parent.postMessage({ type: 'closeGameFrame' }, '*');
    });

    // Load Game button click
    loadGameBtn.addEventListener('click', function() {
      menuContainer.classList.add('hidden');
      loadGameContainer.classList.add('active');
      updateTitleScreenSlots();
    });

    // Load Game slot buttons
    loadGameSlotsButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const slot = this.getAttribute('data-slot');
            const saveData = localStorage.getItem(`gameProgress_slot${slot}`);
            if (saveData) {
                // Load save data
                localStorage.setItem('gameProgress', saveData);
                // Mark that we're loading from a slot
                sessionStorage.setItem('loadingFromSlot', 'true');
                // Reload page to load the game with saved state
                location.reload();
            } else {
                alert('This slot is empty');
            }
        });
    });

    // Title-screen delete buttons for slots
    const titleDeleteButtons = document.querySelectorAll('.delete-slot-btn');
    titleDeleteButtons.forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        const slot = this.getAttribute('data-slot');
        if (!slot) return;
        if (!confirm('Delete save in slot ' + slot + '?')) return;
        localStorage.removeItem(`gameProgress_slot${slot}`);
        updateTitleScreenSlots();
        updateMenuButtonVisibility();
      }, { passive: false });
    });

    // Load back button
    loadBackBtn.addEventListener('click', function() {
        menuContainer.classList.remove('hidden');
        loadGameContainer.classList.remove('active');
    });

    // Auto-load game if reloading from a slot click
    const isLoadingFromSlot = sessionStorage.getItem('loadingFromSlot');
    if (isLoadingFromSlot) {
        sessionStorage.removeItem('loadingFromSlot');
        const savedGameData = localStorage.getItem('gameProgress');
        if (savedGameData) {
            titleScreen.classList.add('hidden');
            gameContainer.style.opacity = '1';
            gameContainer.style.visibility = 'visible';
            gameContainer.style.pointerEvents = 'auto';
            // Wait for game.js to initialize then setup menu
            setTimeout(() => {
                setupGameMenuListeners();
            }, 100);
        }
    }

    // Language buttons
    langBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const lang = this.getAttribute('data-lang');
            localStorage.setItem('lang', lang);
            
            // Update active button
            langBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Dispatch language change event
            const event = new CustomEvent('languageChanged', { detail: { lang } });
            window.dispatchEvent(event);
        });
    });

    // Font size slider
    fontSizeSlider.addEventListener('input', function() {
        const size = this.value;
        fontSizeValue.textContent = size + 'px';
        document.documentElement.style.setProperty('--game-font-size', size + 'px');
        localStorage.setItem('fontSize', size);
    });

    // Load saved font size
    const savedFontSize = localStorage.getItem('fontSize') || '18';
    fontSizeSlider.value = savedFontSize;
    fontSizeValue.textContent = savedFontSize + 'px';
    document.documentElement.style.setProperty('--game-font-size', savedFontSize + 'px');

    // Set active language button
    const currentLang = localStorage.getItem('lang') || 'en';
    langBtns.forEach(btn => {
        if (btn.getAttribute('data-lang') === currentLang) {
            btn.classList.add('active');
        }
    });

    // Load game translations on startup and listen for language changes
    loadGameTranslations();
    window.addEventListener('languageChanged', (e) => {
      loadGameTranslations();
    });

    newGameBtn.addEventListener('click', function() {
      // Always start a fresh new game
      localStorage.removeItem('gameProgress');
      autoSaveEnabled = false; // Disable auto-save during transition
      menuContainer.classList.remove('hidden');
      loadGameContainer.classList.remove('active');
      titleScreen.classList.add('hidden');
      videoScreen.classList.remove('hidden');
      video.currentTime = 0;
      video.play();

      video.onended = () => {
        videoScreen.classList.add('hidden');
        gameContainer.style.opacity = '1';
        gameContainer.style.visibility = 'visible';
        gameContainer.style.pointerEvents = 'auto';
            
        // Give game.js time to initialize, then restart game
        setTimeout(() => {
          window.postMessage({ type: 'restartGame' }, '*');
          autoSaveEnabled = true; // Re-enable auto-save after game restarts
          setupGameMenuListeners();
        }, 100);
      };
    });

    // Continue Game button — load last save
    continueGameBtn.addEventListener('click', function() {
      if (hasAnySave()) {
        // Hide title and show game (game.js already loaded saved state)
        menuContainer.classList.remove('hidden');
        loadGameContainer.classList.remove('active');
        titleScreen.classList.add('hidden');
        gameContainer.style.opacity = '1';
        gameContainer.style.visibility = 'visible';
        gameContainer.style.pointerEvents = 'auto';
        setTimeout(() => {
          setupGameMenuListeners();
        }, 100);
      }
    });


    // Game Menu Functionality
    function setupGameMenuListeners() {
        const gameMenuBtn = document.getElementById('game-menu-btn');
        const gameMenuPanel = document.getElementById('game-menu-panel');
        const closeMenuBtn = document.getElementById('close-menu-btn');
        const exitGameBtn = document.getElementById('exit-game-btn');
        const saveGameBtn = document.getElementById('save-game-btn');
        const loadGameBtnInGame = document.getElementById('load-game-btn-in-game');
        const saveContainers = document.getElementById('save-containers');
        const loadContainers = document.getElementById('load-containers');
        const saveSlotsButtons = document.querySelectorAll('.save-slot-btn');
        const loadSlotsButtons = document.querySelectorAll('.load-slot-btn');
        const settingsGameBtn = document.getElementById('settings-game-btn');
        const gameSettingsPanel = document.getElementById('game-settings-panel');
        const closeSettingsGameBtn = document.getElementById('close-settings-game-btn');
        const fontSizeSliderGame = document.getElementById('font-size-slider-game');
        const fontSizeValueGame = document.getElementById('font-size-value-game');
        const langBtnsGame = document.querySelectorAll('.lang-btn-game');

        // Safety check: if menu elements don't exist, exit early
        if (!gameMenuBtn || !gameMenuPanel) {
            console.warn('Menu elements not found - game.html might not have loaded properly');
            return;
        }
        
        console.log('Menu listeners attached successfully');

        // Update save slot displays
        function updateSaveSlots() {
          const lang = localStorage.getItem('lang') || 'en';
          fetch(`./assets/locales/${lang}/${lang}GameTranslation.json`).then(r => r.json()).then(data => {
            const ui = data.ui || {};
            for (let i = 1; i <= 3; i++) {
              const saveData = localStorage.getItem(`gameProgress_slot${i}`);
              const slotBtn = document.querySelector(`.save-slot-btn[data-slot="${i}"]`);
              if (saveData) {
                const d = JSON.parse(saveData);
                const timeString = new Date(d.timestamp).toLocaleString();
                slotBtn.innerHTML = `<span class="save-slot-title">${(ui.saveSlot||'Save Slot {0}').replace('{0}', i)}</span><span class="save-slot-info">Scene: ${d.currentScene} - ${timeString}</span>`;
              } else {
                slotBtn.innerHTML = `<span class="save-slot-title">${(ui.saveSlot||'Save Slot {0}').replace('{0}', i)}</span><span class="save-slot-info">${ui.empty||'Empty'}</span>`;
              }
            }
          }).catch(() => {
            for (let i = 1; i <= 3; i++) {
              const saveData = localStorage.getItem(`gameProgress_slot${i}`);
              const slotBtn = document.querySelector(`.save-slot-btn[data-slot="${i}"]`);
              if (saveData) {
                const d = JSON.parse(saveData);
                const timeString = new Date(d.timestamp).toLocaleString();
                slotBtn.innerHTML = `<span class="save-slot-title">Save Slot ${i}</span><span class="save-slot-info">Scene: ${d.currentScene} - ${timeString}</span>`;
              } else {
                slotBtn.innerHTML = `<span class="save-slot-title">Save Slot ${i}</span><span class="save-slot-info">Empty</span>`;
              }
            }
          });
        }

        // Update load slot displays
        function updateLoadSlots() {
          const lang = localStorage.getItem('lang') || 'en';
          fetch(`./assets/locales/${lang}/${lang}GameTranslation.json`).then(r => r.json()).then(data => {
            const ui = data.ui || {};
            for (let i = 1; i <= 3; i++) {
              const saveData = localStorage.getItem(`gameProgress_slot${i}`);
              const slotBtn = document.querySelector(`.load-slot-btn[data-slot="${i}"]`);
              if (saveData) {
                const d = JSON.parse(saveData);
                const timeString = new Date(d.timestamp).toLocaleString();
                slotBtn.innerHTML = `<span class="save-slot-title">${(ui.saveSlot||'Save Slot {0}').replace('{0}', i)}</span><span class="save-slot-info">Scene: ${d.currentScene} - ${timeString}</span>`;
              } else {
                slotBtn.innerHTML = `<span class="save-slot-title">${(ui.saveSlot||'Save Slot {0}').replace('{0}', i)}</span><span class="save-slot-info">${ui.empty||'Empty'}</span>`;
              }
            }
          }).catch(() => {
            for (let i = 1; i <= 3; i++) {
              const saveData = localStorage.getItem(`gameProgress_slot${i}`);
              const slotBtn = document.querySelector(`.load-slot-btn[data-slot="${i}"]`);
              if (saveData) {
                const d = JSON.parse(saveData);
                const timeString = new Date(d.timestamp).toLocaleString();
                slotBtn.innerHTML = `<span class="save-slot-title">Save Slot ${i}</span><span class="save-slot-info">Scene: ${d.currentScene} - ${timeString}</span>`;
              } else {
                slotBtn.innerHTML = `<span class="save-slot-title">Save Slot ${i}</span><span class="save-slot-info">Empty</span>`;
              }
            }
          });
        }

        // Save Game button
        saveGameBtn?.addEventListener('click', function() {
            saveContainers?.classList.toggle('hidden');
            loadContainers?.classList.add('hidden');
            gameSettingsPanel?.classList.add('hidden');
            updateSaveSlots();
        });

        // Load Game button
        loadGameBtnInGame?.addEventListener('click', function() {
            loadContainers?.classList.toggle('hidden');
            saveContainers?.classList.add('hidden');
            gameSettingsPanel?.classList.add('hidden');
            updateLoadSlots();
        });

        // Save slot buttons
        saveSlotsButtons.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const slot = this.getAttribute('data-slot');
                const gameProgress = localStorage.getItem('gameProgress');
                
                if (gameProgress) {
                    // Save current game to selected slot
                    localStorage.setItem(`gameProgress_slot${slot}`, gameProgress);
                    updateSaveSlots();
                    // Silently save without alert
                    gameMenuPanel.classList.add('hidden');
                }
            });
        });

        // Load slot buttons
        loadSlotsButtons.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const slot = this.getAttribute('data-slot');
                const saveData = localStorage.getItem(`gameProgress_slot${slot}`);
                if (saveData) {
                    // Load the save data
                    localStorage.setItem('gameProgress', saveData);
                    // Mark that we're loading from a slot
                    sessionStorage.setItem('loadingFromSlot', 'true');
                    // Reload the game to reflect changes
                    location.reload();
                } else {
                    alert('This slot is empty');
                }
            });
        });

        // Toggle menu panel
        gameMenuBtn?.addEventListener('click', function() {
            gameMenuPanel.classList.toggle('hidden');
            gameSettingsPanel?.classList.add('hidden');
            saveContainers?.classList.add('hidden');
            loadContainers?.classList.add('hidden');
        });

        // Close menu
        closeMenuBtn?.addEventListener('click', function() {
            gameMenuPanel.classList.add('hidden');
        });

        // Exit to menu
        exitGameBtn?.addEventListener('click', function() {
            titleScreen.classList.remove('hidden');
            gameContainer.style.opacity = '0';
            gameContainer.style.visibility = 'hidden';
            gameContainer.style.pointerEvents = 'none';
            gameMenuPanel.classList.add('hidden');
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            if (gameMenuPanel.classList.contains('hidden')) return;
            if (!gameMenuBtn.contains(event.target) && 
                !gameMenuPanel.contains(event.target)) {
                gameMenuPanel.classList.add('hidden');
            }
        });

        // Settings Button
        settingsGameBtn.addEventListener('click', function() {
            gameSettingsPanel.classList.toggle('hidden');
            saveContainers.classList.add('hidden');
            loadContainers.classList.add('hidden');
        });

        // Close Settings
        closeSettingsGameBtn.addEventListener('click', function() {
            gameSettingsPanel.classList.add('hidden');
        });

        // Font Size Slider in Game
        fontSizeSliderGame.addEventListener('input', function() {
            const size = this.value;
            fontSizeValueGame.textContent = size + 'px';
            document.documentElement.style.setProperty('--game-font-size', size + 'px');
            localStorage.setItem('fontSize', size);
            fontSizeSlider.value = size;
        });

        // Load saved font size in game menu
        const savedFontSize = localStorage.getItem('fontSize') || '18';
        fontSizeSliderGame.value = savedFontSize;
        fontSizeValueGame.textContent = savedFontSize + 'px';

        // Language buttons in game menu
        const currentLang = localStorage.getItem('lang') || 'en';
        langBtnsGame.forEach(btn => {
            if (btn.getAttribute('data-lang') === currentLang) {
                btn.classList.add('active');
            }
            btn.addEventListener('click', function() {
                const lang = this.getAttribute('data-lang');
                localStorage.setItem('lang', lang);
                
                // Update active button in game menu
                langBtnsGame.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                // Also update title screen buttons
                langBtns.forEach(b => b.classList.remove('active'));
                document.querySelector(`.lang-btn[data-lang="${lang}"]`).classList.add('active');
                
                // Dispatch language change event
                const event = new CustomEvent('languageChanged', { detail: { lang } });
                window.dispatchEvent(event);
            });
        });

          // Delete buttons in game menu (save/load rows)
          const inGameDeleteBtns = document.querySelectorAll('.delete-slot-btn-in-game');
          inGameDeleteBtns.forEach(btn => {
            btn.addEventListener('click', function(e) {
              e.preventDefault();
              e.stopPropagation();
              if (e.stopImmediatePropagation) e.stopImmediatePropagation();
              const slot = this.getAttribute('data-slot');
              if (!slot) return;
              if (!confirm('Delete save in slot ' + slot + '?')) return;
              localStorage.removeItem(`gameProgress_slot${slot}`);
              updateSaveSlots();
              updateLoadSlots();
            }, { passive: false });
          });
    }
});
  // Simple in-page confirm that returns a Promise<boolean>
  function showConfirm(message) {
    return new Promise(resolve => {
      const backdrop = document.getElementById('confirm-backdrop');
      const msg = document.getElementById('confirm-message');
      const yes = document.getElementById('confirm-yes');
      const no = document.getElementById('confirm-no');
      msg.textContent = message;
      backdrop.style.display = 'flex';
      backdrop.setAttribute('aria-hidden', 'false');

      function cleanup() {
        backdrop.style.display = 'none';
        backdrop.setAttribute('aria-hidden', 'true');
        yes.removeEventListener('click', onYes);
        no.removeEventListener('click', onNo);
      }
      function onYes(e) { e.preventDefault(); cleanup(); resolve(true); }
      function onNo(e) { e.preventDefault(); cleanup(); resolve(false); }
      yes.addEventListener('click', onYes);
      no.addEventListener('click', onNo);
      // allow Esc to cancel
      function onKey(e) { if (e.key === 'Escape') { cleanup(); resolve(false); document.removeEventListener('keydown', onKey); } }
      document.addEventListener('keydown', onKey);
    });
  }

  // Replace existing confirm() usage by overriding window.confirm used earlier
  // But safest is to update our delete handlers to call showConfirm directly; ensure they exist
  (function replaceHandlers() {
    const titleDeleteButtons = document.querySelectorAll('.delete-slot-btn');
    titleDeleteButtons.forEach(btn => {
      btn.addEventListener('click', async function(e) {
        e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        const slot = this.getAttribute('data-slot'); if (!slot) return;
        const ok = await showConfirm('Delete save in slot ' + slot + '?');
        if (!ok) return;
        localStorage.removeItem(`gameProgress_slot${slot}`);
        try { updateSaveSlots(); updateLoadSlots(); } catch (_) {}
      }, { passive: false });
    });

    const inGameDeleteBtns = document.querySelectorAll('.delete-slot-btn-in-game');
    inGameDeleteBtns.forEach(btn => {
      btn.addEventListener('click', async function(e) {
        e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        const slot = this.getAttribute('data-slot'); if (!slot) return;
        const ok = await showConfirm('Delete save in slot ' + slot + '?');
        if (!ok) return;
        localStorage.removeItem(`gameProgress_slot${slot}`);
        try { updateSaveSlots(); updateLoadSlots(); } catch (_) {}
      }, { passive: false });
    });
  })();