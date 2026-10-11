/* =========================================================
   BVROS GATE — 2B.1 + 2B.2 (FINAL ensamblado)
   - Acceso: login / crear cuenta / suscribirse (3 niveles)
   - Google como ENLACE directo (no depende de JS)
   - Perfiles 1/2 con implicaciones visibles
   - Pasarela PayPal/tarjeta con precio por nivel
   - Nivel 3 bloqueado en fase de prueba (código BVLUX170)
   - Menú de usuario: perfil, editar, suscríbete,
     soporte, salir, legal
   - Bienvenida personalizada 60 s
   ========================================================= */

import {
    BVrosAuth,
    supabase,
    PROFILE_ROLES
} from './services/auth-service.js';

import './services/payments-service.js';


/* =========================================================
   ESTILOS
========================================================= */

const STYLE =
    document.createElement('style');

STYLE.textContent = `

.bv-gate{
    position:fixed;
    inset:0;
    z-index:9500;
    display:none;
    align-items:center;
    justify-content:center;
    padding:20px;
    background:rgba(0,0,0,.78);
    backdrop-filter:blur(6px);
}
.bv-gate.open{ display:flex; }

.bv-gate-panel{
    width:100%;
    max-width:440px;
    max-height:92vh;
    overflow:auto;
    background:var(--surface,#14100C);
    border:1px solid var(--accent,#F97316);
    padding:26px 24px 22px;
    position:relative;
    color:var(--text,#F2EDE4);
}

.bv-gate-close{
    position:absolute;
    top:10px; right:12px;
    width:30px; height:30px;
    border:1px solid var(--border,#2A2119);
    background:none;
    color:var(--text-muted,#9A8D7D);
    font-size:15px;
    cursor:pointer;
}
.bv-gate-close:hover{
    color:var(--accent,#F97316);
    border-color:var(--accent,#F97316);
}

.bv-gate-eyebrow{
    color:var(--accent,#F97316);
    font-family:var(--mono, monospace);
    font-size:.58rem;
    letter-spacing:.2em;
    margin-bottom:8px;
}

.bv-gate-title{
    font-family:'Orbitron', sans-serif;
    font-size:1rem;
    font-weight:700;
    line-height:1.35;
    margin:0 0 4px;
}

.bv-gate-sub{
    color:var(--text-muted,#9A8D7D);
    font-size:.72rem;
    margin:0 0 16px;
    line-height:1.5;
}

.bv-gate-err{
    margin-top:10px;
    color:#F87171;
    font-size:.7rem;
    min-height:1em;
}

.bv-gate-tabs{
    display:flex;
    gap:6px;
    margin-bottom:16px;
}
.bv-gate-tab{
    flex:1;
    padding:8px 4px;
    border:1px solid var(--border,#2A2119);
    background:none;
    color:var(--text-muted,#9A8D7D);
    font-family:var(--mono, monospace);
    font-size:.55rem;
    letter-spacing:.06em;
    cursor:pointer;
}
.bv-gate-tab.on{
    border-color:var(--accent,#F97316);
    color:var(--accent,#F97316);
}

.bv-gate-google{
    width:100%;
    padding:11px;
    border:1px solid var(--border,#2A2119);
    background:#fff;
    color:#111;
    font-weight:700;
    font-size:.8rem;
    cursor:pointer;
    display:flex;
    align-items:center;
    justify-content:center;
    gap:8px;
    margin-bottom:14px;
    text-decoration:none;
}
.bv-gate-google:hover{
    border-color:var(--accent,#F97316);
}

.bv-gate-div{
    display:flex;
    align-items:center;
    gap:10px;
    color:var(--text-muted,#9A8D7D);
    font-size:.58rem;
    letter-spacing:.15em;
    margin:0 0 12px;
}
.bv-gate-div::before,
.bv-gate-div::after{
    content:'';
    flex:1;
    height:1px;
    background:var(--border,#2A2119);
}

.bv-gate label{
    display:block;
    color:var(--text-muted,#9A8D7D);
    font-family:var(--mono, monospace);
    font-size:.55rem;
    letter-spacing:.1em;
    text-transform:uppercase;
    margin:10px 0 4px;
}

.bv-gate input,
.bv-gate select{
    width:100%;
    padding:10px 12px;
    background:rgba(255,255,255,.03);
    border:1px solid var(--border,#2A2119);
    color:var(--text,#F2EDE4);
    font-family:inherit;
    font-size:.85rem;
}
.bv-gate input:focus,
.bv-gate select:focus{
    outline:none;
    border-color:var(--accent,#F97316);
}

.bv-gate-pcards{
    display:flex;
    gap:8px;
    margin:14px 0 6px;
}
.bv-gate-pcard{
    flex:1;
    padding:10px;
    border:1px solid var(--border,#2A2119);
    cursor:pointer;
    text-align:left;
    background:none;
    color:var(--text,#F2EDE4);
}
.bv-gate-pcard.on{
    border-color:var(--accent,#F97316);
}
.bv-gate-pcard h4{
    margin:0 0 6px;
    font-family:'Orbitron',sans-serif;
    font-size:.6rem;
    color:var(--text-muted,#9A8D7D);
    letter-spacing:.08em;
}
.bv-gate-pcard.on h4{
    color:var(--accent,#F97316);
}
.bv-gate-pcard ul{
    margin:0;
    padding:0;
    list-style:none;
}
.bv-gate-pcard li{
    font-size:.58rem;
    line-height:1.5;
    padding-left:12px;
    position:relative;
    color:var(--text-muted,#9A8D7D);
}
.bv-gate-pcard li.ok::before{
    content:'✓';
    position:absolute;
    left:0;
    color:#7CB342;
}
.bv-gate-pcard li.no::before{
    content:'✕';
    position:absolute;
    left:0;
    color:#F87171;
}

.bv-gate-roles{
    display:flex;
    gap:8px;
    margin:12px 0 4px;
}
.bv-gate-roles button{
    flex:1;
    padding:9px 6px;
    border:1px solid var(--border,#2A2119);
    background:none;
    color:var(--text-muted,#9A8D7D);
    font-size:.62rem;
    cursor:pointer;
    line-height:1.3;
}
.bv-gate-roles button.on{
    border-color:var(--accent,#F97316);
    color:var(--accent,#F97316);
}

.bv-gate-submit{
    width:100%;
    margin-top:16px;
    padding:12px;
    background:var(--accent,#F97316);
    border:none;
    color:#000;
    font-weight:800;
    font-size:.78rem;
    letter-spacing:.08em;
    cursor:pointer;
}
.bv-gate-submit:hover{
    filter:brightness(1.1);
}
.bv-gate-submit:disabled{
    opacity:.5;
    cursor:wait;
}

.bv-gate-link{
    display:block;
    margin-top:14px;
    text-align:center;
    background:none;
    border:none;
    color:var(--text-muted,#9A8D7D);
    font-size:.68rem;
    cursor:pointer;
    text-decoration:underline;
}
.bv-gate-link:hover{
    color:var(--accent,#F97316);
}

.bv-gate-price{
    display:flex;
    align-items:baseline;
    gap:6px;
    margin:6px 0 2px;
}
.bv-gate-price b{
    font-family:'Orbitron', sans-serif;
    font-size:1.6rem;
    color:var(--accent,#F97316);
}
.bv-gate-price span{
    color:var(--text-muted,#9A8D7D);
    font-size:.65rem;
}

.bv-gate-benefits{
    margin:12px 0;
    padding:0;
    list-style:none;
}
.bv-gate-benefits li{
    padding:5px 0 5px 18px;
    position:relative;
    color:var(--text,#F2EDE4);
    font-size:.72rem;
    line-height:1.4;
}
.bv-gate-benefits li::before{
    content:'▸';
    position:absolute;
    left:0;
    color:var(--accent,#F97316);
}

.bv-gate-note{
    margin-top:10px;
    color:var(--text-muted,#9A8D7D);
    font-size:.6rem;
    line-height:1.5;
}

/* Niveles de suscripción */

.bv-levels{
    display:flex;
    gap:8px;
    margin:6px 0 4px;
}
.bv-level{
    flex:1;
    padding:10px 8px;
    border:1px solid var(--border,#2A2119);
    background:none;
    color:var(--text,#F2EDE4);
    cursor:pointer;
    text-align:left;
}
.bv-level.on{
    border-color:var(--accent,#F97316);
}
.bv-level .lv-tag{
    display:block;
    font-family:'Orbitron',sans-serif;
    font-size:.5rem;
    color:var(--text-muted,#9A8D7D);
    margin-bottom:4px;
}
.bv-level.on .lv-tag{
    color:var(--accent,#F97316);
}
.bv-level .lv-price{
    display:block;
    font-weight:800;
    font-size:.8rem;
    margin-bottom:6px;
}
.bv-level ul{
    margin:0;
    padding:0;
    list-style:none;
}
.bv-level li{
    font-size:.55rem;
    line-height:1.45;
    color:var(--text-muted,#9A8D7D);
}

/* Chip de sesión + menú de usuario */

.bv-auth-chip{
    display:flex;
    align-items:center;
    position:relative;
}

.bv-auth-trigger{
    display:flex;
    align-items:center;
    gap:7px;
    padding:4px 10px;
    border:1px solid transparent;
    background:none;
    color:var(--text,#F2EDE4);
    font-family:var(--mono, monospace);
    font-size:.6rem;
    letter-spacing:.08em;
    cursor:pointer;
}
.bv-auth-trigger:hover{
    border-color:var(--border,#2A2119);
}

.bv-auth-avatar{
    width:22px;
    height:22px;
    border-radius:50%;
    border:1px solid var(--accent,#F97316);
    object-fit:cover;
    background:#241A12;
    display:flex;
    align-items:center;
    justify-content:center;
    overflow:hidden;
    flex:0 0 22px;
}
.bv-auth-avatar svg{
    width:13px;
    height:13px;
    color:var(--text-muted,#9A8D7D);
}
.bv-auth-avatar img{
    width:100%;
    height:100%;
}

.bv-auth-name{
    white-space:nowrap;
}

.bv-auth-menu{
    position:absolute;
    top:calc(100% + 8px);
    right:0;
    min-width:250px;
    background:var(--surface,#14100C);
    border:1px solid var(--border,#2A2119);
    z-index:9600;
    display:none;
}
.bv-auth-menu.open{
    display:block;
}

.bv-auth-menu-head{
    padding:12px 14px;
    border-bottom:1px solid var(--border,#2A2119);
}
.bv-auth-menu-head .m-name{
    color:var(--text,#F2EDE4);
    font-size:.72rem;
    font-weight:600;
}
.bv-auth-menu-head .m-mail{
    color:var(--text-muted,#9A8D7D);
    font-size:.6rem;
    margin-top:3px;
    word-break:break-all;
}
.bv-auth-menu-head .m-plan{
    display:inline-block;
    margin-top:6px;
    padding:2px 8px;
    border:1px solid var(--accent,#F97316);
    color:var(--accent,#F97316);
    font-family:var(--mono, monospace);
    font-size:.5rem;
    letter-spacing:.1em;
}

.bv-auth-menu .m-item{
    display:block;
    width:100%;
    text-align:left;
    padding:11px 14px;
    border:0;
    border-bottom:1px solid rgba(255,255,255,.04);
    background:none;
    color:var(--text,#F2EDE4);
    font-size:.68rem;
    cursor:pointer;
    text-decoration:none;
}
.bv-auth-menu .m-item:hover{
    background:rgba(249,115,22,.08);
    color:var(--accent,#F97316);
}

.bv-menu-panel{
    padding:14px;
    display:none;
}

.bv-menu-panel label{
    display:block;
    color:var(--text-muted,#9A8D7D);
    font-family:var(--mono, monospace);
    font-size:.52rem;
    letter-spacing:.1em;
    text-transform:uppercase;
    margin:10px 0 4px;
}

.bv-menu-panel input,
.bv-menu-panel select,
.bv-menu-panel textarea{
    width:100%;
    padding:9px 10px;
    background:rgba(255,255,255,.03);
    border:1px solid var(--border,#2A2119);
    color:var(--text,#F2EDE4);
    font-family:inherit;
    font-size:.78rem;
}
.bv-menu-panel textarea{
    min-height:70px;
    resize:vertical;
}
.bv-menu-panel input:focus,
.bv-menu-panel select:focus,
.bv-menu-panel textarea:focus{
    outline:none;
    border-color:var(--accent,#F97316);
}

.bv-menu-back{
    background:none;
    border:none;
    color:var(--text-muted,#9A8D7D);
    font-size:.6rem;
    cursor:pointer;
    padding:0;
    margin-bottom:8px;
}
.bv-menu-back:hover{
    color:var(--accent,#F97316);
}

.bv-menu-save{
    width:100%;
    margin-top:12px;
    padding:10px;
    background:var(--accent,#F97316);
    border:none;
    color:#000;
    font-weight:800;
    font-size:.68rem;
    letter-spacing:.08em;
    cursor:pointer;
}

.bv-menu-ok{
    margin-top:8px;
    color:#7CB342;
    font-size:.62rem;
    min-height:1em;
}
.bv-menu-err{
    margin-top:8px;
    color:#F87171;
    font-size:.62rem;
    min-height:1em;
}

button.bv-auth-login:hover{
    background:var(--accent,#F97316);
    color:#000;
}

.bv-avatar-upload{
    display:flex;
    align-items:center;
    gap:10px;
    margin-top:4px;
}

.bv-avatar-preview{
    width:44px;
    height:44px;
    flex:0 0 44px;
}

.bv-avatar-btn{
    padding:9px 14px;
    border:1px solid var(--border,#2A2119);
    background:none;
    color:var(--text,#F2EDE4);
    font-family:var(--mono, monospace);
    font-size:.6rem;
    letter-spacing:.08em;
    cursor:pointer;
}
.bv-avatar-btn:hover{
    border-color:var(--accent,#F97316);
    color:var(--accent,#F97316);
}

`;

