import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'

// Prevent Google Translate from corrupting React's virtual DOM.
// Google Translate wraps text nodes in <font> elements; when React later tries to
// removeChild its original text node the node is no longer in the tree, throwing
// NotFoundError. Stamping translate="no" on the React root and every Radix UI
// portal container (which render directly into <body>) stops the extension from
// touching them. Material Symbols icons are also guarded so their ligature names
// are not split across <font> tags.
function guardAgainstTranslation() {
  const stamp = (root: Element | Document) => {
    root.querySelectorAll<Element>(
      '.material-symbols-outlined:not([translate]), [data-radix-portal]:not([translate])',
    ).forEach((el) => el.setAttribute('translate', 'no'));
  };

  stamp(document);

  new MutationObserver((mutations) => {
    for (const { addedNodes } of mutations) {
      for (const node of addedNodes) {
        if (!(node instanceof Element)) continue;
        if (!node.hasAttribute('translate')) {
          if (
            node.classList.contains('material-symbols-outlined') ||
            node.hasAttribute('data-radix-portal')
          ) {
            node.setAttribute('translate', 'no');
          }
        }
        stamp(node);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}

guardAgainstTranslation();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
