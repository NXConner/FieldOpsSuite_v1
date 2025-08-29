(function(){
  // In Capacitor environment, open external links with system handler
  function isExternalHref(href){
    return /^https?:\/\//i.test(href);
  }
  function setup(){
    document.addEventListener('click', function(e){
      var t = e.target;
      if (!(t instanceof Element)) return;
      var a = t.closest('a');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (!isExternalHref(href)) return;
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser) {
        e.preventDefault();
        window.Capacitor.Plugins.Browser.open({ url: href });
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();

