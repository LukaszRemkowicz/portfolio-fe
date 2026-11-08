// Deterministic mock Django backend (zero deps). Run: node e2e/mock-backend/server.mjs
import http from 'node:http';

const PORT = Number(process.env.MOCK_BACKEND_PORT || 8765);
// Mutable at runtime via POST /__mock/flags {"off":[...]}; env is the initial value.
let flagsOff = (process.env.MOCK_FLAGS_OFF || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// 1x1 PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

const t = (lang, pl, en) => (lang === 'pl' ? pl : en);
const img = (url, w = 1200, h = 800) => ({
  url,
  width: w,
  height: h,
  mime_type: 'image/webp',
});
// Mixed URL styles: relative /media, absolute secure serve, absolute /media.
const mediaUrls = {
  'orion-nebula': '/media/astro/orion.webp',
  'andromeda-galaxy':
    'http://be:8000/v1/images/andromeda-galaxy/serve/?s=x&e=y',
  'milky-way-arch': 'http://be:8000/media/astro/milkyway.webp',
};
const withMedia = url => ({
  fallback_image: img(url),
  variants: { gallery: [img(url, 600, 400), img(url, 1200, 800)] },
});
// Gallery cards use `thumbnail` variants (320w/560w) with a 560x373 fallback.
const withThumbs = slug => ({
  fallback_image: img(`/media/astro/${slug}/thumbnail-560.webp`, 560, 373),
  variants: {
    thumbnail: [
      img(`/media/astro/${slug}/thumbnail-320.webp`, 320, 213),
      img(`/media/astro/${slug}/thumbnail-560.webp`, 560, 373),
    ],
    gallery: [img(mediaUrls[slug], 600, 400), img(mediaUrls[slug], 1200, 800)],
  },
});
const tagSrc = {
  'orion-nebula': [
    ['Deep Sky', 'deep-sky'],
    ['Nebula', 'nebula'],
  ],
  'andromeda-galaxy': [
    ['Deep Sky', 'deep-sky'],
    ['Galaxy', 'galaxy'],
  ],
  'milky-way-arch': [
    ['Red Sprites', 'red-sprites'],
    ['Milky Way', 'milky-way'],
    ['Astrolandscape', 'astrolandscape'],
    ['Airglow', 'airglow'],
  ],
};

const astroSrc = [
  [
    'orion-nebula',
    'Mgławica Oriona',
    'Orion Nebula',
    'Opis mgławicy Oriona',
    'Description of the Orion Nebula',
    '2024-01-15',
  ],
  [
    'andromeda-galaxy',
    'Galaktyka Andromedy',
    'Andromeda Galaxy',
    'Opis galaktyki Andromedy',
    'Description of the Andromeda Galaxy',
    '2024-02-20',
  ],
  [
    'milky-way-arch',
    'Łuk Drogi Mlecznej i czerwone elfy nad Geroldsee',
    'The Milky Way and Red Sprites over Geroldsee (Wagenbrüchsee)',
    'Opis łuku Drogi Mlecznej',
    'Description of the Milky Way Arch',
    '2024-03-25',
  ],
];
const astro = (lang, [slug, npl, nen, dpl, den, date], i) => ({
  pk: `img-${i + 1}`,
  slug,
  url: mediaUrls[slug],
  ...withThumbs(slug),
  tags: tagSrc[slug].map(([name, s]) => ({ name, slug: s, count: 1 })),
  name: t(lang, npl, nen),
  description: t(lang, dpl, den),
  created_at: `${date}T20:00:00Z`,
  capture_date: date,
  place: {
    id: 1,
    name: t(lang, 'Bieszczady', 'Bieszczady Mountains'),
    country: 'PL',
  },
  telescope: ['Sky-Watcher 72ED'],
  camera: ['ZWO ASI294MC'],
  exposure_details: '60 x 120s',
  celestial_object: slug,
  astrobin_url: `https://www.astrobin.com/${slug}/`,
});

const travel = lang => ({
  pk: 1,
  place: { id: 1, name: t(lang, 'Kraków', 'Krakow'), country: 'PL' },
  place_slug: 'krakow',
  country_slug: 'poland',
  date_slug: '2024-05-10',
  highlight_name: t(lang, 'Wyprawa do Krakowa', 'Krakow Trip'),
  highlight_title: t(lang, 'Tydzień w Krakowie', 'A Week in Krakow'),
  full_location: t(lang, 'Kraków, Polska', 'Krakow, Poland'),
  story_preview: t(
    lang,
    'Krótki opis podróży do Krakowa',
    'Short preview of the Krakow trip'
  ),
  adventure_date: t(lang, '10 maja 2024', 'May 10, 2024'),
  adventure_date_raw: '2024-05-10',
  background_image: '/media/travel/krakow-bg.webp',
  created_at: '2024-05-11T10:00:00Z',
  images: astroSrc.slice(0, 2).map((s, i) => astro(lang, s, i)),
});
const travelDetail = lang => {
  const {
    pk,
    place,
    place_slug,
    country_slug,
    date_slug,
    story_preview,
    adventure_date_raw,
    created_at,
    ...d
  } = travel(lang);
  return {
    ...d,
    story: t(
      lang,
      'Pełna historia podróży do Krakowa.',
      'Full story of the Krakow trip.'
    ),
  };
};

const profile = lang => ({
  first_name: 'Jan',
  last_name: 'Testowy',
  short_description: t(
    lang,
    'Łowca nieba i krajobrazów',
    'Sky and landscape hunter'
  ),
  bio: t(lang, 'Biogram po polsku', 'Bio in English'),
  contact_email: 'jan@example.com',
  avatar: withMedia('/media/profile/avatar.webp'),
  about_me_image: withMedia('http://be:8000/media/profile/about.webp'),
  about_me_image2: null,
  profiles: [
    {
      type: 'ASTRO',
      is_active: true,
      title: 'Astro',
      specific_bio: t(lang, 'Astro bio PL', 'Astro bio EN'),
      astrobin_url: 'https://www.astrobin.com/users/test/',
    },
    {
      type: 'PROGRAMMING',
      is_active: true,
      title: 'Dev',
      specific_bio: t(lang, 'Dev bio PL', 'Dev bio EN'),
      github_url: 'https://github.com/test',
    },
  ],
});

const settings = () => {
  const s = {
    programming: true,
    shop: true,
    contactForm: true,
    lastimages: true,
    travelHighlights: true,
    meteors: null,
    total_time_spent: 12345,
  };
  for (const f of flagsOff) s[f] = false;
  return s;
};

const shop = lang => ({
  title: t(lang, 'Sklep testowy', 'Test Shop'),
  description: t(lang, 'Opis sklepu', 'Shop description'),
  ...withMedia('/media/shop/banner.webp'),
  products: [
    {
      id: 'p1',
      title: t(lang, 'Plakat Oriona', 'Orion Poster'),
      description: t(lang, 'Plakat PL', 'Poster EN'),
      external_url: 'https://example.com/p1',
      ...withMedia('/media/shop/p1.webp'),
    },
  ],
});

const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};
const notFound = res => json(res, 404, { detail: 'Not found.' });

