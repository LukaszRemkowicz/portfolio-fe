import { stripHtml, slugify, sanitizeHtml } from '../../utils/html';

describe('HTML Utils', () => {
  describe('stripHtml', () => {
    it('removes HTML tags', () => {
      expect(stripHtml('<p>Hello</p>')).toBe('Hello');
    });

    it('handles nested tags', () => {
      expect(stripHtml('<div><p>Hello <b>World</b></p></div>')).toBe(
        'Hello World'
      );
    });

    it('spaces block boundaries but not inline tags (same on server and client)', () => {
      expect(
        stripHtml(
          '<p>at <strong>Castillo de Zafra</strong>, which</p><p>time. 🌠</p><p>The<br>end</p>'
        )
      ).toBe('at Castillo de Zafra, which time. 🌠 The end');
    });

    it('decodes common and numeric entities, keeps unknown ones', () => {
      expect(
        stripHtml(
          '<p>A&nbsp;&amp;&nbsp;B &#39;x&#x27; &#x1F320; &lt;3 &foo;</p>'
        )
      ).toBe("A & B 'x' 🌠 <3 &foo;");
    });

    it('leaves no tag behind from nested or broken markup', () => {
      const out = stripHtml(
        '<<b>script>alert(1)<</b>/script><img src=x onerror=a'
      );
      expect(out).not.toContain('<');
      expect(out).toBe('script>alert(1)/script>img src=x onerror=a');
    });

    it('does not depend on DOMParser (SSR parity)', () => {
      const original = globalThis.DOMParser;
      const html =
        '<div><p>Hi <em>there</em></p><ul><li>a</li><li>b</li></ul></div>';
      const withDom = stripHtml(html);
      // @ts-expect-error - simulate the Workers runtime
      delete globalThis.DOMParser;
      try {
        expect(stripHtml(html)).toBe(withDom);
      } finally {
        globalThis.DOMParser = original;
      }
    });

    it('returns empty string for null/undefined/empty input', () => {
      expect(stripHtml('')).toBe('');
      // @ts-expect-error - Testing runtime null handling
      expect(stripHtml(null)).toBe('');
    });
  });

  describe('slugify', () => {
    it('converts to lowercase', () => {
      expect(slugify('Hello')).toBe('hello');
    });

    it('replaces spaces with dashes', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('removes special characters', () => {
      expect(slugify('Hello! @World#')).toBe('hello-world');
    });

    it('handles multiple spaces and dashes', () => {
      expect(slugify('Hello   World--Test')).toBe('hello-world-test');
    });
  });

  describe('sanitizeHtml', () => {
    it('preserves safe HTML', () => {
      expect(sanitizeHtml('<p>Hello</p>')).toBe('<p>Hello</p>');
    });

    it('removes script tags (XSS prevention)', () => {
      const input = '<script>alert("xss")</script>Hello';
      expect(sanitizeHtml(input)).toBe('Hello');
    });

    it('removes event attributes (XSS prevention)', () => {
      const input = '<img src=x onerror=alert(1) />';
      expect(sanitizeHtml(input)).toBe('<img src="x">');
    });

    it('removes background styles from backend rich text while preserving other formatting', () => {
      const input =
        '<p><span style="background-color: #ccc; color: #111;">Hello</span></p>';
      expect(sanitizeHtml(input)).toBe(
        '<p><span style="color: #111">Hello</span></p>'
      );
    });

    it('returns empty string for empty input', () => {
      expect(sanitizeHtml('')).toBe('');
    });
  });
});
