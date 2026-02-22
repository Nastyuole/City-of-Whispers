// In-game menu handler
import { showConfirm } from './gameUI.js';
import { saveCurrentScene, getCurrentSceneName } from './gameState.js';

export function setupGameMenuListeners() {
    const gameMenuBtn = document.getElementById('game-menu-btn');
    const gameMenuPanel = document.getElementById('game-menu-panel');
    const closeMenuBtn = document.getElementById('close-menu-btn');
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
    const exitToMenuBtn = document.getElementById('exit-to-menu-btn');
    const titleScreen = document.getElementById('title-screen');
    const gameContainer = document.getElementById('game');
    const fontSizeSlider = document.getElementById('font-size-slider');
    const langBtns = document.querySelectorAll('.lang-btn');

    if (!gameMenuBtn || !gameMenuPanel) {
        console.warn('Menu elements not found');
        return;
    }

    function updateSlotDisplays(slotType = 'save') {
        const lang = localStorage.getItem('lang') || 'en';
        const selector = slotType === 'save' ? '.save-slot-btn' : '.load-slot-btn';
        
        fetch(`./assets/locales/${lang}/${lang}GameTranslation.json`)
            .then(r => r.json())
            .then(data => {
                const ui = data.ui || {};
                for (let i = 1; i <= 3; i++) {
                    const saveData = localStorage.getItem(`gameProgress_slot${i}`);
                    const slotBtn = document.querySelector(`${selector}[data-slot="${i}"]`);
                    if (!slotBtn) continue;
                    
                    if (saveData) {
                        const d = JSON.parse(saveData);
                        const timeString = new Date(d.timestamp).toLocaleString();
                        slotBtn.innerHTML = `<span class="save-slot-title">${(ui.saveSlot || 'Save Slot {0}').replace('{0}', i)}</span><span class="save-slot-info">Scene: ${d.currentScene} - ${timeString}</span>`;
                    } else {
                        slotBtn.innerHTML = `<span class="save-slot-title">${(ui.saveSlot || 'Save Slot {0}').replace('{0}', i)}</span><span class="save-slot-info">${ui.empty || 'Empty'}</span>`;
                    }
                }
            })
            .catch(() => {
                for (let i = 1; i <= 3; i++) {
                    const saveData = localStorage.getItem(`gameProgress_slot${i}`);
                    const slotBtn = document.querySelector(`${selector}[data-slot="${i}"]`);
                    if (!slotBtn) continue;
                    
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

    saveGameBtn?.addEventListener('click', function() {
        // Save current progress before showing save slots
        const sceneName = getCurrentSceneName();
        if (sceneName) {
            saveCurrentScene(sceneName);
        }
        saveContainers?.classList.toggle('hidden');
        loadContainers?.classList.add('hidden');
        gameSettingsPanel?.classList.add('hidden');
        updateSlotDisplays('save');
    });

    loadGameBtnInGame?.addEventListener('click', function() {
        loadContainers?.classList.toggle('hidden');
        saveContainers?.classList.add('hidden');
        gameSettingsPanel?.classList.add('hidden');
        updateSlotDisplays('load');
    });

    saveSlotsButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const slot = this.getAttribute('data-slot');
            const gameProgress = localStorage.getItem('gameProgress');
            
            if (gameProgress) {
                localStorage.setItem(`gameProgress_slot${slot}`, gameProgress);
                updateSlotDisplays('save');
                gameMenuPanel.classList.add('hidden');
            } else {
                alert('No game progress to save');
            }
        });
    });

    loadSlotsButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const slot = this.getAttribute('data-slot');
            const saveData = localStorage.getItem(`gameProgress_slot${slot}`);
            if (saveData) {
                localStorage.setItem('gameProgress', saveData);
                sessionStorage.setItem('loadingFromSlot', 'true');
                location.reload();
            } else {
                alert('This slot is empty');
            }
        });
    });

    gameMenuBtn?.addEventListener('click', function() {
        gameMenuPanel.classList.toggle('hidden');
        gameSettingsPanel?.classList.add('hidden');
        saveContainers?.classList.add('hidden');
        loadContainers?.classList.add('hidden');
    });

    closeMenuBtn?.addEventListener('click', function() {
        gameMenuPanel.classList.add('hidden');
    });

    document.addEventListener('click', function(event) {
        if (gameMenuPanel.classList.contains('hidden')) return;
        if (!gameMenuBtn.contains(event.target) && 
            !gameMenuPanel.contains(event.target)) {
            gameMenuPanel.classList.add('hidden');
        }
    });

    settingsGameBtn?.addEventListener('click', function() {
        gameSettingsPanel?.classList.toggle('hidden');
        saveContainers?.classList.add('hidden');
        loadContainers?.classList.add('hidden');
    });

    closeSettingsGameBtn?.addEventListener('click', function() {
        gameSettingsPanel?.classList.add('hidden');
    });

    fontSizeSliderGame?.addEventListener('input', function() {
        const size = this.value;
        fontSizeValueGame.textContent = size + 'px';
        document.documentElement.style.setProperty('--game-font-size', size + 'px');
        localStorage.setItem('fontSize', size);
        fontSizeSlider.value = size;
    });

    const savedFontSize = localStorage.getItem('fontSize') || '18';
    if (fontSizeSliderGame) {
        fontSizeSliderGame.value = savedFontSize;
        fontSizeValueGame.textContent = savedFontSize + 'px';
    }

    const currentLang = localStorage.getItem('lang') || 'en';
    langBtnsGame.forEach(btn => {
        if (btn.getAttribute('data-lang') === currentLang) {
            btn.classList.add('active');
        }
        btn.addEventListener('click', function() {
            const lang = this.getAttribute('data-lang');
            localStorage.setItem('lang', lang);
            
            langBtnsGame.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            langBtns.forEach(b => b.classList.remove('active'));
            document.querySelector(`.lang-btn[data-lang="${lang}"]`)?.classList.add('active');
            
            const event = new CustomEvent('languageChanged', { detail: { lang } });
            window.dispatchEvent(event);
        });
    });

    // Keep in-game and title language buttons synchronized when language changes elsewhere
    window.addEventListener('languageChanged', (e) => {
        try {
            const lang = e?.detail?.lang || localStorage.getItem('lang') || 'en';
            // Update in-game language buttons
            langBtnsGame.forEach(b => {
                if (b.getAttribute('data-lang') === lang) b.classList.add('active'); else b.classList.remove('active');
            });
            // Update title screen language buttons (same document)
            const titleLangBtns = document.querySelectorAll('.lang-btn');
            titleLangBtns.forEach(b => {
                if (b.getAttribute('data-lang') === lang) b.classList.add('active'); else b.classList.remove('active');
            });
        } catch (err) {
            console.error('Error synchronizing language buttons:', err);
        }
    });

    if (exitToMenuBtn) {
        exitToMenuBtn.addEventListener('click', function() {
            // Save current scene before leaving so Continue can restore correctly
            try {
                const current = getCurrentSceneName();
                if (current) saveCurrentScene(current);
            } catch (e) {
                console.warn('Failed to autosave before exiting to menu:', e);
            }
            gameMenuPanel.classList.add('hidden');
            gameSettingsPanel?.classList.add('hidden');
            saveContainers?.classList.add('hidden');
            loadContainers?.classList.add('hidden');

            titleScreen.classList.remove('hidden');
            gameContainer.style.opacity = '0';
            gameContainer.style.visibility = 'hidden';
            gameContainer.style.pointerEvents = 'none';

            try { window.postMessage({ type: 'exitToMenu' }, '*'); } catch (e) {}
        });
    }

    // In-game delete buttons
    const inGameDeleteBtns = document.querySelectorAll('.delete-slot-btn-in-game');
    inGameDeleteBtns.forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            const slot = this.getAttribute('data-slot');
            if (!slot) return;
            const ok = await showConfirm('Delete save in slot ' + slot + '?');
            if (!ok) return;
            localStorage.removeItem(`gameProgress_slot${slot}`);
            updateSlotDisplays('save');
            updateSlotDisplays('load');
        }, { passive: false });
    });
   
}
