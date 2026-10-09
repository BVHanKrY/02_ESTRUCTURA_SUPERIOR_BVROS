/* =========================================================
   BVROS GLOBAL PLAYER v3.4.1
   - ARRANQUE RÁPIDO: streaming inmediato (1-3 s)
   - BLOB DE RESCATE en segundo plano (sin bloquear)
   - FIX: no reasignar src si el servicio ya la puso
     (evita doble carga y AbortError)
   - FIX: reanudación tras rescate esperando
     loadedmetadata (posiciona exacto, no desde 0)
   - Precarga de la siguiente pista (limpia)
   - data-secure-audio="true" (marcador del servicio)
   ========================================================= */

console.info('[BVros Player] cargando…');

const CFG =
    window.BVROS_CONFIG_OVERRIDE || {};

const SUPABASE_URL =
    (
        typeof CFG.supabaseUrl === 'string' &&
        CFG.supabaseUrl.includes('supabase.co')
    )
        ? CFG.supabaseUrl
        : 'https://udbwjixdwoahonzezbqj.supabase.co';

const SUPABASE_KEY =
    (
        typeof CFG.supabaseAnonKey === 'string' &&
        CFG.supabaseAnonKey.length > 10
    )
        ? CFG.supabaseAnonKey
        : 'sb_publishable_CERYzMSJCTQkzIVjkn7c8g_C1QAo6Hc';

const TRACK_IDS = {

    'tinkuy':
        'BVROS-TRK-PULSO-001',

    'subtle-gad':
        'BVROS-TRK-PULSO-002',

    'regresion':
        'BVROS-TRK-PULSO-003',

    'raiz-de-mi-ser':
        'BVROS-TRK-RAIZ-001'

};

function trackIdFor(slug){

    return TRACK_IDS[slug] || slug;

}

const LIKE_KEY =
    'bvros_likes_v2';

const STATE_KEY =
    'bvros_gplayer_v1';

const DUR_KEY_PREFIX =
    'bvros_dur_';

let networkWarned = false;

function warnOnce(context, error){

    if(networkWarned) return;

    networkWarned = true;

    console.warn(
        `[BVros Player] Supabase no disponible (${context}). Modo local temporal.`,
        error && error.message ? error.message : error
    );

}


/* =========================================================
   ANALYTICS
========================================================= */

let analyticsMod = null;

try{

    analyticsMod =
        await import('./modules/analytics.js');

}catch(error){

    console.warn(
        '[BVros Player] analytics.js no disponible — likes en modo local.'
    );

}

const analytics = analyticsMod
    ? {

        registerPlay:
            analyticsMod.registerPlay,

        getPlayCount:
            analyticsMod.getPlayCount,

        toggleLike:
            analyticsMod.toggleLike,

        isLiked:
            analyticsMod.isLiked

    }
    : (() => {

        const readLikes = () => {

            try{

                return JSON.parse(
                    localStorage.getItem(LIKE_KEY) || '{}'
                );

            }catch{

                return {};

            }

        };

        return {

            async registerPlay(){},

            async getPlayCount(){
                return 0;
            },

            async toggleLike(trackId){

                const likes =
                    readLikes();

                const liked =
                    !!likes[trackId];

                if(liked){
                    delete likes[trackId];
                }else{
                    likes[trackId] = true;
                }

                localStorage.setItem(
                    LIKE_KEY,
                    JSON.stringify(likes)
                );

                return !liked;

            },

            isLiked(trackId){
                return !!readLikes()[trackId];
            }

        };

    })();


/* =========================================================
   COLA
========================================================= */

let queueModule = null;

try{

    queueModule =
        await import('./queue.js');

}catch(error){

    /* cola interna */

}

const queue =
    queueModule?.default
        ? queueModule.default
        : {

            tracks: [],
            index: -1,
            autoplay: true,

            setTracks(t){
                this.tracks =
                    Array.isArray(t) ? t : [];
            },

            setCurrent(slug){
                this.index =
                    this.tracks.findIndex(
                        t => t.slug === slug
                    );
            },

            next(){
                if(!this.tracks.length) return null;
                this.index =
                    (this.index + 1) % this.tracks.length;
                return this.tracks[this.index];
            },

            previous(){
                if(!this.tracks.length) return null;
                this.index =
                    (this.index - 1 + this.tracks.length)
                        % this.tracks.length;
                return this.tracks[this.index];
            }

        };


/* =========================================================
   AUDIO SEGURO
========================================================= */

let secureAudioFn = null;

try{

    const audioModule =
        await import('./services/audio-service.js');

    secureAudioFn =
        audioModule.ensureSecureAudioSource;

    console.info(
        '[BVros Player] audio-service vinculado ✔'
    );

}catch(error){

    console.error(
        '[BVros Player] audio-service.js NO cargó.',
        error
    );

}


/* =========================================================
   ESTILOS
========================================================= */

const STYLE = document.createElement('style');

