module.exports = ({ config }) => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (['preview', 'production'].includes(process.env.EAS_BUILD_PROFILE)) {
    let url;
    try { url = new URL(apiUrl); } catch { throw new Error('APK builds require a public HTTPS EXPO_PUBLIC_API_URL ending in /api.'); }
    const host = url.hostname.toLowerCase();
    const privateHost = /^(localhost|.*\.localhost|.*\.local|127\..*|10\..*|192\.168\..*|169\.254\..*|172\.(1[6-9]|2\d|3[01])\..*|\[.*\])$/.test(host);
    if (url.protocol !== 'https:' || privateHost || url.username || url.password || url.search || url.hash || !url.pathname.replace(/\/$/, '').endsWith('/api')) {
      throw new Error('APK builds require a public HTTPS EXPO_PUBLIC_API_URL ending in /api (no LAN address or credentials).');
    }
  }
  return {
    ...config,
    extra: {
      ...config.extra,
      ...(process.env.EAS_PROJECT_ID ? { eas: { ...config.extra?.eas, projectId: process.env.EAS_PROJECT_ID } } : {}),
    },
    plugins: [
      ...(config.plugins || []),
      ['expo-build-properties', { android: { usesCleartextTraffic: !apiUrl || apiUrl.startsWith('http://') } }],
    ],
  };
};
