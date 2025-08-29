(function(){
  function post(metric){
    try{ fetch('/api/vitals', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(metric) }); }catch(_){ }
  }
  function ready(){
    if (!window.webVitals) return;
    var wv = window.webVitals;
    wv.onLCP(post);
    wv.onFID(post);
    wv.onCLS(post);
    wv.onINP && wv.onINP(post);
    wv.onTTFB && wv.onTTFB(post);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();

