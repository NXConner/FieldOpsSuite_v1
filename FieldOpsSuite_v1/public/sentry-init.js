(function(){
  var dsn = window.SENTRY_DSN || (typeof process !== 'undefined' ? process.env.SENTRY_DSN : undefined);
  if (!dsn) return;
  var S = window.Sentry;
  if (!S) return;
  S.init({ dsn: dsn, integrations: [S.browserTracing && new S.browserTracing()], tracesSampleRate: 0.1 });
})();

