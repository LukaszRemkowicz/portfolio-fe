import { sanitizeHtml } from '../utils/html';

// Expected strings were generated once with the previous DOMPurify-based
// implementation (jest/jsdom) and hard-coded here to pin parity.
// Intentional differences vs DOMPurify (js-xss does no DOM tree repair):
//  - unbalanced/malformed markup is not re-balanced;
//  - `target` is dropped (as before), `data-*`/`aria-*`/`id` are dropped;
//  - only whitelisted CSS properties survive in `style` (DOMPurify kept all);
//  - `<input>`/`<form>`/`<button>` (CKEditor todo lists) are removed;
//  - inline svg/math and data: URLs other than raster data:image are removed.
const CKEDITOR_PARITY: Array<[string, string]> = [
  [
    '<p>Hello <strong>world</strong> and <i>italic</i>, <u>under</u>, <s>strike</s>.</p>',
    '<p>Hello <strong>world</strong> and <i>italic</i>, <u>under</u>, <s>strike</s>.</p>',
  ],
  [
    '<h2>Title</h2><h3>Sub</h3><p>Text with<br>break and &amp; ampersand &lt;tag&gt; &nbsp;nbsp</p>',
    '<h2>Title</h2><h3>Sub</h3><p>Text with<br>break and &amp; ampersand &lt;tag&gt; &nbsp;nbsp</p>',
  ],
  [
    '<ul><li>One</li><li>Two <a href="https://example.com/x?a=1&amp;b=2" target="_blank" rel="noopener" title="T">link</a></li></ul><ol><li>A</li><li>B</li></ol>',
    '<ul><li>One</li><li>Two <a href="https://example.com/x?a=1&amp;b=2" rel="noopener" title="T">link</a></li></ul><ol><li>A</li><li>B</li></ol>',
  ],
  [
    '<blockquote><p>Quote</p></blockquote><hr><p>after</p>',
    '<blockquote><p>Quote</p></blockquote><hr><p>after</p>',
  ],
  [
    '<figure class="image image-style-side"><img src="/media/astro/orion.webp" alt="Orion" width="800" height="600"><figcaption>Caption</figcaption></figure>',
    '<figure class="image image-style-side"><img src="/media/astro/orion.webp" alt="Orion" width="800" height="600"><figcaption>Caption</figcaption></figure>',
  ],
  [
    '<figure class="image"><img style="aspect-ratio:1920/1080;" src="https://cdn.example.com/a.jpg" srcset="https://cdn.example.com/a-400.jpg 400w, https://cdn.example.com/a-800.jpg 800w" sizes="100vw" width="1920" height="1080"></figure>',
    '<figure class="image"><img style="aspect-ratio:1920/1080" src="https://cdn.example.com/a.jpg" srcset="https://cdn.example.com/a-400.jpg 400w, https://cdn.example.com/a-800.jpg 800w" sizes="100vw" width="1920" height="1080"></figure>',
  ],
  [
    '<figure class="table"><table><thead><tr><th>H1</th><th>H2</th></tr></thead><tbody><tr><td colspan="2">cell</td></tr><tr><td>a</td><td>b</td></tr></tbody></table></figure>',
    '<figure class="table"><table><thead><tr><th>H1</th><th>H2</th></tr></thead><tbody><tr><td colspan="2">cell</td></tr><tr><td>a</td><td>b</td></tr></tbody></table></figure>',
  ],
  [
    '<pre><code class="language-plaintext">const x = 1;\nif (a &lt; b) { run(); }</code></pre><p>Inline <code>code</code></p>',
    '<pre><code class="language-plaintext">const x = 1;\nif (a &lt; b) { run(); }</code></pre><p>Inline <code>code</code></p>',
  ],
  [
    '<p><span style="color:hsl(0, 75%, 60%);">red</span> <span style="font-size:1.4em;">big</span> <span style="font-family:Arial, Helvetica, sans-serif;">font</span></p>',
    '<p><span style="color:hsl(0, 75%, 60%)">red</span> <span style="font-size:1.4em">big</span> <span style="font-family:Arial, Helvetica, sans-serif">font</span></p>',
  ],
  [
    '<p style="text-align:center;">centered</p><p style="text-align: right; margin-left: 40px;">right</p>',
    '<p style="text-align:center">centered</p><p style="text-align: right; margin-left: 40px">right</p>',
  ],
  [
    '<p><span style="background-color: #ccc; color: #111;">Hello</span> <span style="background:yellow">bg</span></p>',
    '<p><span style="color: #111">Hello</span> <span>bg</span></p>',
  ],
  [
    '<p><a href="mailto:me@example.com">mail</a> <a href="/relative/path">rel</a> <a href="#anchor">hash</a> <a href="tel:+48123456789">tel</a></p>',
    '<p><a href="mailto:me@example.com">mail</a> <a href="/relative/path">rel</a> <a href="#anchor">hash</a> <a href="tel:+48123456789">tel</a></p>',
  ],
  [
    '<p>Plain text only with unicode: Zażółć gęślą jaźń — “quotes” €</p>',
    '<p>Plain text only with unicode: Zażółć gęślą jaźń — “quotes” €</p>',
  ],
  [
    '<p><img src="data:image/png;base64,iVBORw0KGgo=" alt="inline"></p>',
    '<p><img src="data:image/png;base64,iVBORw0KGgo=" alt="inline"></p>',
  ],
];