STYLE.textContent = `

.bvg-player{
    position:fixed;
    left:0; right:0; bottom:0;
    z-index:9000;
    min-height:82px;
    background:rgba(5,5,5,.97);
    border-top:1px solid var(--border,#222);
    display:flex;
    align-items:center;
    padding:10px 24px;
    gap:14px;
    transform:translateY(110%);
    transition:transform .25s ease;
    backdrop-filter:blur(14px);
}
.bvg-player.show{ transform:translateY(0); }

.bvg-cover{
    width:44px; height:44px; flex:0 0 44px;
    object-fit:cover;
    border:1px solid var(--border,#222);
    border-radius:50%;
    animation:bvgSpin 8s linear infinite;
    animation-play-state:paused;
    will-change:transform;
}
.bvg-player.playing .bvg-cover{ animation-play-state:running; }
@keyframes bvgSpin{ from{transform:rotate(0)} to{transform:rotate(360deg)} }

.bvg-main{ min-width:180px; width:230px; }
.bvg-title{
    color:var(--text,#eee);
    font-size:.85rem; font-weight:600;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.bvg-artist{
    margin-top:3px;
    color:var(--text-muted,#888);
    font-family:var(--mono, monospace);
    font-size:.62rem;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}

.bvg-controls{ display:flex; align-items:center; gap:7px; }
.bvg-ctl{
    width:32px; height:32px;
    display:flex; align-items:center; justify-content:center;
    border:1px solid var(--border,#222);
    border-radius:50%;
    background:transparent;
    color:var(--text,#eee);
    cursor:pointer; font-size:12px;
    transition:border-color .15s, color .15s;
}
.bvg-ctl:hover{ border-color:var(--accent,#0f5); color:var(--accent,#0f5); }
.bvg-ctl.main{
    width:38px; height:38px;
    background:var(--accent,#0f5);
    border-color:var(--accent,#0f5);
    color:#000; font-size:13px;
}
.bvg-ctl.liked{ color:var(--accent,#0f5); }

.bvg-progress{ flex:1; min-width:180px; display:flex; align-items:center; gap:9px; }
.bvg-time{
    width:38px;
    color:var(--text-muted,#888);
    font-family:var(--mono, monospace);
    font-size:.58rem; text-align:center;
}
.bvg-range{
    flex:1; height:3px;
    appearance:none; -webkit-appearance:none;
    border-radius:999px; outline:none;
    background:linear-gradient(to right,
        var(--accent,#0f5) 0%,
        var(--accent,#0f5) var(--fill,0%),
        var(--border,#222) var(--fill,0%),
        var(--border,#222) 100%);
    cursor:pointer;
}
.bvg-range::-webkit-slider-thumb{
    appearance:none; -webkit-appearance:none;
    width:10px; height:10px; border:0; border-radius:50%;
    background:var(--accent,#0f5);
    box-shadow:0 0 8px rgba(0,255,102,.45);
    cursor:pointer; transition:transform .15s;
}
.bvg-range::-webkit-slider-thumb:hover{ transform:scale(1.3); }
.bvg-range::-moz-range-thumb{
    width:10px; height:10px; border:0; border-radius:50%;
    background:var(--accent,#0f5);
    box-shadow:0 0 8px rgba(0,255,102,.45);
    cursor:pointer;
}
.bvg-range::-moz-range-track{ background:transparent; }

.bvg-actions{ display:flex; align-items:center; gap:7px; }
.bvg-volume{ display:flex; align-items:center; gap:6px; }
.bvg-vol-btn{
    width:26px; height:26px;
    display:flex; align-items:center; justify-content:center;
    padding:0; border:0; background:transparent;
    color:var(--text-muted,#888); cursor:pointer;
    transition:color .15s;
}
.bvg-vol-btn:hover{ color:var(--accent,#0f5); }
.bvg-vol-btn svg{ width:17px; height:17px; }
.bvg-vol-btn .vol-x{ display:none; }
.bvg-vol-btn.muted .vol-wave{ display:none; }
.bvg-vol-btn.muted .vol-x{ display:block; }
.bvg-vol-btn.low .w2{ display:none; }
.bvg-volume-range{ width:70px; }

.bvg-action{
    height:30px; padding:0 9px;
    border:1px solid var(--border,#222);
    background:transparent;
    color:var(--text-muted,#888);
    font-family:var(--mono, monospace);
    font-size:.58rem; cursor:pointer;
    transition:color .15s, border-color .15s;
}
.bvg-action:hover{ color:var(--accent,#0f5); border-color:var(--accent,#0f5); }
.bvg-action.buy{ color:var(--accent,#0f5); border-color:var(--accent,#0f5); }

.bvg-share-wrap{ position:relative; }
.bvg-share-menu{
    position:absolute; right:0; bottom:40px;
    display:none; min-width:150px; padding:6px;
    background:rgba(10,10,10,.98);
    border:1px solid var(--border,#222);
    z-index:9100;
}
.bvg-share-menu.open{
    display:flex; flex-direction:column; gap:2px;
}
.bvg-share-menu button{
    padding:8px 10px; border:0; background:none;
    color:var(--text-muted,#888);
    font-family:var(--mono, monospace);
    font-size:.6rem; letter-spacing:1px;
    text-align:left; cursor:pointer;
}
.bvg-share-menu button:hover{
    color:var(--accent,#0f5);
    background:rgba(255,255,255,.03);
}

.bvg-toast{
    position:fixed; right:18px; bottom:96px; z-index:9200;
    padding:10px 14px;
    background:rgba(10,10,10,.98);
    border:1px solid var(--border,#222);
    color:var(--text,#eee);
    font-family:var(--mono, monospace); font-size:.62rem;
    opacity:0; transform:translateY(8px);
    pointer-events:none;
    transition:opacity .2s, transform .2s;
}
.bvg-toast.show{ opacity:1; transform:translateY(0); }

@media(max-width:850px){
    .bvg-main{ width:170px; min-width:130px; }
    .bvg-progress{ min-width:120px; }
    .bvg-volume, .bvg-share-wrap, .bvg-action{ display:none; }
}
@media(max-width:620px){
    .bvg-cover{ width:38px; height:38px; flex-basis:38px; }
    .bvg-main{ min-width:0; width:auto; flex:1; }
    .bvg-progress{
        position:absolute; left:0; right:0; bottom:0; min-width:0;
    }
    .bvg-time{ display:none; }
    .bvg-range{ width:100%; }
    .bvg-controls{ gap:3px; }
    .bvg-ctl{ width:29px; height:29px; }
    .bvg-ctl.main{ width:34px; height:34px; }
}

`;

