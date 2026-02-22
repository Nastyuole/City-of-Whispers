// Settings and localization handler
export async function loadGameTranslations() {
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

export function setupLocalizationListener() {
    loadGameTranslations();
    window.addEventListener('languageChanged', async (event) => {
        const lang = event.detail?.lang || localStorage.getItem('lang') || 'en';
        localStorage.setItem('lang', lang);
        await loadGameTranslations();
    });
}