describe('sanitizeHtml parity with the previous DOMPurify implementation', () => {
  it.each(CKEDITOR_PARITY)('%s', (input, expected) => {
    expect(sanitizeHtml(input)).toBe(expected);
  });
});

const XSS_VECTORS: string[] = [
  '<script>alert(1)</script>x',
  '<SCRIPT SRC=//evil/x.js></SCRIPT>',
  '<scr<script>ipt>alert(1)</scr</script>ipt>',
  '<img src=x onerror=alert(1)>',
  '<img src="x" ONERROR="alert(1)">',
  '<p onclick="alert(1)">a</p>',
  '<a href="x" onmouseover=alert(1)>a</a>',
  '<a href="javascript:alert(1)">a</a>',
  '<a href="JaVaScRiPt:alert(1)">a</a>',
  '<a href="&#106;avascript:alert(1)">a</a>',
  '<a href="&#x6A;&#x61;vascript:alert(1)">a</a>',
  '<a href="jav&#x09;ascript:alert(1)">a</a>',
  '<a href="java\nscript:alert(1)">a</a>',
  '<a href=" javascript:alert(1)">a</a>',
  '<a href="javascript&colon;alert(1)">a</a>',
  '<a href="vbscript:msgbox(1)">a</a>',
  '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">a</a>',
  '<a href="DATA:text/html,<script>alert(1)</script>">a</a>',
  '<img src="data:text/html,<script>alert(1)</script>">',
  '<img src="data:image/svg+xml;base64,PHN2Zz4=">',
  '<svg><script>alert(1)</script></svg>',
  '<svg onload=alert(1)>',
  '<math><mi xlink:href="javascript:alert(1)">x</mi></math>',
  '<iframe src="https://evil"></iframe>',
  '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
  '<p srcdoc="x">a</p>',
  '<style>body{background:url(javascript:alert(1))}</style>y',
  '<form action="https://evil"><input name=x><button>go</button></form>',
  '<input type="text" value="x">',
  '<p style="width:expression(alert(1))">a</p>',
  '<p style="background:url(javascript:alert(1))">a</p>',
  '<p style="color:red;background-image:url(https://evil/x.png)">a</p>',
  '<p style="position:fixed;top:0;color:red">a</p>',
  '<a href="ftp://example.com/x">a</a>',
  '<object data="x"></object><embed src="x">',
  '<body onload=alert(1)>x',
  '<p>a</p><!-- <script>alert(1)</script> -->',
  '<img src="x" srcset="javascript:alert(1) 1x">',
  '<p title="a&quot; onmouseover=&quot;alert(1)">a</p>',
  '<a href="https://ok.example" target="_blank" rel="x">a</a>',
  '<link rel=stylesheet href=//evil>',
  '<meta http-equiv=refresh content="0;url=javascript:alert(1)">',
  '<base href="//evil/">',
];

describe('sanitizeHtml XSS vectors', () => {
  it.each(XSS_VECTORS)('neutralizes %s', vector => {
    const output = sanitizeHtml(vector).toLowerCase();

    expect(output).not.toMatch(
      /<(script|iframe|svg|math|style|form|input|button|object|embed|link|meta|base)/
    );
    expect(output).not.toMatch(/\son[a-z]+\s*=/);
    expect(output).not.toMatch(
      /javascript:|vbscript:|data:text|srcdoc|expression\(|url\(/
    );
    expect(output).not.toContain('alert(1)</');
  });

  it('removes the body of dangerous elements, keeps surrounding text', () => {
    expect(sanitizeHtml('a<script>alert(1)</script>b<style>x{}</style>c')).toBe(
      'abc'
    );
    expect(sanitizeHtml('a<svg><script>alert(1)</script><p>x</p></svg>b')).toBe(
      'ab'
    );
  });

  it('keeps safe link schemes and relative URLs, drops others', () => {
    expect(sanitizeHtml('<a href="https://a.test/x">a</a>')).toBe(
      '<a href="https://a.test/x">a</a>'
    );
    expect(sanitizeHtml('<a href="mailto:a@b.test">a</a>')).toBe(
      '<a href="mailto:a@b.test">a</a>'
    );
    expect(sanitizeHtml('<a href="ftp://a.test">a</a>')).toBe('<a>a</a>');
    expect(sanitizeHtml('<a href="data:text/html,x">a</a>')).toBe('<a>a</a>');
  });
});