document.head.appendChild(STYLE);


/* =========================================================
   UTILIDADES
========================================================= */

function formatTime(seconds){

    if(
        !Number.isFinite(seconds) ||
        seconds < 0
    ){
        return '0:00';
    }

    const minutes =
        Math.floor(seconds / 60);

    const secs =
        Math.floor(seconds % 60)
            .toString()
            .padStart(2,'0');

    return `${minutes}:${secs}`;

}

function parseDuration(value){

    if(
        typeof value !== 'string' ||
        !value.trim()
    ){
        return null;
    }

    const parts =
        value.trim().split(':').map(Number);

    if(
        parts.length < 2 ||
        parts.some(n => Number.isNaN(n))
    ){
        return null;
    }

    let total = 0;

    for(const part of parts){
        total = total * 60 + part;
    }

    return total > 0 ? total : null;

}

function updateFill(input){

    const min =
        Number(input.min) || 0;

    const max =
        Number(input.max) || 1;

    const val =
        Number(input.value);

    const pct =
        max > min
            ? ((val - min) / (max - min)) * 100
            : 0;

    input.style.setProperty(
        '--fill',
        pct + '%'
    );

}

function cachedDuration(slug){

    const raw =
        localStorage.getItem(
            DUR_KEY_PREFIX + trackIdFor(slug)
        );

    if(!raw) return null;

    const num = Number(raw);

    return (
        Number.isFinite(num) && num > 0
    )
        ? num
        : null;

}

function storeDuration(slug, seconds){

    try{

        localStorage.setItem(
            DUR_KEY_PREFIX + trackIdFor(slug),
            String(seconds)
        );

    }catch(error){

        /* ignorar */

    }

}


/* =========================================================
   SAFE PLAY — reintentos ante AbortError
========================================================= */

async function safePlay(audio, label = ''){

    for(let attempt = 1; attempt <= 3; attempt++){

        try{

            await audio.play();

            return true;

        }catch(error){

            const isAbort =
                error &&
                error.name === 'AbortError';

            if(!isAbort){
                throw error;
            }

            console.warn(
                `[BVros Player] play() interrumpido${label ? ' (' + label + ')' : ''} — reintentando ${attempt}/3…`
            );

            await new Promise(
                resolve =>
                    setTimeout(resolve, 150)
            );

        }

    }

    return false;

}


/* =========================================================
   SEEK CUANDO EL MEDIO ESTÉ LISTO
   FIX: asignar currentTime antes de loadedmetadata
   no es confiable (se pierde o lanza error).
========================================================= */

async function seekWhenReady(audio, time){

    if(!time || time <= 0){
        return;
    }

    try{

        if(audio.readyState >= 1){
            audio.currentTime = time;
            return;
        }

        await new Promise(resolve => {

            const done = () => {

                audio.removeEventListener(
                    'loadedmetadata',
                    done
                );

                resolve();

            };

            audio.addEventListener(
                'loadedmetadata',
                done
            );

            /* red de seguridad: no esperar forever */

            setTimeout(done, 8000);

        });

        audio.currentTime = time;

    }catch(error){

        /* si el medio no lo permite,
           la reproducción inicia desde 0 */

        console.warn(
            '[BVros Player] No se pudo posicionar en el segundo solicitado.',
            error
        );

    }

}


/* =========================================================
   CLASE DEL REPRODUCTOR
========================================================= */

class BVrosGlobalPlayer {

    constructor(){

        this.tracks = [];
        this.index = -1;
        this.currentSlug = null;
        this.realDuration = null;
        this.playSeq = 0;
        this.pendingSeek = 0;
        this.lastVolume = 1;
        this.restored = false;
        this._lastPosSave = 0;

        /*
           CACHE DE BLOBS (rescate):
           trackId → objectUrl del archivo completo,
           descargado en segundo plano. Si la red o la
           URL fallan a mitad de pista, se reanuda desde
           memoria sin depender de la URL vencida.
        */

        this.blobCache =
            new Map();

        this.buildDOM();
        this.bindEvents();
        this.restoreState();
        this.setupMediaSession();

        window.BVrosPlayer = this;

        window.dispatchEvent(
            new CustomEvent('bvros:playerready')
        );

    }


    /* ---------- DOM ---------- */

