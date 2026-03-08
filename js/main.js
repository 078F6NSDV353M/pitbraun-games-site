async function loadBlock(targetId, filePath) {
  try {
    const response = await fetch(filePath);

    if (!response.ok) {
      throw new Error(`Failed to load ${filePath}: ${response.status}`);
    }

    const html = await response.text();
    document.getElementById(targetId).innerHTML = html;
  } catch (error) {
    console.error(error);
    document.getElementById(targetId).innerHTML =
      `<div style="opacity:.6">Block failed to load: ${filePath}</div>`;
  }
}

async function initPage() {
  await loadBlock("header-block", "blocks/header.html");
  await loadBlock("loader-block", "blocks/loader.html");
  await loadBlock("social-block", "blocks/social.html");
  await loadBlock("footer-block", "blocks/footer.html");
}

initPage();
