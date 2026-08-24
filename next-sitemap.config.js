/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://bennyhinn.life',
  generateRobotsTxt: true,
  sitemapSize: 7000,
  // Weekly is honest for a site that publishes on a considered cadence;
  // "daily" on every URL is a low-quality signal to crawlers.
  changefreq: 'weekly',
  priority: 0.7,
  exclude: ['/api/*'],
  transform: async (config, path) => {
    let priority = 0.7;
    if (path === '/') priority = 1.0;
    else if (path === '/blog') priority = 0.9;
    else if (path.startsWith('/blog/')) priority = 0.8;
    else if (path === '/about' || path === '/contact') priority = 0.6;
    else if (path === '/privacy-policy' || path === '/terms') priority = 0.3;

    return {
      loc: path,
      changefreq: path.startsWith('/blog') ? 'weekly' : 'monthly',
      priority,
      lastmod: new Date().toISOString(),
    };
  },
  robotsTxtOptions: {
    policies: [
      { userAgent: '*', allow: '/', disallow: ['/api/'] },
      { userAgent: 'Mediapartners-Google', allow: '/' },
      { userAgent: 'AdsBot-Google', allow: '/' },
    ],
  },
};