document.head.appendChild(STYLE);


/* =========================================================
   ESTADO
========================================================= */

let gateRoot =
    null;

let chosenType =
    'perfil1';

let resolveGate =
    null;

let payPlan =
    null;

let payIntent =
    null;

let bvWelcomeLine =
    null;


function planBadge(){

    const auth =
        window.BVrosAuth;

    if(!auth?.profile) return '';

    if(auth.profile.plan === 'premium'){
        return auth.profile.profile_type === 'perfil2'
            ? 'SUSCRIPTOR CREADOR AVANZADO'
            : 'SUSCRIPTOR OYENTE EXPERTO';
    }

    return 'MIEMBRO GRATUITO';

}


/* =========================================================
   CONSTRUCCIÓN DE LA INTERFAZ
========================================================= */

function buildGate(){

    if(gateRoot) return;

    gateRoot =
        document.createElement('div');

    gateRoot.className =
        'bv-gate';

    gateRoot.innerHTML = `

        <div class="bv-gate-panel">

            <button
                class="bv-gate-close"
                type="button"
                title="Cerrar"
            >×</button>

            <div class="bv-gate-eyebrow">
                BVROS · ACCESO
            </div>

            <div
                class="bv-gate-err"
                data-ref="errGlobal"
            ></div>

            <h3 class="bv-gate-title" data-ref="title">
                Para acceder al catálogo
                inicia sesión o suscríbete
            </h3>

            <p class="bv-gate-sub" data-ref="sub">
                Nivel 1 · acceso de espectador externo
            </p>


            <div class="bv-gate-tabs">

                <button
                    class="bv-gate-tab on"
                    data-tab="login"
                    type="button"
                >INICIAR SESIÓN</button>

                <button
                    class="bv-gate-tab"
                    data-tab="signup"
                    type="button"
                >CREAR CUENTA</button>

                <button
                    class="bv-gate-tab"
                    data-tab="suscribe"
                    type="button"
                >SUSCRIBIRSE</button>

            </div>


            <!-- LOGIN -->

            <div data-view="login">

                <a
                    class="bv-gate-google"
                    href="https://udbwjixdwoahonzezbqj.supabase.co/auth/v1/authorize?provider=google&redirect_to=https%3A%2F%2Fbvros-music-network.onrender.com"
                >
                    <svg width="16" height="16" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/>
                        <path fill="#FBBC05" d="M10.4 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C1 16.5 0 20.1 0 24s1 7.5 2.6 10.8l7.8-6.1z"/>
                        <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.4-5.5l-7.5-5.8c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.7-3.7-13.6-9l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/>
                    </svg>
                    Ingresar con Google
                </a>

                <div class="bv-gate-div">O CON TU CORREO</div>

                <label>Correo electrónico</label>
                <input
                    data-f="email"
                    type="email"
                    autocomplete="email"
                    placeholder="tu@correo.com"
                >

                <label>Contraseña</label>
                <input
                    data-f="password"
                    type="password"
                    autocomplete="current-password"
                    placeholder="••••••••"
                >

                <button
                    class="bv-gate-submit"
                    data-act="do-login"
                    type="button"
                >INICIAR SESIÓN</button>

                <div class="bv-gate-err" data-ref="errLogin"></div>

                <button
                    class="bv-gate-link"
                    data-act="go-signup"
                    type="button"
                >¿No tienes cuenta? Crear cuenta gratis</button>

            </div>


            <!-- CREAR CUENTA -->

            <div data-view="signup" hidden>

                <a
                    class="bv-gate-google"
                    href="https://udbwjixdwoahonzezbqj.supabase.co/auth/v1/authorize?provider=google&redirect_to=https%3A%2F%2Fbvros-music-network.onrender.com"
                >
                    <svg width="16" height="16" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/>
                        <path fill="#FBBC05" d="M10.4 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C1 16.5 0 20.1 0 24s1 7.5 2.6 10.8l7.8-6.1z"/>
                        <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.4-5.5l-7.5-5.8c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.7-3.7-13.6-9l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/>
                    </svg>
                    Continuar con Google
                </a>

                <div class="bv-gate-div">O REGÍSTRATE CON TU CORREO</div>

                <label>Nombre de usuario</label>
                <input
                    data-f="username"
                    type="text"
                    maxlength="24"
                    placeholder="tu_nombre"
                >

                <label>Correo electrónico</label>
                <input
                    data-f="email2"
                    type="email"
                    autocomplete="email"
                    placeholder="tu@correo.com"
                >

                <label>Contraseña (mínimo 6 caracteres)</label>
                <input
                    data-f="password2"
                    type="password"
                    autocomplete="new-password"
                    placeholder="••••••••"
                >


                <div class="bv-gate-pcards">

                    <button
                        type="button"
                        data-type="perfil1"
                        class="bv-gate-pcard on"
                    >
                        <h4>PERFIL 1 · ESCUCHA</h4>
                        <ul>
                            <li class="ok">Streaming de catálogo</li>
                            <li class="ok">Plays y likes activos</li>
                            <li class="ok">50% dscto. al suscribirte</li>
                            <li class="no">Sin distribución</li>
                            <li class="no">Sin perfil de artista
                                ni tienda propia</li>
                            <li class="no">No sube música</li>
                        </ul>
                    </button>

                    <button
                        type="button"
                        data-type="perfil2"
                        class="bv-gate-pcard"
                    >
                        <h4>PERFIL 2 · CREADOR</h4>
                        <ul>
                            <li class="ok">Todo lo del Perfil 1</li>
                            <li class="ok">Perfil de artista
                                público</li>
                            <li class="ok">Tienda: merch y
                                servicios</li>
                            <li class="ok">Distribución BVros Music
                                Network (verificación)</li>
                        </ul>
                    </button>

                </div>


                <label>Rol específico</label>
                <select data-f="role"></select>

                <button
                    class="bv-gate-submit"
                    data-act="do-signup"
                    type="button"
                >CREAR CUENTA GRATIS — NIVEL 2</button>

                <div class="bv-gate-err" data-ref="errSignup"></div>

                <button
                    class="bv-gate-link"
                    data-act="go-login"
                    type="button"
                >Ya tengo cuenta — iniciar sesión</button>

            </div>


            <!-- COMPLETAR PERFIL (tras Google) -->

            <div data-view="complete" hidden>

                <p class="bv-gate-sub">
                    Cuenta conectada ✔. Define tu identidad
                    en BVros: tu perfil determina tus
                    beneficios, tu precio de suscripción
                    y los módulos que se desbloquean.
                </p>

                <label>Nombre de usuario</label>
                <input
                    data-f="username3"
                    type="text"
                    maxlength="24"
                    placeholder="tu_nombre"
                >


                <div class="bv-gate-pcards">

                    <button
                        type="button"
                        data-type="perfil1"
                        class="bv-gate-pcard on"
                    >
                        <h4>PERFIL 1 · ESCUCHA</h4>
                        <ul>
                            <li class="ok">Streaming de catálogo</li>
                            <li class="ok">Plays y likes activos</li>
                            <li class="ok">50% dscto. al suscribirte</li>
                            <li class="no">Sin distribución</li>
                            <li class="no">Sin perfil de artista
                                ni tienda propia</li>
                            <li class="no">No sube música</li>
                        </ul>
                    </button>

                    <button
                        type="button"
                        data-type="perfil2"
                        class="bv-gate-pcard"
                    >
                        <h4>PERFIL 2 · CREADOR</h4>
                        <ul>
                            <li class="ok">Todo lo del Perfil 1</li>
                            <li class="ok">Perfil de artista
                                público</li>
                            <li class="ok">Tienda: merch y
                                servicios</li>
                            <li class="ok">Distribución BVros Music
                                Network (verificación)</li>
                        </ul>
                    </button>

                </div>


                <label>Rol específico</label>
                <select data-f="role2"></select>

                <button
                    class="bv-gate-submit"
                    data-act="do-complete"
                    type="button"
                >GUARDAR Y ENTRAR — NIVEL 2</button>

                <div class="bv-gate-err" data-ref="errComplete"></div>

                <p class="bv-gate-note">
                    Perfil 2 con verificación profesional:
                    la distribución requiere solicitud previa,
                    revisión de datos y trayectoria durante
                    2 semanas. BVros se reserva el derecho
                    de admisión. Las cuentas de Google no
                    usan clave; solicítala a soporte si la
                    necesitas.
                </p>

            </div>


            <!-- SUSCRIBIRSE (3 NIVELES) -->

            <div data-view="suscribe" hidden>

                <p class="bv-gate-sub" style="text-align:center;">
                    <b style="color:var(--accent);">Regístrate gratis y accede a beneficios</b>
                </p>

                <div class="bv-levels">

                    <button type="button" class="bv-level" data-plan="nivel1">
                        <span class="lv-tag">NIVEL 1 · ESPECTADOR</span>
                        <span class="lv-price">GRATUITO</span>
                        <ul>
                            <li>Navega todos los módulos</li>
                            <li>Catálogo por álbumes y sencillos</li>
                            <li>Compra productos en la tienda</li>
                            <li>Escucha con limitaciones</li>
                            <li class="no">Sin previsualizaciones</li>
                            <li class="no">Sin distribución, sin perfil
                                de artista, sin tienda propia</li>
                        </ul>
                    </button>

                    <button type="button" class="bv-level" data-plan="nivel2">
                        <span class="lv-tag">NIVEL 2 · OYENTE</span>
                        <span class="lv-price">$3.99<small>/mes</small></span>
                        <ul>
                            <li>Streaming indefinido del catálogo
                                desbloqueado</li>
                            <li>Previsualizaciones: ebooks, videos,
                                pistas exclusivas</li>
                            <li>50% dscto. en productos</li>
                            <li>Acceso a la Escuela</li>
                            <li class="no">Sin distribución ni perfil
                                de artista (requieren verificación
                                y se activan según mérito)</li>
                        </ul>
                    </button>

                    <button type="button" class="bv-level" data-plan="nivel3">
                        <span class="lv-tag">NIVEL 3 · CREADOR</span>
                        <span class="lv-price">$4.75<small>/mes</small></span>
                        <ul>
                            <li>Todo lo del Nivel 2</li>
                            <li>Perfil de artista público</li>
                            <li>Distribución BVros Music Network
                                (verificación 2 semanas)</li>
                            <li>Vende merch, cursos y servicios</li>
                            <li>70% artista / 30% plataforma ·
                                pagos vía PayPal desde $20</li>
                        </ul>
                    </button>

                </div>

                <div class="bv-gate-err" data-ref="errPay"></div>

                <div
                    id="bvPayContainer"
                    style="display:none; margin-top:14px; min-height:60px;"
                ></div>

                <a
                    class="bv-gate-google"
                    id="bvGoogleSubLink"
                    href="https://udbwjixdwoahonzezbqj.supabase.co/auth/v1/authorize?provider=google&redirect_to=https%3A%2F%2Fbvros-music-network.onrender.com"
                >
                    <svg width="16" height="16" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/>
                        <path fill="#FBBC05" d="M10.4 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C1 16.5 0 20.1 0 24s1 7.5 2.6 10.8l7.8-6.1z"/>
                        <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.4-5.5l-7.5-5.8c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.7-3.7-13.6-9l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/>
                    </svg>
                    <span data-ref="googleSubLabel">Continuar con Google</span>
                </a>

                <button
                    class="bv-gate-link"
                    data-act="go-signup"
                    type="button"
                >Prefiero registrarme con mi correo</button>

                <p class="bv-gate-note">
                    Pasarela: PayPal y tarjeta de débito o
                    crédito. Stripe en integración. Tus datos
                    están protegidos contra fraude en estricto
                    régimen de leyes nacionales e
                    internacionales; son de uso exclusivo y tú
                    respondes por su veracidad. BVros se
                    responsabiliza por la seguridad dentro del
                    entorno. La suscripción se renueva cada mes,
                    un día antes contando desde la adquisición.
                    Reembolsos y disputas: primero de forma
                    administrativa; no se aceptan reclamos
                    después de 30 días. Los beneficios del
                    Nivel 3 se activan eligiendo Perfil 2
                    (creador) con verificación dentro de dos
                    semanas.
                </p>

            </div>


            <!-- BLOQUEADO (nivel 3 en fase de prueba) -->

            <div data-view="blocked" hidden>

                <h3 class="bv-gate-title"
                    style="color:#F87171;">
                    Lamentamos este inconveniente
                </h3>

                <p class="bv-gate-sub">
                    BVros se encuentra en fase de
                    experimentación y los beneficios a los
                    que quieres acceder están interrumpidos
                    o en fase de creación por el momento.
                    Apreciamos tu entusiasmo y queremos
                    darte la bienvenida a nuestra plataforma
                    con los brazos abiertos.
                </p>

                <p class="bv-gate-sub">
                    <b style="color:var(--accent);">
                    Sigue estos pasos:</b> ingresa el código
                    de descuento que se encuentra debajo de
                    este mensaje. Al colocarlo entrarás
                    directo al Nivel 2 con un descuento
                    exclusivo por haber llegado hasta aquí.
                    El costo del Nivel 2 es de $3.99, pero
                    por tu interés te regalamos el 30% de
                    descuento: el precio actual con este
                    código es de <b style="color:var(--accent);">$1.70</b>.
                    Activa tu perfil como creador. Estoy
                    encantado de recibirte y espero
                    disfrutes de esta experiencia musical.
                </p>

                <label>Código de descuento</label>
                <input
                    data-f="promoCode"
                    type="text"
                    placeholder="BVLUX170"
                >

                <button
                    class="bv-gate-submit"
                    data-act="apply-promo"
                    type="button"
                >APLICAR CÓDIGO Y CONTINUAR</button>

                <div class="bv-gate-err" data-ref="errBlocked"></div>

            </div>


            <!-- ÉXITO -->

            <div data-view="ok" hidden>

                <p class="bv-gate-sub">
                    Disfruta de muchos beneficios al
                    pertenecer al mundo BVros: podrás
                    disfrutar, aprender, trabajar y darle
                    un nuevo camino a tu marca personal.
                    Deseo disfrutes de los beneficios y de
                    la música de alta calidad, hecha con
                    pasión por el arte.
                </p>

                <button
                    class="bv-gate-submit"
                    data-act="close"
                    type="button"
                >ENTRAR AL ECOSISTEMA</button>

            </div>


            <!-- CONFIRMAR CORREO -->

            <div data-view="confirm" hidden>

                <h3 class="bv-gate-title">
                    Revisa tu correo
                </h3>

                <p class="bv-gate-sub">
                    Te enviamos un enlace de confirmación.
                    Al confirmarlo, inicia sesión para
                    activar tu nivel 2.
                </p>

                <button
                    class="bv-gate-submit"
                    data-act="go-login"
                    type="button"
                >IR A INICIAR SESIÓN</button>

            </div>

        </div>

    `;

    document.body.appendChild(gateRoot);


    const q =
        sel => gateRoot.querySelector(sel);

    gateRoot._ui = {

        title:
            q('[data-ref="title"]'),

        sub:
            q('[data-ref="sub"]'),

        errLogin:
            q('[data-ref="errLogin"]'),

        errSignup:
            q('[data-ref="errSignup"]'),

        errComplete:
            q('[data-ref="errComplete"]'),

        errPay:
            q('[data-ref="errPay"]'),

        errBlocked:
            q('[data-ref="errBlocked"]'),

        googleSubLabel:
            q('[data-ref="googleSubLabel"]'),

        roleSelect:
            q('[data-f="role"]'),

        roleSelect2:
            q('[data-f="role2"]')

    };


    /* Tabs */

    gateRoot
        .querySelectorAll('.bv-gate-tab')
        .forEach(tab => {

            tab.addEventListener(
                'click',
                () => showView(
                    tab.dataset.tab
                )
            );

        });


    /* Selección de perfil */

    gateRoot
        .querySelectorAll('[data-type]')
        .forEach(btn => {

            btn.addEventListener(
                'click',
                () => {

                    chosenType =
                        btn.dataset.type;

                    gateRoot
                        .querySelectorAll('[data-type]')
                        .forEach(b => {

                            b.classList.toggle(
                                'on',
                                b === btn
                            );

                        });

                    fillRoles();

                }
            );

        });


    /* Selección de nivel + reset del contenedor
       de pago (para remontar con el nuevo precio) */

    gateRoot
        .querySelectorAll('.bv-level')
        .forEach(btn => {

            btn.addEventListener(
                'click',
                () => {

                    payPlan =
                        btn.dataset.plan;

                    gateRoot
                        .querySelectorAll('.bv-level')
                        .forEach(b =>
                            b.classList.toggle(
                                'on',
                                b === btn
                            )
                        );

                    /* Si los botones de PayPal ya
                       estaban montados para otro nivel,
                       limpiarlos */

                    const payC =
                        gateRoot.querySelector(
                            '#bvPayContainer'
                        );

                    if(payC){
                        payC.style.display =
                            'none';

                        payC.innerHTML =
                            '';
                    }

                }
            );

        });


    /* Cerrar: fondo y × */

    gateRoot.addEventListener(
        'click',
        event => {

            if(
                event.target === gateRoot
            ){
                closeGate();
            }

        }
    );

    q('.bv-gate-close')
        .addEventListener(
            'click',
            () => closeGate()
        );


    /* Botones de acción */

    gateRoot
        .querySelectorAll('[data-act]')
        .forEach(btn => {

            btn.addEventListener(
                'click',
                () => handleAction(
                    btn.dataset.act
                )
            );

        });

}


