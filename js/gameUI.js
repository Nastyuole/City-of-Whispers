// UI utilities for dialogs and confirmations
export function showConfirm(message) {
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
        
        function onKey(e) { 
            if (e.key === 'Escape') { 
                cleanup(); 
                resolve(false); 
                document.removeEventListener('keydown', onKey); 
            } 
        }
        document.addEventListener('keydown', onKey);
    });
}
