import { FilterXSS, escapeHtml, escapeAttrValue, friendlyAttrValue } from 'xss';

const BLOCK_TAG =
  /<\/?(?:p|div|br|hr|li|ul|ol|dl|dt|dd|h[1-6]|blockquote|pre|table|thead|tbody|tfoot|tr|td|th|caption|figure|figcaption|section|article|header|footer|aside|nav|main)\b[^>]*>/gi;
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

const decodeEntities = (text: string): string =>
  text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] !== '#') return NAMED_ENTITIES[code.toLowerCase()] ?? entity;
    const point = parseInt(
      code.slice(code[1] === 'x' || code[1] === 'X' ? 2 : 1),
      code[1] === 'x' || code[1] === 'X' ? 16 : 10
    );
    return point > 0 && point <= 0x10ffff
      ? String.fromCodePoint(point)
      : entity;
  });

/**
 * Plain text from HTML for card descriptions, meta tags, and SEO.
 * Pure string logic (no DOM) so SSR and hydration produce identical text:
 * block tags become spaces, inline tags vanish, whitespace collapses.
 */
export const stripHtml = (html: string): string => {
  if (!html) return '';

  return decodeEntities(html.replace(BLOCK_TAG, ' ').replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Trim plain-text SEO copy to a stable snippet length without aggressively
 * cutting mid-word when there is a nearby whitespace boundary.
 */
export const truncateText = (text: string, maxLength: number): string => {
  const normalized = text.trim().replace(/\s+/g, ' ');

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const boundary = normalized.lastIndexOf(' ', maxLength - 1);
  const truncated =
    boundary >= Math.floor(maxLength * 0.6)
      ? normalized.slice(0, boundary)
      : normalized.slice(0, maxLength);

  return `${truncated.trim()}...`;
};

/**
 * Standardizes a string into a slug (lowercase, hyphenated).
 */
export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
};

// Sanitizer: js-xss is pure JS (no DOM), so server (Workers) and browser produce
// identical output. Backend rich text (CKEditor 5 + LLM translations) is NOT
// sanitized upstream, so this whitelist is the trust boundary.
const CLASS_STYLE = ['class', 'style'];
const SANITIZE_WHITELIST: Record<string, string[]> = {
  ...Object.fromEntries(
    [
      'p',
      'div',
      'span',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'blockquote',
      'pre',
      'code',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'strike',
      'del',
      'ins',
      'sub',
      'sup',
      'mark',
      'small',
      'ul',
      'li',
      'figure',
      'figcaption',
      'table',
      'thead',
      'tbody',
      'tfoot',
      'tr',
      'caption',
      'colgroup',
      'col',
      'dl',
      'dt',
      'dd',
      'label',
    ].map(tag => [tag, CLASS_STYLE])
  ),
  br: [],
  hr: CLASS_STYLE,
  ol: [...CLASS_STYLE, 'start', 'type', 'reversed'],
  a: [...CLASS_STYLE, 'href', 'title', 'rel'],
  img: [
    ...CLASS_STYLE,
    'src',
    'srcset',
    'sizes',
    'alt',
    'title',
    'width',
    'height',
    'loading',
  ],
  th: [...CLASS_STYLE, 'colspan', 'rowspan', 'scope'],
  td: [...CLASS_STYLE, 'colspan', 'rowspan'],
};

// Elements whose content is dropped too (everything else unknown keeps its text).
const SANITIZE_STRIP_BODY = new Set([
  'script',
  'style',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'applet',
  'svg',
  'math',
  'noscript',
  'noembed',
  'noframes',
  'template',
  'textarea',
  'title',
  'xmp',
  'plaintext',
  'select',
  'form',
  'button',
  'head',
]);

const SAFE_STYLE_PROPERTY =
  /^(?:text-align|color|font-weight|font-style|font-size|font-family|line-height|text-decoration|vertical-align|width|height|min-width|max-width|aspect-ratio|float|list-style-type|(?:margin|padding|border)(?:-[a-z]+)*)$/;
const UNSAFE_STYLE_VALUE =
  /url\s*\(|expression|javascript|vbscript|@import|behavior|binding|\\|[<>]/i;
const SAFE_INLINE_IMAGE = /^data:image\/(?:png|gif|jpe?g|webp|avif)[;,]/;
const SCHEME_NAME = /^[a-z][a-z0-9+.-]*$/;
const SAFE_SCHEMES = new Set(['http', 'https', 'mailto', 'tel']);

/** Keep only whitelisted declarations, as written (DOMPurify parity). */
function filterStyle(value: string): string {
  return friendlyAttrValue(value)
    .split(';')
    .map(declaration => declaration.trim())
    .filter(declaration => {
      const separator = declaration.indexOf(':');
      return (
        separator > 0 &&
        SAFE_STYLE_PROPERTY.test(
          declaration.slice(0, separator).trim().toLowerCase()
        ) &&
        !UNSAFE_STYLE_VALUE.test(declaration.slice(separator + 1))
      );
    })
    .join('; ');
}

/** http(s)/mailto/tel, relative URLs, and data:image on <img src> only. */
function isSafeUrl(tag: string, name: string, raw: string): boolean {
  // Decode entities/control chars like a browser would, then drop whitespace.
  const value = friendlyAttrValue(raw).replace(/\s+/g, '').toLowerCase();
  // Named entities (&Tab;) are not decoded above, so anything before the first
  // ':' that is not a plain known scheme is rejected, not treated as relative.
  const end = value.search(/[:/?#]/);
  if (end < 0 || value[end] !== ':') return true;
  const scheme = value.slice(0, end);
  if (!SCHEME_NAME.test(scheme)) return false;
  if (scheme === 'data') {
    return tag === 'img' && name === 'src' && SAFE_INLINE_IMAGE.test(value);
  }
  return SAFE_SCHEMES.has(scheme);
}

function sanitizeAttr(
  tag: string,
  name: string,
  value: string
): string | undefined {
  if (value === '') return `${name}=""`;
  if (name === 'style') {
    const style = filterStyle(value);
    return style ? `style="${escapeAttrValue(style)}"` : '';
  }
  if (name === 'href' || name === 'src' || name === 'srcset') {
    const urls =
      name === 'srcset'
        ? value.split(',').map(candidate => candidate.trim().split(/\s+/)[0])
        : [value];
    if (
      !urls.every(url => isSafeUrl(tag, name === 'srcset' ? 'src' : name, url))
    ) {
      return '';
    }
    return `${name}="${escapeAttrValue(friendlyAttrValue(value))}"`;
  }
  return undefined;
}

/** Fresh filter per call: it tracks "inside a body-stripped element" state. */
function createHtmlFilter(): FilterXSS {
  let skipTag = '';
  let depth = 0;

  return new FilterXSS({
    whiteList: SANITIZE_WHITELIST,
    onTag: (_tag, _html, info) => (skipTag && info.isWhite ? '' : undefined),
    onIgnoreTag(tag, _html, info) {
      if (SANITIZE_STRIP_BODY.has(tag)) {
        if (info.isClosing) {
          if (tag === skipTag && --depth === 0) skipTag = '';
        } else if (!skipTag) {
          skipTag = tag;
          depth = 1;
        } else if (tag === skipTag) {
          depth++;
        }
      }
      return '';
    },
    escapeHtml: text => (skipTag ? '' : escapeHtml(text)),
    onIgnoreTagAttr: () => '',
    onTagAttr: (tag, name, value, isWhiteAttr) =>
      isWhiteAttr ? sanitizeAttr(tag, name, value) : '',
  });
}

/**
 * Sanitize backend HTML before rendering with dangerouslySetInnerHTML.
 * Same output on server and client.
 */
export const sanitizeHtml = (html: string): string => {
  if (!html) return '';

  // Void elements: xss may emit ` />`; DOM serialization (previous impl) did not.
  return createHtmlFilter().process(html).replace(/ \/>/g, '>');
};

/**
 * Returns true when an HTML string is visually empty —
 * i.e. contains no meaningful text after stripping tags and common entities.
 * Catches CKEditor empty states like "<p></p>" or "<p>&nbsp;</p>".
 */
export const isHtmlEmpty = (html: string | undefined | null): boolean => {
  if (!html) return true;
  const text = stripHtml(html)
    .replace(/\u00a0/g, '')
    .trim();
  return text.length === 0;
};