    buildDOM(){

        this.root =
            document.createElement('div');

        this.root.className =
            'bvg-player';

        this.root.innerHTML = `

            <img class="bvg-cover" id="bvgCover" src="" alt="">

            <div class="bvg-main">
                <div class="bvg-title" id="bvgTitle">—</div>
                <div class="bvg-artist" id="bvgArtist">—</div>
            </div>

            <div class="bvg-controls">

                <button class="bvg-ctl" id="bvgPrev" title="Anterior" type="button">◀</button>

                <button class="bvg-ctl" id="bvgBack" title="Retroceder 10 segundos" type="button">−10</button>

                <button class="bvg-ctl main" id="bvgBtn" title="Reproducir / Pausar" type="button">▶</button>

                <button class="bvg-ctl" id="bvgFwd" title="Avanzar 10 segundos" type="button">+10</button>

                <button class="bvg-ctl" id="bvgNext" title="Siguiente" type="button">▶</button>

            </div>

            <div class="bvg-progress">

                <span class="bvg-time" id="bvgCurrent">0:00</span>

                <input
                    class="bvg-range"
                    id="bvgSeek"
                    type="range"
                    min="0"
                    max="100"
                    value="0"
                    step="0.1"
                    aria-label="Progreso de la pista"
                >

                <span class="bvg-time" id="bvgRemaining">0:00</span>

            </div>

            <div class="bvg-actions">

                <button class="bvg-ctl" id="bvgLike" title="Me gusta" type="button" style="font-size:13px;">♡</button>

                <div class="bvg-volume">

                    <button
                        class="bvg-vol-btn"
                        id="bvgVolBtn"
                        title="Silenciar / Activar sonido"
                        type="button"
                        aria-label="Silenciar"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 5 6.6 9H3.5v6h3.1L11 19V5Z"/>
                            <path class="vol-wave w1" d="M14.6 9.3a4 4 0 0 1 0 5.4"/>
                            <path class="vol-wave w2" d="M17.3 6.9a7.6 7.6 0 0 1 0 10.2"/>
                            <g class="vol-x">
                                <line x1="15.6" y1="9.6" x2="20.4" y2="14.4"/>
                                <line x1="20.4" y1="9.6" x2="15.6" y2="14.4"/>
                            </g>
                        </svg>
                    </button>

                    <input
                        class="bvg-range bvg-volume-range"
                        id="bvgVolume"
                        type="range"
                        min="0"
                        max="1"
                        value="1"
                        step="0.01"
                        aria-label="Volumen"
                    >

                </div>

                <div class="bvg-share-wrap">

                    <button class="bvg-action" id="bvgShare" type="button">COMPARTIR</button>

                    <div class="bvg-share-menu" id="bvgShareMenu">
                        <button id="bvgShareCopy" type="button">Copiar enlace</button>
                        <button id="bvgShareNative" type="button">Compartir…</button>
                    </div>

                </div>

                <button class="bvg-action buy" id="bvgBuy" type="button">COMPRAR</button>

            </div>

            <audio
                id="bvgAudio"
                data-secure-audio="true"
                preload="none"
            ></audio>

             <button
                class="bvg-min"
                id="bvgMin"
                title="Minimizar reproductor"
                type="button"
            >×</button>

        `;

        document.body.appendChild(this.root);

        /* Píldora de retorno cuando el player
           está minimizado */

        this.pill =
            document.createElement('button');

        this.pill.id =
            'bvgPill';

        this.pill.className =
            'bvg-pill';

        this.pill.title =
            'Abrir reproductor';

        this.pill.type =
            'button';

        this.pill.textContent =
            '♪';

        this.pill.addEventListener(
            'click',
            () => {

                this.root.classList.remove('minimized');

                this.root.classList.add('show');

                this.pill.classList.remove('show');

            }
        );

        document.body.appendChild(this.pill);

        this.toastEl =
            document.createElement('div');

        this.toastEl.className =
            'bvg-toast';

        document.body.appendChild(this.toastEl);


        this.audio =
            document.getElementById('bvgAudio');

        this.ui = {

            cover:
                document.getElementById('bvgCover'),

            title:
                document.getElementById('bvgTitle'),

            artist:
                document.getElementById('bvgArtist'),

            btn:
                document.getElementById('bvgBtn'),

            prev:
                document.getElementById('bvgPrev'),

            next:
                document.getElementById('bvgNext'),

            back:
                document.getElementById('bvgBack'),

            fwd:
                document.getElementById('bvgFwd'),

            seek:
                document.getElementById('bvgSeek'),

            current:
                document.getElementById('bvgCurrent'),

            remaining:
                document.getElementById('bvgRemaining'),

            like:
                document.getElementById('bvgLike'),

            volBtn:
                document.getElementById('bvgVolBtn'),

            volume:
                document.getElementById('bvgVolume'),

            share:
                document.getElementById('bvgShare'),

            shareMenu:
                document.getElementById('bvgShareMenu'),

            shareCopy:
                document.getElementById('bvgShareCopy'),

            shareNative:
                document.getElementById('bvgShareNative'),

            buy:
                document.getElementById('bvgBuy')

        };

    }


    /* ---------- Eventos ---------- */