/* =========================================================
   UTILIDADES DEL GATE
========================================================= */

function gateError(msg){

    if(!gateRoot || !msg) return;

    const el =
        gateRoot.querySelector(
            '[data-ref="errGlobal"]'
        );

    if(el){
        el.textContent =
            '⚠ ' + msg;
    }

    console.error(
        '[BVros Gate]',
        msg
    );

}


function val(name){

    const el =
        gateRoot.querySelector(
            `[data-f="${name}"]`
        );

    return el
        ? el.value.trim()
        : '';

}


function fillRoles(){

    const roles =
        PROFILE_ROLES[chosenType] || [];

    const options =
        roles
            .map(r =>
                `<option>${r}</option>`
            )
            .join('');

    gateRoot._ui.roleSelect.innerHTML =
        options;

    gateRoot._ui.roleSelect2.innerHTML =
        options;

}


function showView(name){

    /* Vista de completar perfil: si hay
       intención de pago promo, solo Perfil 2 */

    if(
        gateRoot &&
        name === 'complete'
    ){

        const p1 =
            gateRoot.querySelectorAll(
                '[data-type="perfil1"]'
            );

        p1.forEach(b => {
            b.style.display =
                payIntent?.onlyPerfil2
                    ? 'none'
                    : '';
        });

        if(payIntent?.onlyPerfil2){
            chosenType =
                'perfil2';
        }

    }


    gateRoot
        .querySelectorAll('[data-view]')
        .forEach(v => {

            v.hidden =
                v.dataset.view !== name;

        });

    gateRoot
        .querySelectorAll('.bv-gate-tab')
        .forEach(t => {

            t.classList.toggle(
                'on',
                t.dataset.tab === name
            );

            if(
                name !== 'login' &&
                name !== 'signup' &&
                name !== 'suscribe'
            ){
                t.classList.remove('on');
            }

        });

}


