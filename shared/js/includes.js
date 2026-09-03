async function loadBlock(id, file) {
    const el = document.getElementById(id);
    if (!el) return;

    try {
        const res = await fetch(file);

        if (!res.ok) {
            throw new Error(
                `Failed to load ${file}: ${res.status}`
            );
        }

        const html = await res.text();
        el.innerHTML = html;
    } catch (error) {
        console.error(error);
    }
}

loadBlock("header", "/shared/html/header.html");
loadBlock("legal-header", "/shared/html/legal-header.html");
loadBlock("footer", "/shared/html/footer.html");