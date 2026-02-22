// Title screen menu handler
import { showConfirm } from './gameUI.js';
import { showScene, showParallelScene } from './gameScenes.js';
import { loadGameScenes, getCurrentLanguage, getParentParallelScene } from './gameState.js';

export function setupTitleScreenMenu() {
    const newGameBtn = document.getElementById('new-game-btn');
    const loadGameBtn = document.getElementById('load-game-btn');
    const loadStartBtn = document.getElementById('load-start-btn');
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

    function hasAnySave() {
        if (localStorage.getItem('gameProgress')) return true;
        for (let i = 1; i <= 3; i++) {
            if (localStorage.getItem(`gameProgress_slot${i}`)) return true;
        }
        return false;
    }

    function updateTitleScreenSlots() {
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

    updateTitleScreenSlots();


    settingsBtn.addEventListener('click', function() {
        menuContainer.classList.add('hidden');
        settingsContainer.classList.add('active');
    });

    backBtn.addEventListener('click', function() {
        menuContainer.classList.remove('hidden');
        settingsContainer.classList.remove('active');
    });

    exitBtn.addEventListener('click', function() {
        window.parent.postMessage({ type: 'closeGameFrame' }, '*');
    });

    loadGameBtn.addEventListener('click', function() {
        menuContainer.classList.add('hidden');
        loadGameContainer.classList.add('active');
        updateTitleScreenSlots();
    });

    loadGameSlotsButtons.forEach(btn => {
        btn.addEventListener('click', function() {
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

    // Title screen delete buttons
    const titleDeleteButtons = document.querySelectorAll('.delete-slot-btn');
    titleDeleteButtons.forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            const slot = this.getAttribute('data-slot');
            if (!slot) return;
            const ok = await showConfirm('Delete save in slot ' + slot + '?');
            if (!ok) return;
            localStorage.removeItem(`gameProgress_slot${slot}`);
            updateTitleScreenSlots();
        }, { passive: false });
    });

    loadBackBtn.addEventListener('click', function() {
        menuContainer.classList.remove('hidden');
        loadGameContainer.classList.remove('active');
    });

    langBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const lang = this.getAttribute('data-lang');
            localStorage.setItem('lang', lang);
            
            langBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const event = new CustomEvent('languageChanged', { detail: { lang } });
            window.dispatchEvent(event);
        });
    });

    fontSizeSlider.addEventListener('input', function() {
        const size = this.value;
        fontSizeValue.textContent = size + 'px';
        document.documentElement.style.setProperty('--game-font-size', size + 'px');
        localStorage.setItem('fontSize', size);
    });

    const savedFontSize = localStorage.getItem('fontSize') || '18';
    fontSizeSlider.value = savedFontSize;
    fontSizeValue.textContent = savedFontSize + 'px';
    document.documentElement.style.setProperty('--game-font-size', savedFontSize + 'px');

    const currentLang = localStorage.getItem('lang') || 'en';
    langBtns.forEach(btn => {
        if (btn.getAttribute('data-lang') === currentLang) {
            btn.classList.add('active');
        }
    });

    // Continue (resume) button - load saved game if available, otherwise start new
    newGameBtn.addEventListener('click', function() {
        const saved = localStorage.getItem('gameProgress');
        menuContainer.classList.remove('hidden');
        loadGameContainer.classList.remove('active');

        if (!saved) {
            // No save: behave like New Game (play intro then start)
            titleScreen.classList.add('hidden');
            videoScreen.classList.remove('hidden');
            video.currentTime = 0;
            video.play();

            video.onended = async () => {
                videoScreen.classList.add('hidden');
                gameContainer.style.opacity = '1';
                gameContainer.style.visibility = 'visible';
                gameContainer.style.pointerEvents = 'auto';
                try {
                    await loadGameScenes(getCurrentLanguage());
                    showScene('start');
                } catch (e) {
                    console.warn('Failed to show start scene:', e);
                }
            };
            return;
        }

        // Resume saved game
        titleScreen.classList.add('hidden');
        gameContainer.style.opacity = '1';
        gameContainer.style.visibility = 'visible';
        gameContainer.style.pointerEvents = 'auto';

        (async () => {
            try {
                const sceneToShow = await loadGameScenes(getCurrentLanguage());
                if (sceneToShow) {
                    const parent = getParentParallelScene();
                    if (parent && typeof parent === 'string') {
                        showParallelScene(sceneToShow, parent);
                    } else {
                        showScene(sceneToShow);
                    }
                }
            } catch (e) {
                console.error('Failed to resume saved game:', e);
            }
        })();
    });

    // Start new game from the 'start' scene with same intro animation
    loadStartBtn.addEventListener('click', function() {
        localStorage.removeItem('gameProgress');
        menuContainer.classList.remove('hidden');
        loadGameContainer.classList.remove('active');
        titleScreen.classList.add('hidden');
        videoScreen.classList.remove('hidden');
        video.currentTime = 0;
        video.play();

        video.onended = async () => {
            videoScreen.classList.add('hidden');
            gameContainer.style.opacity = '1';
            gameContainer.style.visibility = 'visible';
            gameContainer.style.pointerEvents = 'auto';
            try {
                await loadGameScenes(getCurrentLanguage());
                showScene('start');
            } catch (e) {
                console.warn('Failed to show start scene:', e);
            }
        };
    });

    const isLoadingFromSlot = sessionStorage.getItem('loadingFromSlot');
    if (isLoadingFromSlot) {
        sessionStorage.removeItem('loadingFromSlot');
        const savedGameData = localStorage.getItem('gameProgress');
        if (savedGameData) {
            titleScreen.classList.add('hidden');
            gameContainer.style.opacity = '1';
            gameContainer.style.visibility = 'visible';
            gameContainer.style.pointerEvents = 'auto';
            
        }
    }
}

export function setupGameMenuListeners() {
    // This will be defined in gameMenu.js
    if (typeof window.setupGameMenuListeners === 'function') {
        window.setupGameMenuListeners();
    }
}