function setBusy(act, busy){

    const btn =
        gateRoot.querySelector(
            `[data-act="${act}"]`
        );

    if(btn){
        btn.disabled = busy;
    }

}


/* =========================================================
   ACCIONES
========================================================= */

async function handleAction(action){

    const ui =
        gateRoot._ui;


    switch(action){


        case 'go-login':
            showView('login');
            break;


        case 'go-signup':
            showView('signup');
            break;


        case 'close':
            closeGate();
            break;


        case 'google':
            try{
                await BVrosAuth.signInWithGoogle();
            }catch(error){
                ui.errLogin.textContent =
                    error.message;
                showView('login');
            }
            break;


        case 'do-login': {

            ui.errLogin.textContent = '';

            setBusy(action, true);

            try{

                await BVrosAuth.signInWithEmail(
                    val('email'),
                    val('password')
                );

                afterAuth();

            }catch(error){

                ui.errLogin.textContent =
                    error.message;

            }finally{

                setBusy(action, false);

            }

            break;

        }


        case 'do-signup': {

            ui.errSignup.textContent = '';

            const username =
                val('username');

            if(!username){
                ui.errSignup.textContent =
                    'Elige un nombre de usuario.';
                return;
            }


            setBusy(action, true);

            try{

                const res =
                    await BVrosAuth.signUpWithEmail({
                        email:
                            val('email2'),

                        password:
                            val('password2'),

                        username,

                        profileType:
                            chosenType,

                        profileRole:
                            gateRoot._ui.roleSelect.value
                    });

                if(res.needsConfirmation){
                    showView('confirm');
                }else{
                    afterAuth();
                }

            }catch(error){

                ui.errSignup.textContent =
                    error.message;

            }finally{

                setBusy(action, false);

            }

            break;

        }


        case 'do-complete': {

            ui.errComplete.textContent = '';

            setBusy(action, true);

            try{

                await BVrosAuth.saveProfileChoice(
                    val('username3'),
                    chosenType,
                    gateRoot._ui.roleSelect2.value
                );

                /* Nivel 1 elegido: bienvenida
                   directa (gratuito, sin pago) */

                if(payPlan === 'nivel1'){
                    bvWelcomeLine =
                        'MIEMBRO GRATUITO';
                    afterAuth();
                    return;
                }

                /* Niveles 2/3: soltar la pasarela
                   de pago inmediatamente */

                if(payPlan){
                    showView('suscribe');
                    setTimeout(
                        () => handleAction('do-pay'),
                        200
                    );
                    return;
                }

                afterAuth();

            }catch(error){

                console.error(
                    '[BVros Gate] Error al guardar perfil:',
                    error
                );

                ui.errComplete.textContent =
                    error.message;

            }finally{

                setBusy(action, false);

            }

            break;

        }


        case 'do-pay': {

            /* Nivel 1: gratuito, sin pago */

            if(payPlan === 'nivel1'){
                bvWelcomeLine =
                    'MIEMBRO GRATUITO';
                afterAuth();
                return;
            }


            if(!payPlan){
                ui.errPay.textContent =
                    'Elige primero un nivel.';
                return;
            }

            if(!window.BVrosAuth?.isAuthenticated()){
                showView('signup');
                return;
            }

            setBusy(action, true);

            ui.errPay.textContent = '';

            try{

                /* Precio: promo ($1.70) o el del
                   nivel ($3.99 / $4.75) */

                const override =
                    payIntent?.price
                        ? Number(payIntent.price)
                        : (
                            payPlan === 'nivel3'
                                ? 4.75
                                : 3.99
                          );

                const container =
                    gateRoot.querySelector(
                        '#bvPayContainer'
                    );

                if(
                    container &&
                    container.style.display === 'none'
                ){

                    await window.BVrosPay.startSubscription(
                        'bvPayContainer',
                        () => {

                            bvWelcomeLine =
                                payIntent?.welcome
                                || (
                                    payPlan === 'nivel3'
                                        ? 'SUSCRIPTOR NIVEL 3 · $4.75'
                                        : 'SUSCRIPTOR NIVEL 2 · $3.99'
                                );

                            payIntent =
                                null;

                            afterAuth();

                        },
                        (error) => {

                            ui.errPay.textContent =
                                'Error de pago: ' +
                                (error?.message || 'intenta de nuevo');

                        },
                        override
                    );

                    container.style.display =
                        'block';

                }

            }catch(error){

                ui.errPay.textContent =
                    error.message;

            }finally{

                setBusy(action, false);

            }

            break;

        }


        case 'apply-promo': {

            const code =
                val('promoCode')
                    .trim()
                    .toUpperCase();

            if(code !== 'BVLUX170'){
                ui.errBlocked.textContent =
                    'Código no válido.';
                return;
            }

            payPlan =
                'nivel2';

            payIntent = {
                plan:
                    'nivel2',

                price:
                    1.70,

                onlyPerfil2:
                    true,

                welcome:
                    'SUSCRIPTOR NIVEL 2 · DESCUENTO ESPECIAL $1.70 · PERFIL 2 CREADOR'
            };

            chosenType =
                'perfil2';

            fillRoles();


            /* Guardar la intención: si el usuario
               continúa con Google (redirect), la
               intención sobrevive a la recarga */

            try{
                sessionStorage.setItem(
                    'bvros_pay_intent',
                    JSON.stringify(payIntent)
                );
            }catch(error){
                /* ignorar */
            }


            showView('signup');

            break;

        }

    }

}


