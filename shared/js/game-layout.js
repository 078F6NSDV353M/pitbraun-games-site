async function loadGameLayout() {
  const headerHost = document.getElementById('gameHeader');
  const footerHost = document.getElementById('gameFooter');

  if (headerHost) {
    const response = await fetch('/shared/html/game-header.html');
    headerHost.innerHTML = await response.text();
  }

  if (footerHost) {
    const response = await fetch('/shared/html/game-footer.html');
    footerHost.innerHTML = await response.text();
  }
}

loadGameLayout();