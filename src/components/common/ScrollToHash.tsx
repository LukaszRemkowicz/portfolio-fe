import { useEffect } from 'react';
import { useLocation } from 'react-router';

// Scroll position and hashes whose element already exists are handled by
// React Router's <ScrollRestoration>. This only covers anchors that mount late
// (lazy sections, e.g. `#contact`): scroll once when the element appears, give
// up after a short window.
const HASH_WAIT_MS = 1500;

const ScrollToHash = () => {
  const { hash, pathname } = useLocation();

  useEffect(() => {
    if (!hash) return;

    let id = hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      // malformed escape: use the raw fragment
    }
    if (!id || document.getElementById(id)) return;

    const observer = new MutationObserver(() => {
      const element = document.getElementById(id);
      if (!element) return;
      observer.disconnect();
      element.scrollIntoView({ behavior: 'auto', block: 'start' });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const timeout = setTimeout(() => observer.disconnect(), HASH_WAIT_MS);

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, [hash, pathname]);

  return null;
};

export default ScrollToHash;
