/**
 * Synopsis Toggle Module
 * Provides expand/collapse functionality for Material Design cards
 * 
 * @module synopsis
 */

/**
 * Creates a toggle function for a synopsis card
 * 
 * @param {string} cardId - ID of the md-card element
 * @param {string} contentId - ID of the collapsible content div  
 * @param {string} chevronId - ID of the chevron icon element
 * @returns {function} Toggle function that can be bound to click events
 */
export function createSynopsisToggle(cardId, contentId, chevronId) {
    return function toggleSynopsis() {
        const card = document.getElementById(cardId);
        const content = document.getElementById(contentId);
        const chevron = document.getElementById(chevronId);
        if (!card || !content || !chevron) {
            console.warn('Synopsis toggle: Missing required elements');
            return;
        }
        
        const isExpanded = content.style.display !== 'none';
        
        if (isExpanded) {
            content.style.display = 'none';
            card.removeAttribute('expanded');
            chevron.textContent = 'expand_more';
        } else {
            content.style.display = 'block';
            card.setAttribute('expanded', '');
            chevron.textContent = 'expand_less';
        }
    };
}

/**
 * Binds a toggle function to a card header element
 * 
 * @param {HTMLElement} headerElement - The clickable header element
 * @param {function} toggleFn - The toggle function to bind
 */
export function bindToggleToHeader(headerElement, toggleFn) {
    headerElement.addEventListener('click', toggleFn);
}
