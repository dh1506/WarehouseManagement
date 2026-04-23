import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Prevent Google Translate from corrupting Material Symbols icon ligature names.
// Stamps translate="no" on every icon element as React renders it.
function guardMaterialIcons() {
  const stamp = (root: Element | Document) => {
    root.querySelectorAll<Element>('.material-symbols-outlined:not([translate])').forEach((el) => {
      el.setAttribute('translate', 'no');
    });
  };

  stamp(document);

  new MutationObserver((mutations) => {
    for (const { addedNodes } of mutations) {
      for (const node of addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.classList.contains('material-symbols-outlined') && !node.hasAttribute('translate')) {
          node.setAttribute('translate', 'no');
        }
        stamp(node);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}

guardMaterialIcons();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
