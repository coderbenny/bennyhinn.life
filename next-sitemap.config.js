/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://bennyhinn.life', 
  generateRobotsTxt: true,           
  sitemapSize: 7000,
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
      },
      {
        userAgent: 'Mediapartners-Google',
        allow: '/',
      },
    ],
  },
};