function validateContact(b) {
  const e = {};
  const need = (k, min, msg) => {
    const v = b?.[k];
    if (v === undefined || v === null || String(v).trim() === '')
      e[k] = ['This field is required.'];
    else if (min && String(v).trim().length < min) e[k] = [msg];
  };
  need('name', 2, 'Name must be at least 2 characters long.');
  need('email');
  need('subject', 5, 'Subject must be at least 5 characters long.');
  need('message', 10, 'Message must be at least 10 characters long.');
  if (!e.email && !String(b.email).includes('@'))
    e.email = ['Please provide a valid email address.'];
  if (!e.message && String(b.message).trim().length > 5000)
    e.message = ['Message is too long (max 5000 characters).'];
  if (b?.website) e.website = ['Bot detected.'];
  return e;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://mock');
  // Strip CR/LF so request data cannot forge extra log lines.
  console.log(
    `${req.method} ${url.pathname}${url.search}`.replace(/[\r\n]/g, '')
  );
  const p = url.pathname.replace(/\/?$/, '/');
  const lang =
    url.searchParams.get('lang') ||
    (/i18next=(\w+)/.exec(req.headers.cookie || '') || [])[1] ||
    (req.headers['accept-language'] || 'en').slice(0, 2);
  const L = lang === 'pl' ? 'pl' : 'en';

  if (req.method === 'POST' && p === '/__mock/flags/') {
    let raw = '';
    req.on('data', c => (raw += c));
    req.on('end', () => {
      try {
        flagsOff = JSON.parse(raw).off.map(String);
      } catch {
        return json(res, 400, { detail: 'expected {"off": [...]}' });
      }
      return json(res, 200, { off: flagsOff });
    });
    return;
  }
  if (req.method === 'POST' && p === '/v1/contact/') {
    let raw = '';
    req.on('data', c => (raw += c));
    req.on('end', () => {
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return json(res, 400, { detail: 'JSON parse error' });
      }
      const errors = validateContact(body);
      return Object.keys(errors).length
        ? json(res, 400, errors)
        : json(res, 201, {
            id: 1,
            name: body.name,
            email: body.email,
            subject: body.subject,
            message: body.message,
          });
    });
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD')
    return json(res, 405, { detail: `Method "${req.method}" not allowed.` });

  if (p === '/v1/profile/') return json(res, 200, profile(L));
  if (p === '/v1/background/')
    return json(res, 200, withMedia('/media/background.webp'));
  if (p === '/v1/settings/') return json(res, 200, settings());
  if (p === '/v1/categories/')
    return json(res, 200, ['Deep Sky', 'Solar System', 'Landscape']);
  if (p === '/v1/tags/')
    return json(res, 200, [
      { name: t(L, 'Mgławice', 'Nebulae'), slug: 'nebulae', count: 2 },
    ]);
  if (p === '/v1/projects/') return json(res, 200, []);
  if (p === '/v1/shop/products/') return json(res, 200, shop(L));
  if (p === '/v1/travel-highlights/') return json(res, 200, [travel(L)]);
  if (p === '/v1/astroimages/latest/')
    return json(
      res,
      200,
      astroSrc.map((s, i) => astro(L, s, i))
    );
  if (p === '/v1/astroimages/') {
    let all = astroSrc.map((s, i) => astro(L, s, i));
    const tag = url.searchParams.get('tag');
    const cat = url.searchParams.get('filter');
    if (tag)
      all = all.filter(a => a.tags.some(x => x.slug === tag.toLowerCase()));
    if (cat)
      all = all.filter(a =>
        a.tags.some(x => x.name.toLowerCase() === cat.toLowerCase())
      );
    const limit = Number(url.searchParams.get('limit') || 12);
    const page = Number(url.searchParams.get('page') || 1);
    const results = all.slice((page - 1) * limit, page * limit);
    return json(res, 200, {
      count: all.length,
      next: null,
      previous: null,
      results,
    });
  }
  let m = p.match(/^\/v1\/astroimages\/([^/]+)\/$/);
  if (m) {
    const i = astroSrc.findIndex(s => s[0] === m[1]);
    return i < 0 ? notFound(res) : json(res, 200, astro(L, astroSrc[i], i));
  }
  m = p.match(/^\/v1\/travel\/([^/]+)\/([^/]+)\/([^/]+)\/$/);
  if (m)
    return m.slice(1).join('/') === 'poland/krakow/2024-05-10'
      ? json(res, 200, travelDetail(L))
      : notFound(res);

  if (p === '/image-urls/' || p === '/v1/images/') {
    const ids = (url.searchParams.get('ids') || '').split(',').filter(Boolean);
    return json(
      res,
      200,
      Object.fromEntries(
        (ids.length ? ids : Object.keys(mediaUrls))
          .filter(k => mediaUrls[k])
          .map(k => [k, `http://be:8000/v1/images/${k}/serve/?s=x&e=y`])
      )
    );
  }
  m = p.match(/^\/(?:image-urls|v1\/images)\/([^/]+)\/$/);
  if (m && mediaUrls[m[1]])
    return json(res, 200, {
      url: `http://be:8000/v1/images/${m[1]}/serve/?s=x&e=y`,
    });
  m = p.match(/^\/(?:image-files|v1\/images)\/([^/]+)\/serve\/$/);
  if (m) {
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': PNG.length,
    });
    return res.end(PNG);
  }
  if (p.startsWith('/media/')) {
    res.writeHead(200, { 'Content-Type': 'image/png' });
    return res.end(PNG);
  }
  return notFound(res);
});

server.listen(PORT, () =>
  console.log(`mock backend on :${PORT} flagsOff=[${flagsOff}]`)
);
