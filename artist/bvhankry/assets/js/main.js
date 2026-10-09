document.addEventListener('DOMContentLoaded', function() {

  var BASE = 'https://raw.githubusercontent.com/BVHanKrY/bvhankry.music/refs/heads/main/';

  /* ═══════════════════════════════════════
     PRODUCTOS
     ═══════════════════════════════════════ */

  var PHYSICAL_PRODUCTS = [
    { name:'Colección NFC', image:BASE+'merch/coleccion%20NFC%20.png', price:15.00, type:'physical', paymentUrl:'#' },
    { name:'Camiseta Colección', image:BASE+'merch/camisetas%20coleccion.png', price:45.00, type:'physical', paymentUrl:'#' },
    { name:'Camiseta Colección 6', image:BASE+'merch/camisetas%20coleccion%206.png', price:12.00, type:'physical', paymentUrl:'#' },
    { name:'Camiseta Colección 5', image:BASE+'merch/camisetas%20coleccion%205.png', price:25.00, type:'physical', paymentUrl:'#' },
    { name:'Camiseta Colección 4', image:BASE+'merch/camisetas%20coleccion%204.png', price:15.00, type:'physical', paymentUrl:'#' },
    { name:'Camiseta Colección 3', image:BASE+'merch/camisetas%20coleccion%203.png', price:25.00, type:'physical', paymentUrl:'#' }
  ];

  var DIGITAL_PRODUCTS = [
    { name:'Ebook Modos', category:'ebook', desc:'Guía completa de modos musicales', image:BASE+'merch/Ebook%20Modos.jpg', price:2.50, type:'digital', paymentUrl:'#' },
    { name:'Cursos de Música', category:'curso', desc:'Aprende desde cero producción musical', image:BASE+'merch/cursos%20de%20musica.png', price:10.00, type:'digital', paymentUrl:'#' },
    { name:'Curso de Piano Avanzado', category:'curso', desc:'Técnicas avanzadas de interpretación', image:BASE+'merch/curso%20de%20piano%20avanzado.png', price:18.00, type:'digital', paymentUrl:'#' },
    { name:'Curso de Piano Básico', category:'curso', desc:'Fundamentos esenciales del piano', image:BASE+'merch/curso%20de%20piano%20basico.png', price:10.00, type:'digital', paymentUrl:'#' },
    { name:'Curso de Piano Intermedio', category:'curso', desc:'Lleva tu nivel al siguiente escalón', image:BASE+'merch/curso%20de%20piano%20intermedio.png', price:12.00, type:'digital', paymentUrl:'#' }
  ];

  function fmtP(n){ return '$'+n.toFixed(2).replace('.',','); }
  function pad(n){ return n<10?'0'+n:''+n; }
  function platLabel(t){ return t==='digital'?'// en Hotmart':'// en Mercado Libre'; }
  function platName(t){ return t==='digital'?'Hotmart':'Mercado Libre'; }

  var WA_NUM = '593981417078';

  function handleBuy(product) {
    if (product.paymentUrl && product.paymentUrl !== '#') {
      window.open(product.paymentUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    var plat = platName(product.type);
    showToast('Enlace de pago pendiente en ' + plat);
    setTimeout(function() {
      showToast('Contacto directo vendedor', 'wa');
      setTimeout(function() {
        var text = 'Me interesa el producto: ' + product.name + ' (' + fmtP(product.price) + ')';
        window.open('https://wa.me/'+WA_NUM+'?text='+encodeURIComponent(text), '_blank', 'noopener,noreferrer');
      }, 1400);
    }, 1600);
  }

  function showToast(msg, type) {
    var c = document.getElementById('toast-container');
    var t = document.createElement('div');
    t.className = 'toast' + (type==='wa'?' toast-wa':'');
    t.textContent = msg;
    c.appendChild(t);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ t.classList.add('show'); }); });
    setTimeout(function(){ t.classList.remove('show'); setTimeout(function(){ t.remove(); },300); },3000);
  }

  /* ═══════════════════════════════════════
     RENDER — Productos físicos
     ═══════════════════════════════════════ */

  function renderPhysicalGrid() {
    var grid = document.getElementById('physicalGrid');
    var countEl = document.getElementById('physicalCount');
    countEl.innerHTML = '<span>'+pad(PHYSICAL_PRODUCTS.length)+'</span> piezas';
    var html = '';
    for (var i = 0; i < PHYSICAL_PRODUCTS.length; i++) {
      var p = PHYSICAL_PRODUCTS[i];
      html += '<div class="merch-item" data-index="'+i+'">' +
        '<img src="'+p.image+'" alt="'+p.name+'" loading="lazy">' +
        '<div class="merch-price-tag"><span class="merch-price-num">'+pad(i+1)+'</span><span class="merch-price-value">'+fmtP(p.price)+'</span></div>' +
        '<div class="merch-overlay">' +
          '<span class="merch-overlay-num">'+pad(i+1)+'</span>' +
          '<span class="merch-overlay-name">'+p.name+'</span>' +
          '<span class="merch-overlay-price">'+fmtP(p.price)+'</span>' +
          '<button class="merch-buy-btn" data-buy="'+i+'">Comprar<svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg></button>' +
          '<span class="merch-overlay-hint">ver detalle</span>' +
        '</div></div>';
    }
    grid.innerHTML = html;
    grid.addEventListener('click', function(e) {
      var buyBtn = e.target.closest('.merch-buy-btn');
      if (buyBtn) { e.stopPropagation(); handleBuy(PHYSICAL_PRODUCTS[parseInt(buyBtn.dataset.buy,10)]); return; }
      var item = e.target.closest('.merch-item');
      if (item) openLightbox(PHYSICAL_PRODUCTS, parseInt(item.dataset.index,10));
    });
    return grid;
  }

  /* ═══════════════════════════════════════
     RENDER — Productos digitales (libro)
     ═══════════════════════════════════════ */

  function renderDigitalGrid() {
    var grid = document.getElementById('digitalGrid');
    var countEl = document.getElementById('digitalCount');
    countEl.innerHTML = '<span>'+pad(DIGITAL_PRODUCTS.length)+'</span> piezas';
    var html = '';
    for (var i = 0; i < DIGITAL_PRODUCTS.length; i++) {
      var p = DIGITAL_PRODUCTS[i];
      var tag = (p.category || 'ebook').toUpperCase();
      var desc = p.desc || '';
      html += '<div class="merch-item merch-item--book" data-index="'+i+'" style="animation-delay:'+(i*0.6)+'s">' +
        '<div class="book-inner">' +
          '<img src="'+p.image+'" alt="'+p.name+'" loading="lazy">' +
          '<div class="book-spine"></div><div class="book-pages"></div><div class="book-shine"></div>' +
        '</div>' +
        '<div class="merch-price-tag"><span class="merch-price-num">'+pad(i+1)+'</span><span class="merch-price-value">'+fmtP(p.price)+'</span></div>' +
        '<div class="book-overlay">' +
          '<span class="book-tag">'+tag+'</span>' +
          '<span class="merch-overlay-num">'+pad(i+1)+'</span>' +
          '<span class="book-overlay-name">'+p.name+'</span>' +
          '<div class="book-overlay-line"></div>' +
          (desc ? '<span class="book-overlay-desc">'+desc+'</span>' : '') +
          '<span class="merch-overlay-price">'+fmtP(p.price)+'</span>' +
          '<button class="merch-buy-btn" data-buy="'+i+'">Comprar<svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg></button>' +
          '<span class="book-overlay-hint">explorar contenido</span>' +
        '</div></div>';
    }
    grid.innerHTML = html;
    grid.addEventListener('click', function(e) {
      var buyBtn = e.target.closest('.merch-buy-btn');
      if (buyBtn) { e.stopPropagation(); handleBuy(DIGITAL_PRODUCTS[parseInt(buyBtn.dataset.buy,10)]); return; }
      var item = e.target.closest('.merch-item--book');
      if (item) openLightbox(DIGITAL_PRODUCTS, parseInt(item.dataset.index,10));
    });
    return grid;
  }

  var physicalGridEl = renderPhysicalGrid();
  var digitalGridEl = renderDigitalGrid();

  /* ═══════════════════════════════════════
     3D TILT — Libros digitales
     ═══════════════════════════════════════ */

  if (!('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
    document.querySelectorAll('.merch-item--book').forEach(function(item) {
      var inner = item.querySelector('.book-inner');
      item.addEventListener('mouseenter', function() { inner.style.transition = 'none'; });
      item.addEventListener('mousemove', function(e) {
        var rect = inner.getBoundingClientRect();
        var x = e.clientX - rect.left, y = e.clientY - rect.top;
        var cx = rect.width / 2, cy = rect.height / 2;
        var rotX = ((y - cy) / cy) * -10, rotY = ((x - cx) / cx) * 10;
        inner.style.transform = 'rotateX('+rotX+'deg) rotateY('+rotY+'deg) scale(1.04)';
        inner.style.boxShadow = (rotY*-1.5)+'px '+(rotX*1.5)+'px 25px rgba(0,0,0,0.5)';
        inner.style.setProperty('--mx', ((x/rect.width)*100)+'%');
        inner.style.setProperty('--my', ((y/rect.height)*100)+'%');
      });
      item.addEventListener('mouseleave', function() {
        inner.style.transition = 'transform .45s ease, box-shadow .45s ease';
        inner.style.transform = 'rotateX(0) rotateY(0) scale(1)';
        inner.style.boxShadow = 'none';
      });
    });
  }

  /* ═══════════════════════════════════════
     LIGHTBOX
     ═══════════════════════════════════════ */

  var lightbox = document.getElementById('lightbox');
  var lbImg = document.getElementById('lbImg');
  var lbCurrent = document.getElementById('lbCurrent');
  var lbTotal = document.getElementById('lbTotal');
  var lbClose = document.getElementById('lbClose');
  var lbPrev = document.getElementById('lbPrev');
  var lbNext = document.getElementById('lbNext');
  var lbImgWrap = document.getElementById('lbImgWrap');
  var lbBuyName = document.getElementById('lbBuyName');
  var lbBuyPrice = document.getElementById('lbBuyPrice');
  var lbBuyPlatform = document.getElementById('lbBuyPlatform');
  var lbBuyBtn = document.getElementById('lbBuyBtn');
  var lbProducts = [], lbIndex = 0;

  function openLightbox(products, index) {
    lbProducts = products; lbIndex = index;
    lbTotal.textContent = pad(lbProducts.length);
    updateLightbox();
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }
  function updateLightbox() {
    var p = lbProducts[lbIndex];
    lbImg.src = p.image; lbImg.alt = p.name;
    lbCurrent.textContent = pad(lbIndex + 1);
    lbBuyName.textContent = p.name;
    lbBuyPrice.textContent = fmtP(p.price);
    lbBuyPlatform.textContent = platLabel(p.type);
  }
  function lbGo(dir) { lbIndex = (lbIndex + dir + lbProducts.length) % lbProducts.length; updateLightbox(); }

  lbClose.addEventListener('click', closeLightbox);
  lbPrev.addEventListener('click', function(e){ e.stopPropagation(); lbGo(-1); });
  lbNext.addEventListener('click', function(e){ e.stopPropagation(); lbGo(1); });
  lbBuyBtn.addEventListener('click', function(e){ e.stopPropagation(); if(lbProducts.length) handleBuy(lbProducts[lbIndex]); });
  lbImgWrap.addEventListener('click', function(e){ if(e.target===lbImgWrap) closeLightbox(); });
  document.addEventListener('keydown', function(e) {
    if(!lightbox.classList.contains('open')) return;
    if(e.key==='Escape') closeLightbox();
    if(e.key==='ArrowLeft') lbGo(-1);
    if(e.key==='ArrowRight') lbGo(1);
  });
  var touchSX = 0;
  lbImgWrap.addEventListener('touchstart', function(e){ touchSX=e.changedTouches[0].screenX; },{passive:true});
  lbImgWrap.addEventListener('touchend', function(e){
    var diff = touchSX - e.changedTouches[0].screenX;
    if(Math.abs(diff)>50) lbGo(diff>0?1:-1);
  },{passive:true});

  /* ─── Stagger de entrada ─── */
  function setupStagger(el) {
    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if(entry.isIntersecting) {
          entry.target.querySelectorAll('.merch-item').forEach(function(item, i) {
            setTimeout(function(){ item.classList.add('revealed'); }, i*90);
          });
          io.unobserve(entry.target);
        }
      });
    },{threshold:0.1});
    io.observe(el);
  }
  setupStagger(physicalGridEl);
  setupStagger(digitalGridEl);

  var teaserLink = document.querySelector('.info-teaser-link');
  if(teaserLink) teaserLink.addEventListener('click', function(e){ e.preventDefault(); var t=document.getElementById('merch-physical'); if(t) t.scrollIntoView({behavior:'smooth',block:'start'}); });

  /* ═══════════════════════════════════════════════════════════
     REPRODUCTOR — Duración robusta para cualquier servidor
     ═══════════════════════════════════════════════════════════ */

  var rows = Array.from(document.querySelectorAll('.track-row'));
  var globalPlayer = document.getElementById('globalPlayer');
  var gpTitle = document.getElementById('gpTitle');
  var gpArtist = document.getElementById('gpArtist');
  var gpCoverImg = document.getElementById('gpCoverImg');
  var gpPlayBtn = document.getElementById('gpPlayBtn');
  var gpIconPlay = gpPlayBtn.querySelector('.gp-icon-play');
  var gpIconPause = gpPlayBtn.querySelector('.gp-icon-pause');
  var gpProgressFill = document.getElementById('gpProgressFill');
  var gpProgressTrack = document.getElementById('gpProgressTrack');
  var gpTime = document.getElementById('gpTime');
  var gpVolume = document.getElementById('gpVolume');
  var gpPrevBtn = document.getElementById('gpPrevBtn');
  var gpNextBtn = document.getElementById('gpNextBtn');
  var gpLikeBtn = document.getElementById('gpLikeBtn');
  var gpShareBtn = document.getElementById('gpShareBtn');
  var shareDropdown = document.getElementById('shareDropdown');
  var topProgress = document.getElementById('topProgress');
  var defaultCover = BASE+'fondo/portada%20pulso.png';
  var streamingSection = document.getElementById('streaming-section');
  var currentAudio = null, currentRowId = null, globalVol = 1, rafId = null, ytPlayer = null;

  /* Formato de tiempo */
  function fmt(d) {
    if (!d || !isFinite(d) || d <= 0) return '0:00';
    var m = Math.floor(d / 60), s = Math.floor(d % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function fmtR(c, d) {
    if (!d || !isFinite(d) || d <= 0) return '0:00';
    return fmt(Math.max(0, d - c));
  }

  /* ═══════════════════════════════════════════════════
     SISTEMA DE DURACIÓN — Múltiples capas de detección
     ═══════════════════════════════════════════════════
     Problema: GitHub Raw no siempre envía Content-Length,
     entonces audio.duration es NaN hasta que se descarga
     suficiente data. Solución: escuchar todos los eventos
     posibles + polling + forzar carga si es necesario.
     ═══════════════════════════════════════════════════ */

  /* Mapa para rastrear qué pistas ya tienen duración resuelta */
  var durationResolved = {};

  /**
   * Intenta leer y mostrar la duración de un audio.
   * Retorna true si logró mostrarla, false si aún no.
   */
  function tryResolveDuration(audioEl, durSpan) {
    var d = audioEl.duration;
    if (d && isFinite(d) && d > 0) {
      durSpan.textContent = fmt(d);
      durationResolved[audioEl.dataset.id] = true;
      return true;
    }
    return false;
  }

  /**
   * Configura la detección de duración para UNA pista.
   * Usa 4 capas: loadedmetadata → durationchange → timeupdate → polling.
   */
  function setupDurationDetection(audioEl, durSpan) {
    var id = audioEl.dataset.id;
    if (durationResolved[id]) {
      /* Ya fue resuelta en una carga anterior (cache) */
      tryResolveDuration(audioEl, durSpan);
      return;
    }

    /* Capa 1: loadedmetadata — el evento estándar */
    audioEl.addEventListener('loadedmetadata', function onMeta() {
      if (tryResolveDuration(audioEl, durSpan)) return;
      /* Si falla, seguir esperando con las demás capas */
    });

    /* Capa 2: durationchange — se dispara cuando duration cambia de valor */
    audioEl.addEventListener('durationchange', function onDurChange() {
      tryResolveDuration(audioEl, durSpan);
    });

    /* Capa 3: timeupdate — cuando el audio ya está reproduciéndose,
       duration SIEMPRE está disponible aquí */
    audioEl.addEventListener('timeupdate', function onTimeUpdate() {
      if (durSpan.textContent === '--:--') {
        tryResolveDuration(audioEl, durSpan);
      }
    });

    /* Capa 4: Polling — verificar cada 300ms hasta 10 segundos.
       Útil para servidores que no disparan eventos correctamente. */
    var pollCount = 0;
    var pollMax = 33; /* 33 × 300ms ≈ 10s */
    var pollTimer = setInterval(function() {
      pollCount++;
      if (tryResolveDuration(audioEl, durSpan) || pollCount >= pollMax) {
        clearInterval(pollTimer);
      }
    }, 300);

    /* Capa 5: canplaythrough — cuando el audio se puede reproducir completo */
    audioEl.addEventListener('canplaythrough', function onCanPlay() {
      tryResolveDuration(audioEl, durSpan);
    });

    /* Capa 6: Si después de todo falla, forzar una recarga del metadata.
       Esto hace que el navegador descargue más datos del archivo. */
    setTimeout(function() {
      if (durSpan.textContent === '--:--') {
        /* Verificar si el audio tiene error */
        if (audioEl.error) {
          console.warn('[Duración] Error en audio ' + id + ':', audioEl.error.code, audioEl.error.message);
          durSpan.textContent = '—';
          return;
        }
        /* Forzar recarga de metadatos */
        try {
          audioEl.preload = 'auto';
          audioEl.load();
        } catch(e) {
          /* Si load() falla, esperar al play del usuario */
        }
      }
    }, 2000);
  }

  /* ═══════════════════════════════════════════
     FIN SISTEMA DE DURACIÓN
     ═══════════════════════════════════════════ */

  function updateRowUI(id, p) {
    var r = document.getElementById(id);
    if (!r) return;
    r.classList.toggle('playing', p);
    if (!p) { var f = r.querySelector('.track-progress-fill'); if (f) f.style.width = '0%'; }
  }
  function updateGPUI(p) {
    if (!currentRowId) return;
    var r = document.getElementById(currentRowId);
    gpTitle.textContent = r ? r.dataset.title : '—';
    gpArtist.textContent = r ? r.dataset.artist : '—';
    gpIconPlay.style.display = p ? 'none' : 'block';
    gpIconPause.style.display = p ? 'block' : 'none';
  }
  function updateGPLike(id) { gpLikeBtn.classList.toggle('active-like', localStorage.getItem('like-'+id)==='true'); }
  function updateShareLinks(t) {
    var tx = 'Escucha ' + t + ' en BVHanKrY Music', u = 'https://bvhankry.onrender.com';
    var el = function(id){ return document.getElementById(id); };
    if(el('link-wa')) el('link-wa').href = 'https://wa.me/?text='+encodeURIComponent(tx+' '+u);
    if(el('link-fb')) el('link-fb').href = 'https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(u);
    if(el('link-tw')) el('link-tw').href = 'https://twitter.com/intent/tweet?text='+encodeURIComponent(tx)+'&url='+encodeURIComponent(u);
    if(el('link-tg')) el('link-tg').href = 'https://t.me/share/url?url='+encodeURIComponent(u)+'&text='+encodeURIComponent(tx);
  }
  function toggleLike(id) {
    var r = document.getElementById(id); if (!r) return;
    var lk = localStorage.getItem('like-'+id)==='true', n = !lk;
    localStorage.setItem('like-'+id, n);
    r.querySelector('.track-like').classList.toggle('liked', n);
    if (currentRowId === id) updateGPLike(id);
    if (n) showToast('Añadido a Me gusta');
  }

  function tick() {
    if (!currentAudio || currentAudio.paused) { stopTick(); return; }
    var d = currentAudio.duration, c = currentAudio.currentTime;
    if (d && isFinite(d) && d > 0) {
      var p = (c / d) * 100;
      gpProgressFill.style.width = p + '%';
      topProgress.style.width = p + '%';
      gpTime.textContent = fmtR(c, d) + ' / ' + fmt(d);
      /* Actualizar duración en la fila si aún no se ha mostrado */
      if (currentRowId) {
        var row = document.getElementById(currentRowId);
        if (row) {
          var fl = row.querySelector('.track-progress-fill');
          if (fl) fl.style.width = p + '%';
          var durEl = row.querySelector('.track-duration');
          if (durEl && durEl.textContent === '--:--') {
            durEl.textContent = fmt(d);
            durationResolved[currentAudio.dataset.id] = true;
          }
        }
      }
    }
    rafId = requestAnimationFrame(tick);
  }
  function startTick() { if (rafId) cancelAnimationFrame(rafId); rafId = requestAnimationFrame(tick); }
  function stopTick() { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } }
  function pauseYT() { if (ytPlayer && ytPlayer.pauseVideo) try { ytPlayer.pauseVideo(); } catch(e){} }
  function pauseAll() {
    document.querySelectorAll('audio').forEach(function(a) { if (!a.paused) a.pause(); });
    if (currentRowId) { updateRowUI(currentRowId, false); updateGPUI(false); stopTick(); }
  }

  function playTrack(id) {
    var r = document.getElementById(id); if (!r) return;
    var a = r.querySelector('audio'); if (!a) return;

    /* Si es la misma pista y está reproduciéndose → pausar */
    if (currentAudio === a && !a.paused) {
      a.pause(); updateRowUI(id, false); updateGPUI(false); stopTick(); return;
    }

    /* Pausar pista anterior si hay */
    if (currentAudio && currentAudio !== a) {
      currentAudio.pause();
      if (currentRowId) updateRowUI(currentRowId, false);
      stopTick();
    }

    currentAudio = a;
    currentRowId = id;
    a.volume = globalVol;
    gpCoverImg.src = r.dataset.cover || defaultCover;
    pauseYT();

    a.play().then(function() {
      globalPlayer.classList.add('active');
      updateRowUI(id, true);
      updateGPUI(true);
      updateShareLinks(r.dataset.title);
      updateGPLike(id);
      startTick();

      /* Contar play */
      if (!a.dataset.counted) {
        var cn = parseInt(localStorage.getItem('plays-'+a.dataset.id)||'0', 10);
        cn++;
        var el2 = r.querySelector('.track-plays-count');
        if (el2) el2.textContent = cn;
        localStorage.setItem('plays-'+a.dataset.id, cn);
        a.dataset.counted = 'true';
      }
    }).catch(function(err) {
      console.warn('[Play] Error:', err);
      showToast('Error al cargar el audio');
    });
  }

  function playNext() {
    if (!currentRowId) return;
    var i = rows.findIndex(function(r){ return r.id === currentRowId; });
    if (i !== -1) playTrack(rows[(i+1) % rows.length].id);
  }
  function playPrev() {
    if (!currentRowId) return;
    var i = rows.findIndex(function(r){ return r.id === currentRowId; });
    if (i !== -1) playTrack(rows[(i-1+rows.length) % rows.length].id);
  }

  /* ═══════════════════════════════════════
     INICIALIZAR CADA PISTA
     ═══════════════════════════════════════ */
  rows.forEach(function(r) {
    var a = r.querySelector('audio');
    var durSpan = r.querySelector('.track-duration');

    /* Restaurar plays y likes desde localStorage */
    var ps = parseInt(localStorage.getItem('plays-'+a.dataset.id)||'0', 10);
    var pe = r.querySelector('.track-plays-count');
    if (pe) pe.textContent = ps;
    if (localStorage.getItem('like-'+r.id)==='true') r.querySelector('.track-like').classList.add('liked');

    /* ★ SISTEMA DE DURACIÓN ROBUSTO ★ */
    setupDurationDetection(a, durSpan);

    /* Click en la fila → reproducir */
    r.addEventListener('click', function(e) {
      if (e.target.closest('.track-like')) return;
      playTrack(r.id);
    });

    /* Click en corazón */
    r.querySelector('.track-like').addEventListener('click', function(e) {
      e.stopPropagation(); toggleLike(r.id);
    });

    /* Al terminar → siguiente pista */
    a.addEventListener('ended', function() {
      if (currentRowId === r.id) { stopTick(); playNext(); }
    });

    /* Si hay error de carga, marcar duración como error */
    a.addEventListener('error', function() {
      if (durSpan.textContent === '--:--') {
        durSpan.textContent = '—';
        console.warn('[Audio] Error cargando:', a.src, 'Código:', a.error ? a.error.code : 'unknown');
      }
    });
  });

  /* ═══════════════════════════════════════
     CONTROLES DEL REPRODUCTOR GLOBAL
     ═══════════════════════════════════════ */

  gpPlayBtn.addEventListener('click', function() {
    if (currentAudio) {
      if (currentAudio.paused) {
        currentAudio.play().then(function() {
          updateRowUI(currentRowId, true); updateGPUI(true); startTick(); pauseYT();
        }).catch(function(){ showToast('Error'); });
      } else {
        currentAudio.pause(); updateRowUI(currentRowId, false); updateGPUI(false); stopTick();
      }
    } else if (rows.length) {
      playTrack(rows[0].id);
    }
  });

  gpNextBtn.addEventListener('click', playNext);
  gpPrevBtn.addEventListener('click', playPrev);

  gpProgressTrack.addEventListener('click', function(e) {
    if (!currentAudio) return;
    var rect = gpProgressTrack.getBoundingClientRect();
    var p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (currentAudio.duration && isFinite(currentAudio.duration)) {
      currentAudio.currentTime = p * currentAudio.duration;
    }
  });

  gpVolume.addEventListener('input', function(e) {
    globalVol = parseFloat(e.target.value);
    if (currentAudio) currentAudio.volume = globalVol;
  });

  gpLikeBtn.addEventListener('click', function() { if (currentRowId) toggleLike(currentRowId); });
  gpShareBtn.addEventListener('click', function(e) { e.stopPropagation(); shareDropdown.classList.toggle('active'); });
  document.addEventListener('click', function(e) {
    if (shareDropdown && !shareDropdown.contains(e.target) && e.target !== gpShareBtn) shareDropdown.classList.remove('active');
  });

  /* Pausar al hacer click en la sección de streaming (fuera de iframes/botones) */
  if (streamingSection) {
    ['pointerdown','mousedown','touchstart','click'].forEach(function(evt) {
      streamingSection.addEventListener(evt, function(e) {
        if (!e.target.closest('a') && !e.target.closest('button') && !e.target.closest('iframe')) pauseAll();
      },{capture:true, passive: evt==='touchstart'});
    });
  }

  /* YouTube API */
  function initYT() {
    var ifr = document.getElementById('yt-player');
    if (ifr && typeof YT !== 'undefined' && YT.Player) {
      ytPlayer = new YT.Player(ifr, {events:{'onStateChange':function(e){ if(e.data===YT.PlayerState.PLAYING) pauseAll(); }}});
    }
  }
  if (typeof YT !== 'undefined' && YT.Player) initYT();
  else window.onYouTubeIframeAPIReady = initYT;

  /* Menú móvil */
  var menuBtn = document.querySelector('.menu-toggle');
  var navLinks = document.querySelector('.nav-links');
  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', function() {
      var o = !navLinks.classList.contains('active');
      navLinks.classList.toggle('active');
      menuBtn.setAttribute('aria-expanded', String(o));
    });
  }

  /* Nav hide on scroll */
  var lastScroll = 0;
  window.addEventListener('scroll', function() {
    var c = window.pageYOffset;
    document.querySelector('.main-nav').classList.toggle('hidden-nav', c > lastScroll && c > 80);
    lastScroll = c;
  });

  /* Scroll fade */
  var io = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) { if (e.isIntersecting) e.target.classList.add('visible'); });
  },{threshold:0.15});
  document.querySelectorAll('.scroll-fade').forEach(function(el){ io.observe(el); });

  /* PWA Install */
  var installBtn = document.getElementById('installAppBtn');
  var deferredPrompt = null;
  var isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isStandalone) {
    if (installBtn) installBtn.remove();
  } else {
    window.addEventListener('beforeinstallprompt', function(e) {
      e.preventDefault(); deferredPrompt = e;
      if (installBtn) installBtn.classList.add('visible');
    });
    if (installBtn) {
      installBtn.addEventListener('click', async function() {
        if (!deferredPrompt) { showToast('Instalación no disponible'); return; }
        deferredPrompt.prompt();
        var r = await deferredPrompt.userChoice;
        if (r.outcome === 'accepted') showToast('App instalada');
        deferredPrompt = null;
        installBtn.classList.remove('visible');
      });
    }
    window.addEventListener('appinstalled', function() {
      if (installBtn) installBtn.classList.remove('visible');
      showToast('Gracias por instalar la app');
    });
  }

  /* Service Worker */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('./sw.js').catch(function(e){ console.error('SW error:', e); });
    });
  }

  /* Limpiar barra de progreso al pausar */
  document.querySelectorAll('audio').forEach(function(a) {
    a.addEventListener('pause', function() { if (a === currentAudio) topProgress.style.width = '0%'; });
  });

});