    bindEvents(){

        const ui =
            this.ui;

        const audio =
            this.audio;


        ui.btn.addEventListener(
            'click',
            () => this.toggle()
        );

        /* Minimizar: pausa + oculta + píldora */

        document.getElementById('bvgMin')
            .addEventListener(
                'click',
                () => {

                    this.audio.pause();

                    this.root.classList.add('minimized');

                    this.pill.classList.add('show');

                }
            );

        ui.prev.addEventListener(
            'click',
            () => this.previous()
        );

        ui.next.addEventListener(
            'click',
            () => this.next()
        );


        ui.back.addEventListener(
            'click',
            () => {
                audio.currentTime =
                    Math.max(0, audio.currentTime - 10);
            }
        );

        ui.fwd.addEventListener(
            'click',
            () => {

                const limit =
                    this.realDuration !== null
                        ? this.realDuration
                        : (
                            Number.isFinite(audio.duration)
                                ? audio.duration
                                : audio.currentTime + 10
                        );

                audio.currentTime =
                    Math.min(
                        limit,
                        audio.currentTime + 10
                    );

            }
        );


        audio.addEventListener(
            'timeupdate',
            () => {

                ui.current.textContent =
                    formatTime(audio.currentTime);

                ui.seek.value =
                    audio.currentTime;

                this.updateRemaining();

                updateFill(ui.seek);

                const now =
                    Date.now();

                if(now - this._lastPosSave > 5000){
                    this._lastPosSave = now;
                    this.saveState();
                }

            }
        );

        ui.seek.addEventListener(
            'input',
            () => {

                audio.currentTime =
                    Number(ui.seek.value);

                this.updateRemaining();

                updateFill(ui.seek);

            }
        );


        const onDuration =
            () => {

                if(
                    !Number.isFinite(audio.duration) ||
                    audio.duration <= 0
                ){
                    return;
                }

                this.realDuration =
                    audio.duration;

                ui.seek.max =
                    this.realDuration;

                this.updateRemaining();

                updateFill(ui.seek);

                if(this.currentSlug){

                    storeDuration(
                        this.currentSlug,
                        this.realDuration
                    );

                    window.dispatchEvent(
                        new CustomEvent(
                            'bvros:playerduration',
                            {
                                detail: {
                                    slug:
                                        this.currentSlug,

                                    text:
                                        formatTime(this.realDuration)
                                }
                            }
                        )
                    );

                }

            };

        audio.addEventListener(
            'loadedmetadata',
            onDuration
        );

        audio.addEventListener(
            'durationchange',
            onDuration
        );


        audio.addEventListener(
            'play',
            () => {
                this.root.classList.add('playing');
                ui.btn.textContent = '❚❚';
                this.root.classList.add('show');    
            }
        );

        audio.addEventListener(
            'pause',
            () => {
                this.root.classList.remove('playing');
                ui.btn.textContent = '▶';
                this.saveState();
            }
        );


        audio.addEventListener(
            'ended',
            () => {

                ui.btn.textContent = '▶';

                ui.current.textContent = '0:00';

                ui.seek.value = 0;

                updateFill(ui.seek);

                this.saveState();


                if(queue.autoplay === false){
                    return;
                }


                const nextTrack =
                    queue.next();

                if(nextTrack){
                    this.playTrack(
                        nextTrack.slug,
                        this.tracks
                    );
                }

            }
        );


        /*
           RED DE SEGURIDAD:
           1) blob descargado → reanudar desde memoria
           2) si no → reautorizar URL firmada
        */

        audio.addEventListener(
            'error',
            async () => {

                if(!this.currentSlug) return;
                if(!audio.dataset.trackId) return;
                if(audio.src.startsWith('blob:')) return;


                const trackId =
                    audio.dataset.trackId;

                const resumeAt =
                    audio.currentTime || 0;


                /* 1) rescate con blob descargado */

                const cached =
                    this.blobCache.get(trackId);

                if(cached){

                    try{

                        console.warn(
                            '[BVros Player] Corte detectado — reanudando desde memoria local.'
                        );

                        audio.src =
                            cached;

                        await seekWhenReady(
                            audio,
                            resumeAt
                        );

                        const ok =
                            await safePlay(
                                audio,
                                'rescate blob'
                            );

                        if(ok) return;

                    }catch(error){

                        console.warn(
                            '[BVros Player] Rescate blob falló:',
                            error
                        );

                    }

                }


                /* 2) reautorización de URL */

                if(!secureAudioFn) return;

                try{

                    console.warn(
                        '[BVros Player] Interrupción — reautorizando…'
                    );

                    audio.dataset.signedExpiresAt =
                        '0';

                    await secureAudioFn(audio);

                    await seekWhenReady(
                        audio,
                        resumeAt
                    );

                    await safePlay(
                        audio,
                        'recuperación'
                    );

                }catch(error){

                    console.warn(
                        '[BVros Player] No se pudo recuperar:',
                        error
                    );

                }

            }
        );


        ui.volume.addEventListener(
            'input',
            () => {

                audio.volume =
                    Number(ui.volume.value);

                if(audio.volume > 0){
                    this.lastVolume = audio.volume;
                }

                updateFill(ui.volume);

                this.updateVolumeIcon();

                this.saveState();

            }
        );

        ui.volBtn.addEventListener(
            'click',
            () => {

                if(audio.volume > 0){

                    this.lastVolume =
                        audio.volume;

                    audio.volume = 0;

                }else{

                    audio.volume =
                        this.lastVolume || 1;

                }

                ui.volume.value =
                    audio.volume;

                updateFill(ui.volume);

                this.updateVolumeIcon();

                this.saveState();

            }
        );


        ui.like.addEventListener(
            'click',
            () => this.like()
        );


        ui.share.addEventListener(
            'click',
            event => {

                event.stopPropagation();

                ui.shareMenu.classList.toggle('open');

            }
        );

        document.addEventListener(
            'click',
            event => {

                if(
                    !event.target.closest('.bvg-share-wrap')
                ){
                    ui.shareMenu.classList.remove('open');
                }

            }
        );

        ui.shareCopy.addEventListener(
            'click',
            async () => {

                try{

                    await navigator.clipboard.writeText(
                        this.buildShareUrl()
                    );

                    this.showToast('Enlace copiado ✔');

                }catch(error){

                    this.showToast(
                        'No se pudo copiar el enlace.'
                    );

                }

                ui.shareMenu.classList.remove('open');

            }
        );

        ui.shareNative.addEventListener(
            'click',
            async () => {

                const track =
                    this.currentTrack();

                if(navigator.share && track){

                    try{

                        await navigator.share({
                            title:
                                `${track.title} — BVros`,
                            text:
                                `Escucha ${track.title} de ${track.artist} en BVros.`,
                            url:
                                this.buildShareUrl()
                        });

                    }catch(error){

            /* cancelado */

                    }

                }else{

                    try{

                        await navigator.clipboard.writeText(
                            this.buildShareUrl()
                        );

                        this.showToast('Enlace copiado ✔');

                    }catch(error){

                        /* sin permisos */

                    }

                }

                ui.shareMenu.classList.remove('open');

            }
        );


        ui.buy.addEventListener(
            'click',
            () => {

                const auth =
                    window.BVrosAuth;

                const track =
                    this.currentTrack();

                /* Estado del usuario + pista */

                const plan =
                    auth?.profile?.plan || 'free';

                const nivel =
                    auth?.isAuthenticated()
                        ? (auth.profile?.profile_type === 'perfil2'
                            ? 'Nivel 2 · Perfil 2'
                            : 'Nivel 2 · Perfil 1')
                        : 'Nivel 1 · invitado';

                const estado =
                    plan === 'premium'
                        ? 'SUSCRIPTOR'
                        : 'GRATIS — sin suscripción';


                /* Pista exclusiva sin premium:
                   demo → anuncio → pasarela */

                if(
                    track?.exclusive &&
                    plan !== 'premium'
                ){

                    this.showToast(
                        `${estado} · ${nivel} — demo en reproducción: la pista completa es exclusiva.`
                    );

                    this.showPayAnnouncement();

                    return;

                }


                /* Pista con URL de compra real */

                if(track?.purchaseUrl){
                    window.location.href =
                        track.purchaseUrl;
                    return;
                }


                /* Resto: aviso de estado + donar */

                this.showToast(
                    `${estado} · ${nivel} · apoya a los artistas ♥ — la pasarela de productos llega con 2B.3.`
                );

            }
        );
    }


