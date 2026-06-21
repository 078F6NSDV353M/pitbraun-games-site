async function loadBlock(id, file) {
    const el = document.getElementById(id);
    if (!el) return;

    const res = await fetch(file);
    const html = await res.text();
    el.innerHTML = html;
}

loadBlock("header", "../shared/html/header.html");
loadBlock("footer", "../shared/html/footer.html");