/* =========================================================
   BIENVENIDA (60 s legibles)
========================================================= */

function afterAuth(){

    const auth =
        window.BVrosAuth;

    if(
        auth.profile &&
        auth.profile.profile_chosen
    ){

        /* Título grande del panel */

        const okTitle =
            gateRoot.querySelector('[data-ref="title"]');

        const okSub =
            gateRoot.querySelector(
                '[data-view="ok"] .bv-gate-sub'
            );

        const planLine =
            bvWelcomeLine
            || planBadge();

        if(okTitle){
            okTitle.textContent =
                'Bienvenido a BVros';
        }

        if(okSub){
            okSub.textContent =
                `${planLine}. Disfruta de muchos beneficios al pertenecer al mundo BVros: podrás disfrutar, aprender, trabajar y darle un nuevo camino a tu marca personal. Deseo disfrutes de los beneficios y de la música de alta calidad, hecha con pasión por el arte.`;
        }


        showView('ok');

        clearTimeout(afterAuth._timer);

        afterAuth._timer =
            setTimeout(() => {

                bvWelcomeLine =
                    null;

                closeGate(true);

            }, 60000);

    }else{

        showView('complete');
        fillRoles();

    }

}


function openGate(context = null){

    buildGate();

    const title =
        gateRoot.querySelector(
            '[data-ref="title"]'
        );

    const sub =
        gateRoot.querySelector(
            '[data-ref="sub"]'
        );


    const titles = {

        stream:
            'Para acceder a este contenido inicia sesión o suscríbete',

        compra:
            'Para comprar, inicia sesión o suscríbete',

        academy:
            'Para acceder a este curso inicia sesión o suscríbete',

        artista:
            'Para acceder a este artista inicia sesión o suscríbete',

        suscripcion:
            'Suscríbete al plan BVros',

        distribucion:
            'Distribución exclusiva para suscriptores verificados'

    };

    title.textContent =
        titles[context] || titles.stream;


    if(context === 'suscripcion'){

        sub.textContent =
            'Desbloquea el catálogo completo, álbumes exclusivos y 50% de descuento en productos.';

    }else if(context === 'distribucion'){

        sub.textContent =
            'Distribución bajo términos de condición y solicitud previa, revisión de datos y de admisión. BVros se reserva el derecho de admisión.';

    }else{

        sub.textContent =
            'Nivel 1 · acceso de espectador externo';

    }


    const auth =
        window.BVrosAuth;


    if(
        auth?.isAuthenticated() &&
        auth.profile &&
        !auth.profile.profile_chosen
    ){

        title.textContent =
            'Completa tu perfil para activar tu nivel 2';

        sub.textContent =
            'Cuenta conectada ✔ — elige tu identidad y tu perfil en BVros';

        showView('complete');

        fillRoles();

    }else if(context === 'suscripcion'){

        showView('suscribe');

    }else{

        showView('login');

    }


    gateRoot.classList.add('open');

}


