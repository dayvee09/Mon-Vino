const { createProxyMiddleware } = require("http-proxy-middleware");

/**
 * Proxies API calls from the React dev server (port 3000) to Apache (:80),
 * so nested paths match a typical production layout (/api-php/...).
 *
 * Legacy /PW2/... is kept for older bookmarks and tooling.
 */
module.exports = function (app) {
  const proxy = createProxyMiddleware({
    target: "http://localhost",
    changeOrigin: true,
  });

  app.use("/api-php", proxy);
  app.use("/PW2/cellier-projet/api-php", proxy);
};