    /* ---------- MediaSession ---------- */

    setupMediaSession(){

        if(
            !('mediaSession' in navigator)
        ){
            return;
        }

        try{

            navigator.mediaSession.setActionHandler(
                'play',
                () => this.audio.play()
            );

            navigator.mediaSession.setActionHandler(
                'pause',
                () => this.audio.pause()
            );

            navigator.mediaSession.setActionHandler(
                'previoustrack',
                () => this.previous()
            );

            navigator.mediaSession.setActionHandler(
                'nexttrack',
                () => this.next()
            );

        }catch(error){

            /* no soportado: ignorar */

        }

    }

    updateMediaSession(track){

        if(
            !('mediaSession' in navigator) ||
            !track
        ){
            return;
        }

        try{

            navigator.mediaSession.metadata =
                new MediaMetadata({
                    title:
                        track.title || '',
                    artist:
                        track.artist || '',
                    album:
                        track.album || '',
                    artwork:
                        track.cover
                            ? [{ src: track.cover, sizes: '512x512' }]
                            : []
                });

        }catch(error){

            /* ignorar */

        }

    }


    /* ---------- API pública ---------- */

    setTracks(tracks){

        this.tracks =
            Array.isArray(tracks) ? tracks : [];

        queue.setTracks?.(this.tracks);

    }

    currentTrack(){

        return this.tracks.find(
            t => t.slug === this.currentSlug
        ) || null;

    }

    async playTrack(slug, trackList = null){

        if(trackList){
            this.setTracks(trackList);
        }


        const index =
            this.tracks.findIndex(
                t => t.slug === slug
            );

        if(index < 0){
            console.warn(
                '[BVros Player] Pista no encontrada:',
                slug
            );
            return;
        }


        const track =
            this.tracks[index];

        const trackId =
            track.id || trackIdFor(slug);


        this.index =
            index;

        this.currentSlug =
            slug;

        this.pendingSeek =
            0;


        queue.setCurrent?.(slug);


        this.pruneBlobs(trackId);

        clearTimeout(this.demoTimer);

        this.removePayAnnouncement();


        /* UI */

        this.root.classList.add('show');

        this.ui.cover.src =
            track.cover || '';

        this.ui.title.textContent =
            track.title || 'Sin título';

        this.ui.artist.textContent =
            'Conectando audio seguro…';


        this.realDuration =
            cachedDuration(slug);

        const provisional =
            this.realDuration !== null
                ? this.realDuration
                : parseDuration(track.duration);

        this.ui.current.textContent =
            '0:00';

        this.ui.seek.value =
            0;

        this.ui.seek.max =
            provisional !== null
                ? provisional
                : 100;

        this.ui.remaining.textContent =
            provisional !== null
                ? formatTime(provisional)
                : '0:00';

        updateFill(this.ui.seek);

        this.refreshLikeUI();


        this.saveState();


        window.dispatchEvent(
            new CustomEvent(
                'bvros:playertrack',
                {
                    detail: {
                        slug,
                        index
                    }
                }
            )
        );

        this.updateMediaSession(track);


        await this.loadAndPlay(trackId, 0);

    }

    async toggle(){

        const audio =
            this.audio;

        if(!audio.src){

            if(this.currentSlug){
                await this.loadAndPlay(
                    trackIdFor(this.currentSlug),
                    this.pendingSeek || 0
                );
                this.pendingSeek = 0;
            }

            return;
        }


        if(audio.paused){

            const ok =
                await safePlay(
                    audio,
                    'toggle'
                );

            if(!ok){
                this.showToast(
                    'El audio no pudo iniciar, intenta de nuevo.'
                );
            }

        }else{

            audio.pause();

        }

    }

    async next(){

        const nextTrack =
            queue.next();

        if(nextTrack){
            await this.playTrack(
                nextTrack.slug,
                this.tracks
            );
        }

    }

    async previous(){

        const prevTrack =
            queue.previous();

        if(prevTrack){
            await this.playTrack(
                prevTrack.slug,
                this.tracks
            );
        }

    }

    async like(){

        if(!this.currentSlug) return;

        const slug =
            this.currentSlug;

        const trackId =
            trackIdFor(slug);

        this.ui.like.disabled = true;

        try{

            const likedNow =
                await analytics.toggleLike(trackId);

            this.refreshLikeUI();

            window.dispatchEvent(
                new CustomEvent(
                    'bvros:playerliked',
                    {
                        detail: {
                            slug,
                            liked: likedNow
                        }
                    }
                )
            );

        }finally{

            this.ui.like.disabled = false;

        }

    }

    refreshLikeUI(){

        if(!this.currentSlug) return;

        const liked =
            analytics.isLiked(
                trackIdFor(this.currentSlug)
            );

        this.ui.like.classList.toggle(
            'liked',
            liked
        );

        this.ui.like.style.color = liked
            ? 'var(--accent, #0f5)'
            : '';

        this.ui.like.textContent =
            liked ? '♥' : '♡';

    }


