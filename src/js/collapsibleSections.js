function createSectionToggle(contentId, wrapperId) {
    return function toggle() {
        const content = document.getElementById(contentId);
        const wrapper = document.getElementById(wrapperId);
        const header = wrapper.querySelector('.card-header');
        const chevron = header ? header.querySelector('.chevron') : null;
        
        if (content.classList.contains('hidden')) {
            content.classList.remove('hidden');
            wrapper.classList.add('expanded');
        } else {
            content.classList.add('hidden');
            wrapper.classList.remove('expanded');
        }
    };
}

window.createSectionToggle = createSectionToggle;
