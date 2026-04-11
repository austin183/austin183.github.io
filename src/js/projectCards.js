/**
 * Project Cards Module
 * Provides description toggle functionality for project cards
 * 
 * @module projectCards
 */

/**
 * Initializes description toggles for all project cards
 */
export function initializeCardDescriptions() {
  const cards = document.querySelectorAll('.project-card');
  
  cards.forEach(card => {
    const description = card.querySelector('.card-description');
    if (!description) return;

    const lineHeight = parseFloat(getComputedStyle(description).lineHeight);
    const maxHeight = lineHeight * 3;

    if (description.scrollHeight > maxHeight) {
      description.classList.add('card-content-hidden');
      
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'toggle-description-btn';
      toggleBtn.textContent = 'Read more';
      toggleBtn.setAttribute('aria-expanded', 'false');

      toggleBtn.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        
        const targetCard = event.target.closest('.project-card');
        if (!targetCard || targetCard !== card) return;
        
        const targetDescription = targetCard.querySelector('.card-description');
        const targetToggleBtn = targetCard.querySelector('.toggle-description-btn');
        
        if (!targetDescription || !targetToggleBtn) return;
        
        const isHidden = targetDescription.classList.contains('card-content-hidden');
        
        if (isHidden) {
          targetDescription.classList.remove('card-content-hidden');
          targetToggleBtn.textContent = 'Show less';
        } else {
          targetDescription.classList.add('card-content-hidden');
          targetToggleBtn.textContent = 'Read more';
        }
      });

      card.appendChild(toggleBtn);
    }
  });
}

// Reinitialize on theme change to recalculate heights if needed
window.addEventListener('theme:change', () => {
  document.querySelectorAll('.toggle-description-btn').forEach(btn => btn.remove());
  initializeCardDescriptions();
});