    /* ---------- Núcleo: ARRANQUE RÁPIDO ----------
       1. URL firmada → SUENA YA (streaming).
          FIX v3.4.1: NO se reasigna audio.src
          (el servicio ya la puso; reasignar el
          mismo valor dispara una segunda carga
          y provoca AbortError).
       2. Blob de rescate en segundo plano.
       3. Precarga de la siguiente pista.
    ================================================= */

    async loadAndPlay(trackId, resumeAt = 0){

        const audio =
            this.audio;

        const thisPlay =
            ++this.playSeq;

        try{

            if(!secureAudioFn){

                this.ui.artist.textContent =
                    'audio-service.js no disponible';

                return;

            }


            audio.pause();

            audio.removeAttribute('src');

            audio.load();


            audio.dataset.trackId =
                trackId;

            audio.dataset.signedExpiresAt =
                '0';


            await secureAudioFn(audio);

            if(thisPlay !== this.playSeq){
                return;
            }


            const signedUrl =
                audio.src;

            if(!signedUrl){
                throw new Error(
                    'No se obtuvo URL de audio del servicio seguro'
                );
            }


            /* STREAMING INMEDIATO:
               el src ya está asignado por el
               servicio. Solo reproducir. */

            if(resumeAt > 0){
                await seekWhenReady(
                    audio,
                    resumeAt
                );
            }


            const ok =
                await safePlay(
                    audio,
                    'carga de pista'
                );

            if(!ok){

                this.ui.artist.textContent =
                    'El audio no pudo iniciar. Intenta de nuevo.';

                this.ui.btn.textContent =
                    '▶';

                return;

            }

            if(thisPlay !== this.playSeq){
                return;
            }


            const track =
                this.currentTrack();

            this.ui.artist.textContent =
                `${track?.artist || 'BVros'} · audio protegido ✔`;


            this.countPlay(this.currentSlug);

            this.saveState();

            /* DEMO para pistas exclusivas:
               20 s y corte con anuncio
               (solo usuarios sin premium) */

            this.startDemoWatch(this.currentSlug);


            /* BLOB DE RESCATE en segundo plano */

            this.downloadBlobInBackground(
                trackId,
                signedUrl
            );


            /* Precarga de la siguiente */

            this.preloadNext();

        }catch(error){

            console.error(
                '[BVros Player]',
                error
            );

            this.ui.artist.textContent =
                'Error: ' + error.message;

            this.ui.btn.textContent =
                '▶';

        }

    }


    /* Descarga en segundo plano del archivo
       completo → cache de rescate. */

    downloadBlobInBackground(trackId, signedUrl){

        if(this.blobCache.has(trackId)){
            return;
        }


        const myPlay =
            this.playSeq;


        fetch(signedUrl)
            .then(res => {

                if(!res.ok){
                    throw new Error(
                        'HTTP ' + res.status
                    );
                }

                return res.blob();

            })
            .then(blob => {

                if(myPlay !== this.playSeq){
                    return;
                }


                this.blobCache.set(
                    trackId,
                    URL.createObjectURL(blob)
                );

                console.info(
                    '[BVros Player] Rescate local listo (protegido contra cortes).'
                );

            })
            .catch(error => {

                console.warn(
                    '[BVros Player] Descarga de rescate no disponible:',
                    error.message
                );

            });

    }


    /* Precarga silenciosa de la siguiente pista */

    preloadNext(){

        if(!this.tracks.length) return;

        const idx =
            this.tracks.findIndex(
                t => t.slug === this.currentSlug
            );

        if(idx < 0) return;

        const next =
            this.tracks[
                (idx + 1) % this.tracks.length
            ];

        if(!next) return;

        const nextId =
            next.id || trackIdFor(next.slug);

        if(this.blobCache.has(nextId)){
            return;
        }


        setTimeout(async () => {

            try{

                const tmp =
                    new Audio();

                tmp.setAttribute(
                    'data-secure-audio',
                    'true'
                );

                tmp.dataset.trackId =
                    nextId;

                tmp.dataset.signedExpiresAt =
                    '0';

                tmp.preload =
                    'none';

                await secureAudioFn(tmp);


                const url =
                    tmp.src;

                if(
                    !url ||
                    url.startsWith('blob:')
                ){
                    return;
                }


                fetch(url)
                    .then(r => {

                        if(!r.ok){
                            throw new Error(
                                'HTTP ' + r.status
                            );
                        }

                        return r.blob();

                    })
                    .then(blob => {

                        this.blobCache.set(
                            nextId,
                            URL.createObjectURL(blob)
                        );

                        console.info(
                            '[BVros Player] Siguiente pista precargada:',
                            next.slug
                        );

                    })
                    .catch(() => {

                        /* silencioso */

                    });

            }catch(error){

                /* precarga best-effort */

            }

        }, 4000);

    }


    /* Liberar blobs lejanos (conserva actual
       y siguiente) */

    pruneBlobs(currentTrackId){

        const idx =
            this.tracks.findIndex(
                t => t.slug === this.currentSlug
            );

        const keep =
            new Set([currentTrackId]);


        if(idx >= 0 && this.tracks.length){

            const next =
                this.tracks[
                    (idx + 1) % this.tracks.length
                ];

            if(next){
                keep.add(
                    next.id || trackIdFor(next.slug)
                );
            }

        }


        for(const [id, url] of this.blobCache){

            if(!keep.has(id)){

                try{
                    URL.revokeObjectURL(url);
                }catch(error){
                    /* ignorar */
                }

                this.blobCache.delete(id);

            }

        }

    }

    /* DEMO: corta pistas exclusivas a los 20 s
       para usuarios sin premium, y enciende el
       anuncio de suscripción */

