/**
 * LinkSlash Extension — ENAUNITY bağlantı ayarları
 */
var LINKSLASH_CONFIG = {
  preferredOrigin: 'https://enaunity.com.tr',
  origins: [
    'https://enaunity.com.tr',
    'http://localhost:3333',
    'http://127.0.0.1:3333'
  ],
  loginPath: '/auth/login',
  gatewayPath: '/gateway/linkslash',
  appPath: '/dealer/linkslash'
};

LINKSLASH_CONFIG.getApiBase = function(origin) {
  return origin + '/api/linkslash';
};

LINKSLASH_CONFIG.getLoginUrl = function(origin, redirectPath) {
  var url = origin + this.loginPath;
  if (redirectPath) url += '?redirect=' + encodeURIComponent(redirectPath);
  return url;
};

LINKSLASH_CONFIG.getGatewayUrl = function(origin) {
  return origin + this.gatewayPath;
};