function closeGate(resolved = false){

    if(!gateRoot) return;

    gateRoot.classList.remove('open');

    if(resolveGate){

        const r =
            resolveGate;

        resolveGate =
            null;

        r(
            resolved
                ? window.BVrosAuth.user
                : null
        );

    }

}


/* =========================================================
   API PÚBLICA
========================================================= */

window.BVrosGate = {

    open: openGate,

    close: () => closeGate(),

    requireAuth(context){

        if(
            window.BVrosAuth?.isAuthenticated()
        ){
            return Promise.resolve(
                window.BVrosAuth.user
            );
        }

        return new Promise(resolve => {

            resolveGate =
                resolve;

            openGate(context);

        });

    }

};


/* =========================================================
   BOTÓN INICIO / CHIP DE SESIÓN EN EL NAV
========================================================= */

function syncNavAuth(){

    const links =
        document.querySelector('.hub-links');

    if(!links) return;


    links
        .querySelectorAll('[data-bvros-auth]')
        .forEach(n => n.remove());


    const auth =
        window.BVrosAuth;


    if(
        auth &&
        auth.isAuthenticated()
    ){

        const chip =
            document.createElement('span');

        chip.className =
            'bv-auth-chip';

        chip.setAttribute(
            'data-bvros-auth',
            'true'
        );

        const displayName =
            auth.profile?.username
                || auth.user.email;

        const avatarHtml =
            auth.profile?.avatar_url
                ? `<img src="${auth.profile.avatar_url}" alt="">`
                : `<svg viewBox="0 0 24 24" fill="currentColor">
                     <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                   </svg>`;


        chip.innerHTML = `

            <button
                class="bv-auth-trigger"
                type="button"
            >
                <span class="bv-auth-avatar">
                    ${avatarHtml}
                </span>
                <span class="bv-auth-name">
                    ${displayName}
                </span>
            </button>

            <div class="bv-auth-menu">

                <div class="bv-menu-view" data-view="main">

                    <div class="bv-auth-menu-head">
                        <div class="m-name">
                            ${displayName}
                        </div>
                        <div class="m-mail">
                            ${auth.user.email}
                        </div>
                        <span class="m-plan">
                            ${planBadge()}
                        </span>
                    </div>

                    <button
                        class="m-item"
                        data-menu="perfil"
                        type="button"
                    >Perfil</button>

                    <button
                        class="m-item"
                        data-menu="editar"
                        type="button"
                    >Editar</button>

                    <button
                        class="m-item"
                        data-menu="suscribir"
                        type="button"
                    >Suscríbete</button>

                    <button
                        class="m-item"
                        data-menu="soporte"
                        type="button"
                    >Contacto a soporte</button>

                    <button
                        class="m-item"
                        data-menu="salir"
                        type="button"
                    >Salir</button>

                    <button
                        class="m-item"
                        data-menu="legal"
                        type="button"
                    >Legal</button>

                </div>


                <div class="bv-menu-panel" data-view="perfil">

                    <button
                        class="bv-menu-back"
                        data-menu="main"
                        type="button"
                    >← Volver</button>

                    <label>Nombre de usuario</label>
                    <input
                        type="text"
                        value="${auth.profile?.username || ''}"
                        readonly
                        style="opacity:.6;"
                    >

                    <label>Correo</label>
                    <input
                        type="text"
                        value="${auth.user.email}"
                        readonly
                        style="opacity:.6;"
                    >

                    <label>Estado</label>
                    <input
                        type="text"
                        value="${planBadge()}"
                        readonly
                        style="opacity:.6;"
                    >

                </div>


                <div class="bv-menu-panel" data-view="editar">

                    <button
                        class="bv-menu-back"
                        data-menu="main"
                        type="button"
                    >← Volver</button>

                    <label>Foto de perfil</label>
                    <div class="bv-avatar-upload">

                        <span
                            class="bv-auth-avatar bv-avatar-preview"
                            data-ref="avatarPreview"
                        >${
                            auth.profile?.avatar_url
                                ? `<img src="${auth.profile.avatar_url}" alt="">`
                                : `<svg viewBox="0 0 24 24" fill="currentColor">
                                     <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                                   </svg>`
                        }</span>

                        <button
                            class="bv-avatar-btn"
                            data-act="pick-avatar"
                            type="button"
                        >Subir foto</button>

                        <button
                            class="bv-avatar-btn"
                            data-act="remove-avatar"
                            type="button"
                        >Quitar</button>

                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            data-ref="avatarFile"
                            hidden
                        >

                    </div>

                    <label>Nombre artístico</label>
                    <input
                        type="text"
                        data-edit="artist_name"
                        value="${auth.profile?.artist_name || ''}"
                        placeholder="Tu nombre artístico"
                    >

                    <label>Instrumento principal</label>
                    <select data-edit="main_instrument">

                        ${
                            [
                                '',
                                'Canto',
                                'Guitarra',
                                'Piano',
                                'Batería',
                                'Bajo',
                                'Violín',
                                'Brass (vientos)',
                                'Consola'
                            ]
                            .map(i =>
                                `<option ${
                                    auth.profile?.main_instrument === i
                                        ? 'selected'
                                        : ''
                                }>${i || '— Seleccionar —'}</option>`
                            )
                            .join('')
                        }

                    </select>

                    <button
                        class="bv-menu-save"
                        data-act="save-edit"
                        type="button"
                    >GUARDAR CAMBIOS</button>

                    <div class="bv-menu-ok" data-ref="okEdit"></div>
                    <div class="bv-menu-err" data-ref="errEdit"></div>

                </div>


                <div class="bv-menu-panel" data-view="soporte">

                    <button
                        class="bv-menu-back"
                        data-menu="main"
                        type="button"
                    >← Volver</button>

                    <label>Requerimiento</label>
                    <input
                        type="text"
                        data-sup="subject"
                        placeholder="Ej: restaurar clave, problema de pago..."
                    >

                    <label>Detalles</label>
                    <textarea
                        data-sup="details"
                        placeholder="Describe tu caso..."
                    ></textarea>

                    <label>Teléfono</label>
                    <input
                        type="tel"
                        data-sup="phone"
                        placeholder="+593..."
                    >

                    <label>Correo</label>
                    <input
                        type="email"
                        data-sup="email"
                        value="${auth.user.email}"
                    >

                    <label>Observaciones</label>
                    <textarea
                        data-sup="notes"
                        placeholder="Info adicional..."
                    ></textarea>

                    <button
                        class="bv-menu-save"
                        data-act="send-support"
                        type="button"
                    >ENVIAR A SOPORTE</button>

                    <div class="bv-menu-ok" data-ref="okSup"></div>
                    <div class="bv-menu-err" data-ref="errSup"></div>

                </div>


                <div class="bv-menu-panel" data-view="legal">

                    <button
                        class="bv-menu-back"
                        data-menu="main"
                        type="button"
                    >← Volver</button>

                    <a
                        class="m-item"
                        href="privacy.html"
                    >Aviso de Privacidad</a>

                    <a
                        class="m-item"
                        href="terms.html"
                    >Términos de servicio</a>

                </div>

            </div>

        `;


        /* ---- Lógica del menú ---- */

        const menu =
            chip.querySelector('.bv-auth-menu');


        chip.querySelector('.bv-auth-trigger')
            .addEventListener(
                'click',
                event => {

                    event.stopPropagation();

                    menu.classList.toggle('open');

                }
            );

        document.addEventListener(
            'click',
            event => {

                if(
                    !chip.contains(event.target)
                ){
                    menu.classList.remove('open');
                }

            }
        );


        chip
            .querySelectorAll('[data-menu]')
            .forEach(btn => {

                btn.addEventListener(
                    'click',
                    () => {

                        const target =
                            btn.dataset.menu;


                        if(target === 'salir'){
                            auth.logout();
                            return;
                        }


                        if(target === 'suscribir'){
                            menu.classList.remove('open');
                            openGate('suscripcion');
                            return;
                        }


                        menu
                            .querySelectorAll('[data-view]')
                            .forEach(v => {

                                v.style.display =
                                    v.dataset.view === target
                                        ? 'block'
                                        : 'none';

                            });

                    }
                );

            });


        menu
            .querySelector('[data-view="main"]')
            .style.display =
                'block';


        /* Guardar edición de perfil */

        chip.querySelector('[data-act="save-edit"]')
            .addEventListener(
                'click',
                async () => {

                    const okEl =
                        chip.querySelector('[data-ref="okEdit"]');

                    const errEl =
                        chip.querySelector('[data-ref="errEdit"]');

                    okEl.textContent = '';

                    errEl.textContent = '';

                    try{

                        const { error } =
                            await supabase
                                .from('profiles')
                                .update({
                                    artist_name:
                                        chip.querySelector(
                                            '[data-edit="artist_name"]'
                                        ).value.trim(),

                                    main_instrument:
                                        chip.querySelector(
                                            '[data-edit="main_instrument"]'
                                        ).value
                                })

                                .eq(
                                    'id',
                                    auth.user.id
                                );

                        if(error) throw error;

                        okEl.textContent =
                            'Cambios guardados ✔';

                    }catch(error){

                        errEl.textContent =
                            error.message;

                    }

                }
            );


        /* Subida directa de foto */

        chip.querySelector('[data-act="pick-avatar"]')
            .addEventListener(
                'click',
                () => {

                    chip.querySelector(
                        '[data-ref="avatarFile"]'
                    ).click();

                }
            );

        chip.querySelector('[data-ref="avatarFile"]')
            .addEventListener(
                'change',
                async event => {

                    const file =
                        event.target.files[0];

                    if(!file) return;


                    const errEl =
                        chip.querySelector('[data-ref="errEdit"]');

                    errEl.textContent = '';


                    if(file.size > 2 * 1024 * 1024){
                        errEl.textContent =
                            'La imagen supera 2 MB.';
                        return;
                    }


                    try{

                        errEl.textContent =
                            'Subiendo foto…';

                        const path =
                            `${auth.user.id}/avatar`;

                        const { error: upError } =
                            await supabase
                                .storage
                                .from('Avatars')
                                .upload(
                                    path,
                                    file,
                                    {
                                        contentType:
                                            file.type,

                                        upsert:
                                            true
                                    }
                                );

                        if(upError) throw upError;


                        const { data: urlData } =
                            supabase
                                .storage
                                .from('Avatars')
                                .getPublicUrl(path);


                        await supabase
                            .from('profiles')
                            .update({
                                avatar_url:
                                    urlData.publicUrl
                            })

                            .eq('id', auth.user.id);


                        await window.BVrosAuth.refreshProfile();

                    }catch(error){

                        errEl.textContent =
                            'No se pudo subir: ' +
                            (error.message || 'intenta otra imagen');

                    }

                }
            );


        /* Quitar foto */

        chip.querySelector('[data-act="remove-avatar"]')
            .addEventListener(
                'click',
                async () => {

                    const errEl =
                        chip.querySelector('[data-ref="errEdit"]');

                    try{

                        const { data: files } =
                            await supabase
                                .storage
                                .from('Avatars')
                                .list(auth.user.id);

                        if(files?.length){

                            await supabase
                                .storage
                                .from('Avatars')
                                .remove(
                                    files.map(
                                        f =>
                                            `${auth.user.id}/${f.name}`
                                    )
                                );

                        }

                        await supabase
                            .from('profiles')
                            .update({
                                avatar_url:
                                    null
                            })

                            .eq('id', auth.user.id);


                        await window.BVrosAuth.refreshProfile();

                    }catch(error){

                        errEl.textContent =
                            'No se pudo eliminar: ' +
                            error.message;

                    }

                }
            );


        /* Enviar a soporte */

        chip.querySelector('[data-act="send-support"]')
            .addEventListener(
                'click',
                async () => {

                    const okEl =
                        chip.querySelector('[data-ref="okSup"]');

                    const errEl =
                        chip.querySelector('[data-ref="errSup"]');

                    okEl.textContent = '';

                    errEl.textContent = '';

                    try{

                        const { error } =
                            await supabase
                                .from('support_tickets')
                                .insert({
                                    user_id:
                                        auth.user.id,

                                    email:
                                        chip.querySelector('[data-sup="email"]').value,

                                    subject:
                                        chip.querySelector('[data-sup="subject"]').value,

                                    details:
                                        chip.querySelector('[data-sup="details"]').value,

                                    phone:
                                        chip.querySelector('[data-sup="phone"]').value,

                                    notes:
                                        chip.querySelector('[data-sup="notes"]').value
                                });

                        if(error) throw error;

                        okEl.textContent =
                            'Enviado ✔ Soporte te responderá al correo.';

                    }catch(error){

                        errEl.textContent =
                            error.message;

                    }

                }
            );

        links.appendChild(chip);

    }else{

        const btn =
            document.createElement('button');

        btn.className =
            'bv-auth-login';

        btn.setAttribute(
            'data-bvros-auth',
            'true'
        );

        btn.type =
            'button';

        btn.textContent =
            'INICIO';

        btn.addEventListener(
            'click',
            () => openGate('stream')
        );

        links.appendChild(btn);

    }

}


