document.addEventListener('keydown', (event) => {
    const overlay = document.getElementById('status-overlay');
    const statusText = document.getElementById('status-text');
    const soldToInfo = document.getElementById('sold-to-info');
    const finalTeam = document.getElementById('final-team');
    const currentTeam = document.getElementById('current-team').textContent;

    if (event.key.toLowerCase() === 's') {
        // SOLD
        overlay.classList.remove('hidden');
        overlay.classList.remove('unsold');
        overlay.classList.add('sold');
        statusText.textContent = 'SOLD';
        soldToInfo.classList.remove('hidden');

        // Extract a short team code/name
        const teamParts = currentTeam.split(' ');
        finalTeam.textContent = teamParts.map(word => word[0]).join('').toUpperCase();

        console.log('Player SOLD to:', currentTeam);
    } else if (event.key.toLowerCase() === 'u') {
        // UNSOLD
        overlay.classList.remove('hidden');
        overlay.classList.remove('sold');
        overlay.classList.add('unsold');
        statusText.textContent = 'UNSOLD';
        soldToInfo.classList.add('hidden');

        console.log('Player UNSOLD');
    } else if (event.key === 'Escape') {
        // RESET
        overlay.classList.add('hidden');
    }
});

// overlay to hiding 
document.getElementById('status-overlay').addEventListener('click', () => {
    document.getElementById('status-overlay').classList.add('hidden');
});
