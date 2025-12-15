const currentLang = localStorage.getItem('lang') || 'en';

function saveLang(lang) {
  localStorage.setItem('lang', lang);
}

// Helper function to get nested values from objects (e.g., 'header.title' from nested object)
function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

async function loadLanguage(lang) {
  try {
    const res = await fetch(`./assets/locales/${lang}/${lang}Translation.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    let translations = await res.json();
    
    // If JSON is wrapped in an array, extract the first object
    if (Array.isArray(translations) && translations.length > 0) {
      translations = translations[0];
    }

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      // Support nested keys like 'header.title' or flat keys like 'title'
      const value = getNestedValue(translations, key);
      if (value) {
        el.textContent = value;
      }
    });
  } catch (err) {
    console.error('Error loading language:', err);
  }
}

document.getElementById('ru').addEventListener('click', () => {
  saveLang('ru');
  loadLanguage('ru');
});

document.getElementById('en').addEventListener('click', () => {
  saveLang('en');
  loadLanguage('en');
});

document.getElementById('bg').addEventListener('click', () => {
  saveLang('bg');
  loadLanguage('bg');
});

console.log('Script loaded');
loadLanguage(currentLang);