/* =========================================================
   DETECTOR AUTOMÁTICO (sesión, Google redirect,
   intención de pago pendiente)
========================================================= */

syncNavAuth();

window.addEventListener(
    'bvros:navigated',
    () => syncNavAuth()
);

window.addEventListener(
    'bvros:authstate',
    () => {

        syncNavAuth();

        const auth =
            window.BVrosAuth;

        if(!auth) return;


        const authed =
            auth.isAuthenticated();

        const profileOK =
            authed &&
            auth.profile?.profile_chosen;


        /* 1) Volver de Google con nivel elegido:
             abrir pasarela lista para pagar */

        const pendingLevel =
            sessionStorage.getItem('bvros_pay_plan');

        if(profileOK && pendingLevel){

            payPlan =
                pendingLevel;

            sessionStorage.removeItem('bvros_pay_plan');

            openGate('suscripcion');

            return;

        }


        /* 2) Volver de Google con intención promo
             (código BVLUX170): abrir pasarela */

        const savedIntent =
            sessionStorage.getItem('bvros_pay_intent');

        if(profileOK && savedIntent){

            try{

                payIntent =
                    JSON.parse(savedIntent);

                payPlan =
                    payIntent.plan;

                sessionStorage.removeItem(
                    'bvros_pay_intent'
                );

                openGate('suscripcion');

                return;

            }catch(error){

                sessionStorage.removeItem(
                    'bvros_pay_intent'
                );

            }

        }


        /* 3) Perfil incompleto o inexistente:
             formulario solo */

        if(
            authed &&
            (!auth.profile || !auth.profile.profile_chosen)
        ){

            openGate('stream');

            gateRoot
                .querySelector('[data-ref="title"]')
                .textContent =
                    'Completa tu perfil para activar tu nivel 2';

            gateRoot
                .querySelector('[data-ref="sub"]')
                .textContent =
                    'Cuenta conectada ✔ — elige tu identidad y tu perfil en BVros';

            showView('complete');

            fillRoles();

        }

    }
);