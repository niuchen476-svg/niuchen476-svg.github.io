(() => {
  document.documentElement.classList.add('js');
  const root = document.documentElement;
  const langButton = document.querySelector('#langToggle');
  const themeButton = document.querySelector('#themeToggle');
  const editButton = document.querySelector('.edit-toggle');
  const exportButton = document.querySelector('.export-button');
  const editTools = document.querySelector('.edit-tools');
  const storageBase = `budong-homepage-edits:${location.pathname}`;
  const storageVersion = root.dataset.editVersion || 'v1';
  const storageKey = `${storageBase}:${storageVersion}`;
  let language = localStorage.getItem('bd-language') || 'zh';
  let editing = false;

  function applyTheme(theme) {
    root.dataset.theme = theme;
    localStorage.setItem('bd-theme', theme);
    const themeLabel = themeButton.querySelector('span') || themeButton;
    themeLabel.textContent = theme === 'dark' ? 'LIGHT' : 'DARK';
  }

  function applyLanguage(next) {
    language = next;
    root.lang = next === 'zh' ? 'zh-CN' : 'en';
    localStorage.setItem('bd-language', next);
    langButton.textContent = next === 'zh' ? 'EN' : '中';
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const value = node.dataset[next];
      if (!value) return;
      node.innerHTML = value.replaceAll('\\n', '<br>');
    });
    restoreEdits();
  }

  function loadEdits() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || localStorage.getItem(storageBase) || '{}');
    } catch {
      return {};
    }
  }

  function restoreEdits() {
    const edits = loadEdits();
    document.querySelectorAll('[data-edit-id]').forEach((node) => {
      const keyed = `${language}:${node.dataset.editId}`;
      if (Object.prototype.hasOwnProperty.call(edits, keyed)) node.innerHTML = edits[keyed];
    });
  }

  function saveEdits() {
    const edits = loadEdits();
    document.querySelectorAll('[data-edit-id]').forEach((node) => {
      edits[`${language}:${node.dataset.editId}`] = node.innerHTML;
    });
    localStorage.setItem(storageKey, JSON.stringify(edits));
  }

  function setEditing(next) {
    editing = next;
    document.body.classList.toggle('editing', next);
    editTools.classList.toggle('visible', next);
    editButton.textContent = next ? '保存' : '编辑';
    document.querySelectorAll('[data-edit-id]').forEach((node) => {
      node.contentEditable = next ? 'true' : 'false';
    });
    if (!next) saveEdits();
  }

  async function exportHtml() {
    saveEdits();
    const clone = document.documentElement.cloneNode(true);
    clone.dataset.editVersion = `export-${Date.now()}`;
    clone.querySelector('body').classList.remove('editing');
    clone.querySelectorAll('[contenteditable]').forEach((node) => node.setAttribute('contenteditable', 'false'));
    clone.querySelectorAll('.edit-tools').forEach((node) => node.classList.remove('visible'));
    try {
      const stylesheet = document.querySelector('link[rel="stylesheet"]');
      const sourceScript = document.querySelector('script[src]');
      const [css, js] = await Promise.all([fetch(stylesheet.href).then((r) => r.text()), fetch(sourceScript.src).then((r) => r.text())]);
      clone.querySelector('link[rel="stylesheet"]').remove();
      const style = document.createElement('style');
      style.textContent = css;
      clone.querySelector('head').append(style);
      clone.querySelector('script[src]').remove();
      const script = document.createElement('script');
      script.textContent = js;
      clone.querySelector('body').append(script);
    } catch {
      // External files remain linked if the site is opened without fetch access.
    }
    const blob = new Blob([`<!doctype html>\n${clone.outerHTML}`], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'budong-homepage.html';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const initialTheme = localStorage.getItem('bd-theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  applyTheme(initialTheme);
  applyLanguage(language);
  restoreEdits();
  const observed = document.querySelectorAll('main > section:not(.hero)');
  observed.forEach((node) => node.classList.add('observe'));
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    }), { rootMargin: '0px 0px -10% 0px', threshold: .08 });
    observed.forEach((node) => observer.observe(node));
  } else observed.forEach((node) => node.classList.add('in-view'));
  themeButton.addEventListener('click', () => applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));
  langButton.addEventListener('click', () => applyLanguage(language === 'zh' ? 'en' : 'zh'));
  editButton.addEventListener('click', () => setEditing(!editing));
  exportButton.addEventListener('click', exportHtml);
  document.addEventListener('keydown', (event) => {
    const insideEditable = event.target.closest?.('[contenteditable="true"]');
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault(); saveEdits();
    } else if (!insideEditable && event.key.toLowerCase() === 'e') {
      setEditing(!editing);
    }
  });
})();