    startDemoWatch(slug){

        clearTimeout(this.demoTimer);

        const track =
            this.currentTrack();

        if(!track?.exclusive) return;

        const isPremium =
            window.BVrosAuth?.profile?.plan === 'premium';

        if(isPremium) return;


        this.demoTimer =
            setTimeout(() => {

                if(this.currentSlug !== slug) return;

                this.audio.pause();

                this.audio.currentTime = 0;

                this.showPayAnnouncement();

            }, 20000);

    }


    /* ANUNCIO: cinta dorada sobre el player
       con flecha y llamada a la pasarela */

    showPayAnnouncement(){

        /* Botón COMPRAR → dorado brillante */

        this.ui.buy.classList.add(
            'bvg-buy-gold'
        );


        /* Anuncio existente: no duplicar */

        if(document.getElementById('bvgPayAnn')) return;


        const ann =
            document.createElement('div');

        ann.id =
            'bvgPayAnn';

        ann.innerHTML = `

            <span class="bvg-pay-ann-arrow">↑</span>

            <div class="bvg-pay-ann-text">
                <b>Suscríbete al plan</b>
                <small>La pista completa es exclusiva
                · $3.99 o $3.00 según tu perfil
                · single: $2.99</small>
            </div>

            <button
                class="bvg-pay-ann-btn"
                type="button"
            >ABRIR PASARELA</button>

            <button
                class="bvg-pay-ann-close"
                type="button"
                title="Cerrar anuncio"
            >×</button>

        `;


        ann.querySelector('.bvg-pay-ann-btn')
            .addEventListener(
                'click',
                () => {

                    this.removePayAnnouncement();

                    window.BVrosGate.open('suscripcion');

                }
            );

        ann.querySelector('.bvg-pay-ann-close')
            .addEventListener(
                'click',
                () => this.removePayAnnouncement()
            );

        document.body.appendChild(ann);

    }

    removePayAnnouncement(){

        document
            .getElementById('bvgPayAnn')
            ?.remove();

        this.ui.buy.classList.remove(
            'bvg-buy-gold'
        );

    }

    /* ---------- Soporte interno ---------- */

    updateRemaining(){

        const dur =
            this.realDuration !== null
                ? this.realDuration
                : (
                    Number.isFinite(this.audio.duration) &&
                    this.audio.duration > 0
                        ? this.audio.duration
                        : null
                );

        if(dur === null){
            this.ui.remaining.textContent =
                '0:00';
            return;
        }

        this.ui.remaining.textContent =
            formatTime(
                Math.max(
                    0,
                    dur - this.audio.currentTime
                )
            );

    }

    updateVolumeIcon(){

        const v =
            this.audio.volume;

        this.ui.volBtn.classList.toggle(
            'muted',
            v === 0
        );

        this.ui.volBtn.classList.toggle(
            'low',
            v > 0 && v < .5
        );

    }

    async countPlay(slug){

        const trackId =
            trackIdFor(slug);

        try{

            await analytics.registerPlay(trackId, 0);

            const total =
                await analytics.getPlayCount(trackId);

            window.dispatchEvent(
                new CustomEvent(
                    'bvros:playregistered',
                    {
                        detail: {
                            slug,
                            total
                        }
                    }
                )
            );

        }catch(error){

            /* silencioso */

        }

    }

    buildShareUrl(){

        if(!this.currentSlug){
            return window.location.href;
        }

        return (
            window.location.href.split('#')[0] +
            '#track=' +
            encodeURIComponent(this.currentSlug)
        );

    }

    showToast(message){

        this.toastEl.textContent =
            message;

        this.toastEl.classList.add('show');

        clearTimeout(this.toastTimer);

        this.toastTimer =
            setTimeout(() => {

                this.toastEl.classList.remove('show');

            }, 2200);

    }


    /* ---------- Persistencia ---------- */

    saveState(){

        try{

            localStorage.setItem(
                STATE_KEY,
                JSON.stringify({
                    slug:
                        this.currentSlug,

                    index:
                        this.index,

                    position:
                        this.audio.currentTime || 0,

                    volume:
                        this.audio.volume,

                    muted:
                        this.audio.muted,

                    tracks:
                        this.tracks.slice(0, 50).map(t => ({
                            slug:
                                t.slug,

                            title:
                                t.title,

                            artist:
                                t.artist,

                            cover:
                                t.cover,

                            duration:
                                t.duration,

                            album:
                                t.album
                        }))
                })
            );

        }catch(error){

            /* ignorar */

        }

    }

    restoreState(){

        if(this.restored) return;

        this.restored = true;

        let saved = null;

        try{

            saved =
                JSON.parse(
                    localStorage.getItem(STATE_KEY) || 'null'
                );

        }catch(error){

            return;

        }

        if(!saved || !saved.slug){
            return;
        }


        if(Array.isArray(saved.tracks)){
            this.setTracks(saved.tracks);
        }


        this.index =
            Number.isInteger(saved.index)
                ? saved.index
                : -1;

        this.currentSlug =
            saved.slug;

        this.pendingSeek =
            Number(saved.position) || 0;


        if(typeof saved.volume === 'number'){

            this.audio.volume =
                saved.volume;

            this.ui.volume.value =
                saved.volume;

            updateFill(this.ui.volume);

            this.updateVolumeIcon();

        }


        this.refreshLikeUI();


        const track =
            this.currentTrack();

        if(track){

            this.root.classList.add('show');

            this.ui.cover.src =
                track.cover || '';

            this.ui.title.textContent =
                track.title || '—';

            this.ui.artist.textContent =
                `${track.artist || 'BVros'} · pulsa play para continuar`;

        }

    }

}


/* =========================================================
   INSTANCIA ÚNICA
========================================================= */

const player =
    new BVrosGlobalPlayer();

export default player;

window.BVrosPlayer =
    player;

console.info(
    '[BVros Player] listo ✔ — reproductor global activo.'
);