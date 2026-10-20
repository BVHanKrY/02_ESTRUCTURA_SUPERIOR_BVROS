/* =========================================================
   BVROS GATE — 2B.8 · FIX VISUAL DEL BOTÓN VOLVER
   (sobre tu 2B.7 — anti-persistencia, aviso rojo,
   reglas de salida y webhook-ready intactos)
   NUEVO EN 2B.8:
     · El botón VOLVER (←) ya NO queda debajo del
       texto «BVROS · ACCESO»: cuando el botón está
       en pantalla, el texto se desplaza a la derecha
       y la esquina queda libre y legible.
     · Además el botón lleva fondo del panel: aunque
       algún texto pasara cerca, el ← siempre se ve.
   NUEVO 1 · LOS PROCESOS ABANDONADOS YA NO MOLESTAN:
     · Al recargar con un proceso inconcluso (pago a
       medias o perfil sin elegir), la interfaz se
       despliega UNA SOLA VEZ más (reanudación).
     · Si el usuario desiste otra vez, en la siguiente
       recarga NO se abre ningún modal: aparece UNA
       ÚNICA VEZ un aviso fijo con letras rojas
       «COMPLETA EL PROCESO DE REGISTRO» y botones
       directos debajo (continuar pago / completar
       perfil).
     · Desde ahí, SILENCIO TOTAL: nada vuelve a
       abrirse solo en más recargas. El usuario decide
       desde el botón INICIO o SUSCRIBIRSE.
   NUEVO 2 · Preparado para el webhook de PayPal:
     cuando actives WEBHOOK_ACTIVO en payments-
     service.js, el nivel lo activa el SERVIDOR
     (Edge Function) y no el navegador.
   ========================================================= */

console.log("[BVros Gate] versión 2B.8 activa");

import { BVrosAuth, supabase, PROFILE_ROLES } from "./services/auth-service.js";

import "./services/payments-service.js";

/* =========================================================
   ESTILOS
========================================================= */

const STYLE = document.createElement("style");

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
    max-height:94vh;
    overflow:auto;
    background:var(--surface,#14100C);
    border:1px solid var(--accent,#F97316);
    padding:26px 24px 22px;
    position:relative;
    color:var(--text,#F2EDE4);
}

.bv-gate-panel.suscribe-mode{
    max-width:
        94vw;

    width:
        94vw;

    padding:
        20px 16px;
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
    z-index:2;
}
.bv-gate-close:hover{
    color:var(--accent,#F97316);
    border-color:var(--accent,#F97316);
}

.bv-gate-back{
    position:absolute;
    top:10px; left:12px;
    width:30px; height:30px;
    border:1px solid var(--border,#2A2119);
    /* 2B.8: fondo del panel — el botón SIEMPRE es
       legible, ningún texto puede atravesarlo. */
    background:var(--surface,#14100C);
    color:var(--text-muted,#9A8D7D);
    font-size:15px;
    cursor:pointer;
    z-index:2;
}
.bv-gate-back:hover{
    color:var(--accent,#F97316);
    border-color:var(--accent,#F97316);
}

/* 2B.8 · ESQUINA DEL VOLVER LIBRE:
   mientras el botón ← está en pantalla (clase
   has-back que showView() activa/desactiva), el
   eyebrow «BVROS · ACCESO» se desplaza a la derecha
   para no quedar debajo del botón. 26px cubre el
   padding del panel normal (24px) y del modo
   suscribe (16px). */
.bv-gate-panel.has-back .bv-gate-eyebrow{
    padding-left:26px;
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

.bv-compound{
    text-align:
        center;

    margin:
        0 0 4px;

    line-height:
        1.35;
}

/* TAMAÑO DE LETRA DEL TÍTULO COMPUESTO (configúralo aquí):
     · "Regístrate Gratis"   → .bv-compound .c-plain
     · "Accede a beneficios"   → .bv-compound .c-big
   Sube o baja el font-size de cada bloque. */

.bv-compound .c-plain{
    font-family:
        'Orbitron', sans-serif;

    color:
        #FFFFFF;

    font-size:
        1.2rem;

    font-weight:
        500;

    display:
        block;
}

.bv-compound .c-big{
    font-family:
        'Orbitron', sans-serif;

    font-size:
        1.00rem;

    font-weight:
        700;

    color:
        #FFFFFF;

    display:
        inline-block;

    margin:
        0 3px;
}

.bv-compound .c-big.second{
    font-size:
        .9rem;

    color:
        var(--text-muted,#9A8D7D);

    margin:
        0;
}

.bv-gate-sub{
    text-align:
        center;

    color:
        var(--text-muted,#9A8D7D);

    font-size:
        .68rem;

    margin:
        0 0 14px;
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

.bv-complete-head{
    margin:
        22px 0 4px;

    text-align:
        center;
}

.bv-complete-head h4{
    font-family:
        'Orbitron', sans-serif;

    font-size:
        1.15rem;

    font-weight:
        700;

    color:
        #FFFFFF;

    margin:
        0 0 6px;
}

.bv-complete-head p{
    color:
        var(--accent,#F97316);

    font-size:
        .68rem;

    margin:
        0;

    line-height:
        1.5;
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

.bv-gate-err{
    margin-top:10px;
    color:#F87171;
    font-size:.7rem;
    min-height:1em;
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

.bv-gate-note{
    margin-top:10px;
    color:var(--text-muted,#9A8D7D);
    font-size:.6rem;
    line-height:1.5;
}

.bv-sus-title{
    font-family:
        'Orbitron', sans-serif;

    font-size:
        1.5rem;

    font-weight:
        700;

    color:
        #FFFFFF;

    text-align:
        center;

    margin:
        4px 0 18px;
}

.bv-plans-grid{
    display:
        grid;

    grid-template-columns:
        repeat(3, 1fr);

    gap:
        16px;
}

.bv-plan{
    border:
        3px solid #FFD700;

    background:
        rgba(20,16,12,.9);

    padding:
        18px 14px;

    text-align:
        center;

    cursor:
        pointer;

    color:
        var(--text,#F2EDE4);

    transition:
        transform .15s ease,
        box-shadow .15s ease;
}

.bv-plan:hover{
    transform:
        translateY(-4px);

    box-shadow:
        0 6px 22px rgba(255,215,0,.18);
}

.bv-plan.on{
    box-shadow:
        0 0 0 2px var(--accent,#F97316),
        0 6px 22px rgba(255,215,0,.25);
}

.bv-plan .p-eyebrow{
    font-family:
        var(--mono, monospace);

    font-size:
        .5rem;

    letter-spacing:
        .18em;

    color:
        var(--accent,#F97316);

    text-align:
        left;
}

.bv-plan .p-title{
    font-family:
        'Orbitron', sans-serif;

    font-size:
        .85rem;

    font-weight:
        700;

    color:
        #FFFFFF;

    margin:
        10px 0 2px;
}

.bv-plan .p-connect{
    color:
        var(--text-muted,#9A8D7D);

    font-size:
        .55rem;

    margin-bottom:
        10px;
}

.bv-plan .p-name{
    color:
        var(--accent,#F97316);

    font-size:
        .95rem;

    font-weight:
        700;

    margin-bottom:
        8px;
}

.bv-plan .p-price{
    font-family:
        'Orbitron', sans-serif;

    font-size:
        1.3rem;

    font-weight:
        800;

    color:
        #FFFFFF;

    text-align:
        left;
}

.bv-plan .p-price em{
    font-style:
        normal;

    font-size:
        .7rem;

    font-weight:
        400;

    color:
        var(--text-muted,#9A8D7D);
}

.bv-plan .p-std{
    font-size:
        .55rem;

    color:
        var(--text-muted,#9A8D7D);

    text-align:
        left;

    margin-bottom:
        12px;
}

.bv-plan ul{
    margin:
        0 0 16px;

    padding:
        0;

    list-style:
        none;

    text-align:
        left;
}

.bv-plan li{
    font-size:
        .62rem;

    line-height:
        1.6;

    padding-left:
        14px;

    position:
        relative;
}

.bv-plan li::before{
    content:
        '▸';

    position:
        absolute;

    left:
        0;

    color:
        var(--accent,#F97316);
}

.bv-plan .p-select{
    display:
        block;

    width:
        100%;

    padding:
        9px;

    background:
        #FFD700;

    border:
        none;

    font-family:
        'Orbitron', sans-serif;

    font-weight:
        800;

    font-size:
        .8rem;

    letter-spacing:
        .05em;

    color:
        #000;

    cursor:
        pointer;
}

.bv-plan .p-select:hover{
    filter:
        brightness(1.08);
}

.bv-sus-google{
    max-width:
        460px;

    margin:
        18px auto 0;
}

@media(max-width:900px){
    .bv-plans-grid{
        grid-template-columns:
            1fr;
    }

    .bv-gate-panel.suscribe-mode{
        max-width:
            96vw;

        width:
            96vw;

        padding:
            16px 10px;
    }

    .bv-sus-title{
        font-size:
            1.15rem;
    }
}

/* Interfaz individual por nivel */

.bv-ind{
    text-align:
        center;
}

.bv-ind .ind-title{
    font-family:
        'Orbitron', sans-serif;

    font-size:
        1.25rem;

    font-weight:
        700;

    color:
        #FFFFFF;

    margin:
        6px 0 4px;
}

.bv-ind .ind-connect{
    color:
        var(--text-muted,#9A8D7D);

    font-size:
        .6rem;

    margin-bottom:
        10px;
}

.bv-ind .ind-name{
    color:
        var(--accent,#F97316);

    font-size:
        1.05rem;

    font-weight:
        700;

    margin-bottom:
        8px;
}

.bv-ind .ind-price{
    font-family:
        'Orbitron', sans-serif;

    font-size:
        1.35rem;

    font-weight:
        800;

    color:
        #FFFFFF;

    text-align:
        left;
}

.bv-ind .ind-price em{
    font-style:
        normal;

    font-size:
        .7rem;

    font-weight:
        400;

    color:
        var(--text-muted,#9A8D7D);
}

.bv-ind .ind-std{
    font-size:
        .58rem;

    color:
        var(--text-muted,#9A8D7D);

    text-align:
        left;

    margin-bottom:
        14px;
}

.bv-ind ul{
    margin:
        0 0 18px;

    padding:
        0;

    list-style:
        none;

    text-align:
        left;
}

.bv-ind li{
    font-size:
        .65rem;

    line-height:
        1.7;

    padding-left:
        15px;

    position:
        relative;

    margin-bottom:
        4px;
}

.bv-ind li::before{
    content:
        '▸';

    position:
        absolute;

    left:
        0;

    color:
        var(--accent,#F97316);
}

.bv-ind .ind-register{
    display:
        block;

    width:
        100%;

    padding:
        12px;

    background:
        #FFD700;

    border:
        none;

    font-family:
        'Orbitron', sans-serif;

    font-weight:
        800;

    font-size:
        .85rem;

    letter-spacing:
        .05em;

    color:
        #000;

    cursor:
        pointer;

    text-decoration:
        none;
}

.bv-ind .ind-register:hover{
    filter:
        brightness(1.08);
}

.bv-ind .ind-promo{
    display:
        block;

    width:
        100%;

    margin-bottom:
        14px;

    padding:
        12px;

    background:
        var(--accent,#F97316);

    border:
        none;

    font-family:
        'Orbitron', sans-serif;

    font-weight:
        800;

    font-size:
        .75rem;

    letter-spacing:
        .06em;

    color:
        #000;

    cursor:
        pointer;
}

.bv-ind .ind-promo:hover{
    filter:
        brightness(1.08);
}

.bv-ind .ind-promo-box{
    margin-bottom:
        14px;

    text-align:
        left;
}

#bvPayContainer{
    margin-top:
        6px;

    min-height:
        52px;
}

/* Chip + menú de usuario */

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

.bv-art-lock{
    margin:0 0 12px;
    padding:10px 12px;
    border:1px solid var(--border,#2A2119);
    border-left:3px solid var(--accent,#F97316);
    color:var(--text-muted,#9A8D7D);
    font-size:.62rem;
    line-height:1.6;
}

.bv-menu-panel input:disabled,
.bv-menu-panel select:disabled{
    opacity:.45;
    cursor:not-allowed;
}

/* BIENVENIDA (vista ok): formato único para los
     cuatro casos. Título MIEMBRO configurable aquí:
     color dorado #FFD700, tamaño y centro. */

.bv-welcome-plan{
    text-align:center;
    color:var(--accent,#F97316);
    font-size:.72rem;
    letter-spacing:.04em;
    line-height:1.5;
    margin:2px 0 12px;
}

.bv-welcome-member{
    font-family:'Orbitron', sans-serif;
    font-size:clamp(1.35rem, 6vw, 1.9rem);
    font-weight:800;
    color:#FFD700;
    text-align:center;
    letter-spacing:.03em;
    line-height:1.25;
    margin:0 0 16px;
}

.bv-welcome-text{
    color:var(--text-muted,#9A8D7D);
    font-size:.68rem;
    line-height:1.8;
    text-align:justify;
    margin:0 0 8px;
}

/* PANTALLA "LAMENTAMOS": párrafos justificados,
     todos los renglones alineados a la misma altura */

.bv-block-p{
    color:var(--text-muted,#9A8D7D);
    font-size:.68rem;
    line-height:1.8;
    text-align:justify;
    margin:0 0 12px;
}

/* AVISO ROJO DE REGISTRO INCONCLUSO (una sola vez).
     NO es un modal: vive FUERA del gate, abajo en
     pantalla, no bloquea nada y no reaparece en las
     siguientes recargas. */

.bv-pending-notice{
    position:fixed;
    left:50%;
    bottom:18px;
    transform:translateX(-50%);
    width:min(430px, 92vw);
    background:#FFFFFF;
    border:2px solid #D32F2F;
    border-radius:14px;
    box-shadow:0 12px 34px rgba(0,0,0,.35);
    padding:16px 16px 14px;
    z-index:9400;
    text-align:center;
}
.bv-pending-x{
    position:absolute;
    top:8px; right:10px;
    width:26px; height:26px;
    border:1px solid #E0E0E0;
    background:none;
    color:#9E9E9E;
    font-size:13px;
    cursor:pointer;
}
.bv-pending-x:hover{
    color:#D32F2F;
    border-color:#D32F2F;
}
.bv-pending-title{
    font-family:'Orbitron', sans-serif;
    font-size:clamp(.9rem, 4vw, 1.05rem);
    font-weight:800;
    letter-spacing:.04em;
    color:#D32F2F;
    line-height:1.35;
    margin:0 0 6px;
}
.bv-pending-sub{
    color:#555555;
    font-size:.68rem;
    line-height:1.6;
    margin:0 0 12px;
}
.bv-pending-actions{
    display:flex;
    flex-direction:column;
    gap:8px;
}
.bv-pending-actions button{
    width:100%;
    padding:10px 12px;
    border:1px solid #111111;
    background:#111111;
    color:#FFFFFF;
    font-family:'Orbitron', sans-serif;
    font-size:.66rem;
    letter-spacing:.08em;
    cursor:pointer;
}
.bv-pending-actions button.bv-pending-primary{
    background:#D32F2F;
    border-color:#D32F2F;
}
.bv-pending-actions button:hover{
    opacity:.88;
}

`;

document.head.appendChild(STYLE);

/* =========================================================
   ESTADO
========================================================= */

let gateRoot = null;

let chosenType = "perfil1";

let resolveGate = null;

let payPlan = null;

let payIntent = null;

let bvWelcomeLine = null;

let promoActive = false;

let currentView = null;

/* Arranque de página: el PRIMER evento authstate tras
     cargar decide si un proceso inconcluso se re-abre
     (una sola vez) o pasa al aviso rojo (también una
     sola vez). Los eventos siguientes de la misma
     sesión son continuación legítima del flujo. */

let bvBootAuthHandled = false;

function planBadge() {
  const auth = window.BVrosAuth;

  if (!auth?.profile) return "";

  /* Nivel real guardado en profiles.subscription_tier.
       Cuentas premium antiguas (sin tier): se deduce
       del perfil asignado. */

  const tier =
    auth.profile.subscription_tier ||
    (auth.profile.plan === "premium"
      ? auth.profile.profile_type === "perfil2"
        ? "nivel3"
        : "nivel2"
      : "nivel1");

  if (tier === "nivel3") {
    return "SUSCRIPCIÓN CREADOR AVANZADO · $4.75/MES";
  }

  if (tier === "nivel2_promo") {
    return "PROMOCIÓN CREADOR AVANZADO · $1.70/MES";
  }

  if (tier === "nivel2") {
    return "SUSCRIPCIÓN OYENTE EXPERTO · $3.99/MES";
  }

  return "MIEMBRO GRATUITO";
}

function setRef(ref, text, asHTML = false) {
  if (!gateRoot) return;

  const el = gateRoot.querySelector(`[data-ref="${ref}"]`);

  if (!el) return;

  if (asHTML) {
    el.innerHTML = text;
  } else {
    el.textContent = text;
  }
}

/* =========================================================
   PROCESO INCONCLUSO (anti-persistencia + aviso rojo)
   La memoria vive en localStorage: sobrevive recargas
   y cierres del navegador (sessionStorage no basta).
     step    → qué proceso quedó a medias:
               "pay:nivel2" | "pay:nivel3" | "complete"
     boots   → cuántas veces se RE-desplegó solo el
               modal en arranques de página.
     noticed → si el aviso rojo ya se mostró (una única
               vez por proceso).
========================================================= */

const PENDING_KEY = "bvros_pending_flow";

function readPendingFlow() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || "null");
  } catch (_) {
    return null;
  }
}

function writePendingFlow(rec) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(rec));
  } catch (_) {
    /* localStorage bloqueado: el aviso simplemente
         no podrá recordar el proceso. Nada se rompe. */
  }
}

function clearPendingFlow() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch (_) {}

  hidePendingNotice();
}

function hidePendingNotice() {
  document.querySelectorAll(".bv-pending-notice").forEach((n) => n.remove());
}

/* AVISO ROJO — se muestra UNA sola vez por proceso:
     título rojo «COMPLETA EL PROCESO DE REGISTRO» +
     botones directos debajo. Al pulsar un botón el
     gate se abre en el paso exacto donde se quedó. */

function showPendingNotice(step, tier) {
  hidePendingNotice();

  const box = document.createElement("div");

  box.className = "bv-pending-notice";

  box.setAttribute("role", "alert");

  const subTexto =
    step === "pay"
      ? "Tienes un pago de tu suscripción BVLUX inconcluso. Continúalo donde lo dejaste o revisa los planes."
      : "Tu cuenta ya fue creada. Solo falta elegir tu perfil para activar tus beneficios.";

  const acciones =
    step === "pay"
      ? `<button type="button" class="bv-pending-primary" data-pn="seguir">CONTINUAR MI PAGO</button>
         <button type="button" data-pn="planes">VER PLANES</button>`
      : `<button type="button" class="bv-pending-primary" data-pn="perfil">COMPLETAR MI PERFIL</button>`;

  box.innerHTML =
    `<button type="button" class="bv-pending-x" data-pn="cerrar" aria-label="Cerrar aviso">✕</button>` +
    `<div class="bv-pending-title">COMPLETA EL PROCESO DE REGISTRO</div>` +
    `<div class="bv-pending-sub">${subTexto}</div>` +
    `<div class="bv-pending-actions">${acciones}</div>`;

  box.addEventListener("click", (event) => {
    const what = event.target?.dataset?.pn;

    if (!what) return;

    event.preventDefault();

    if (what === "cerrar") {
      hidePendingNotice();

      return;
    }

    hidePendingNotice();

    if (what === "seguir" && tier) {
      payPlan = tier;

      sessionStorage.setItem("bvros_pay_plan", payPlan);

      openGate("suscripcion");

      openLevelView(payPlan);
    } else if (what === "planes") {
      openGate("suscripcion");
    } else if (what === "perfil") {
      openGate("stream");

      setRef("title", "Selecciona tu perfil a continuación");

      setRef(
        "sub",
        "Cuenta conectada ✓ — tu perfil determina tus beneficios y tu precio.",
      );

      showView("complete");

      fillRoles();
    }
  });

  document.body.appendChild(box);
}

/* =========================================================
   CONSTRUCCIÓN
========================================================= */

function buildGate() {
  if (gateRoot) return;

  gateRoot = document.createElement("div");

  gateRoot.className = "bv-gate";

  gateRoot.innerHTML = `

        <div class="bv-gate-panel">

            <button
                class="bv-gate-back"
                data-act="go-back"
                type="button"
                title="Volver"
                style="display:none;"
            >←</button>

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

            <h3 class="bv-compound" data-ref="compoundTitle">
                <span class="c-plain">Regístrate Gratis</span>
                <span class="c-big">Accede a Beneficios</span>
            </h3>

            <p class="bv-gate-sub" data-ref="sub">
                · Acceso de espectador externo · nivel 1 ·
            </p>

            <h3 class="bv-gate-title"
                data-ref="title"
                style="display:none;"
            ></h3>


            <div class="bv-gate-tabs" data-ref="tabs">

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

                <div class="bv-gate-div">REGÍSTRATE CON TU CORREO</div>

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


                <div class="bv-complete-head">

                    <h4>Completa tu perfil</h4>

                    <p>
                        Define tu identidad en BVros: tu perfil
                        determina el acceso a distribución,
                        perfil de artista, partner o socio
                        y beneficios.
                    </p>

                </div>


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
                            <li class="ok">Sube música</li>
                        </ul>
                    </button>

                </div>


                <label>Rol específico</label>
                <select data-f="role"></select>

                <button
                    class="bv-gate-submit"
                    data-act="do-signup"
                    type="button"
                >GUARDAR Y ENTRAR</button>

                <div class="bv-gate-err" data-ref="errSignup"></div>

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

            </div>


            <!-- COMPLETAR PERFIL (tras Google) -->

            <div data-view="complete" hidden>

                <div class="bv-complete-head">

                    <h4>Completa tu perfil</h4>

                    <p>
                        Cuenta conectada ✓ — tu perfil determina
                        tus beneficios dentro de BVros.
                    </p>

                </div>

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
                        <h4>PERFIL 1 · OYENTE</h4>
                        <ul>
                            <li class="ok">Streaming de catálogo</li>
                            <li class="ok">Plays y likes activos</li>
                            <li class="ok">Descuentos al suscribirte</li>
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
                            <li class="ok">Sube música</li>
                        </ul>
                    </button>

                </div>


                <label>Rol específico</label>
                <select data-f="role2"></select>

                <button
                    class="bv-gate-submit"
                    data-act="do-complete"
                    type="button"
                >GUARDAR Y ENTRAR</button>

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


            <!-- SUSCRIBIRSE (3 TARJETAS: SOLO MARCAN) -->

            <div data-view="suscribe" hidden>

                <h3 class="bv-sus-title">
                    Activar Suscripción
                </h3>


                <div class="bv-plans-grid">


                    <button
                        type="button"
                        class="bv-plan"
                        data-plan="nivel1"
                    >
                        <span class="p-eyebrow">
                            BVROS · ACCESO
                        </span>

                        <div class="p-title">
                            Activar tu nivel 1
                        </div>

                        <div class="p-connect">
                            Conectar Cuenta ✓
                        </div>

                        <div class="p-name">
                            Suscripción Expectador
                        </div>

                        <div class="p-price">
                            $ <em>Gratuito</em>
                        </div>

                        <div class="p-std">
                            Suscripción estándar
                        </div>

                        <ul>
                            <li>Acceso a álbumes lanzamientos
                                y música limitada</li>
                            <li>Streaming en línea</li>
                            <li>Cuenta de Usuario</li>
                            <li>Soporte al cliente 24/7 a través
                                de bvrosmusic@gmail.com</li>
                            <li>Ebook, Cursos, Clases online,
                                música, bajo cargo</li>
                        </ul>

                        <span class="p-select">
                            SELECCIONA
                        </span>

                    </button>


                    <button
                        type="button"
                        class="bv-plan"
                        data-plan="nivel2"
                    >
                        <span class="p-eyebrow">
                            BVROS · ACCESO
                        </span>

                        <div class="p-title">
                            Activar tu nivel 2
                        </div>

                        <div class="p-connect">
                            Conectar Cuenta ✓
                        </div>

                        <div class="p-name">
                            Suscripción Oyente Experto
                        </div>

                        <div class="p-price">
                            $3.99 <em>/mes · renovación automática</em>
                        </div>

                        <div class="p-std">
                            Suscripción estándar
                        </div>

                        <ul>
                            <li>Streaming de música exclusiva</li>
                            <li>Acceso a álbumes gestionados
                                por BVros</li>
                            <li>50% de descuento en productos
                                seleccionados (tienda y academy)</li>
                            <li>Ebook, Cursos, Clases online,
                                gratuitos</li>
                            <li>Acceso a partner o socios BVros.
                                Vendedores requieren perfil 2
                                y verificación</li>
                        </ul>

                        <span class="p-select">
                            SELECCIONA
                        </span>

                    </button>


                    <button
                        type="button"
                        class="bv-plan"
                        data-plan="nivel3"
                    >
                        <span class="p-eyebrow">
                            BVROS · ACCESO
                        </span>

                        <div class="p-title">
                            Activar tu nivel 3
                        </div>

                        <div class="p-connect">
                            Conectar Cuenta ✓
                        </div>

                        <div class="p-name">
                            Suscripción Creador Avanzado
                        </div>

                        <div class="p-price">
                            $4.75 <em>/mes · renovación automática</em>
                        </div>

                        <div class="p-std">
                            Suscripción estándar
                        </div>

                        <ul>
                            <li>Distribución de tu Música en BVros
                                Network Online</li>
                            <li>Acceso a álbumes, sencillos y
                                catálogo de música sin límites</li>
                            <li>Marketing personalizado dentro y
                                fuera de BVros Music Network</li>
                            <li>Perfil de artista</li>
                            <li>Acceso a partner o socios BVros.
                                Vendedores requieren perfil 2
                                y verificación</li>
                            <li>50% de descuento en todos los
                                productos exclusivos</li>
                            <li>Ebook, Cursos, Clases online,
                                gratuitos</li>
                        </ul>

                        <span class="p-select">
                            SELECCIONA
                        </span>

                    </button>

                </div>


                <div class="bv-gate-err" data-ref="errPay"></div>

                <div
                    data-ref="planHint"
                    style="color:#F97316;font-size:.75rem;line-height:1.5;margin:10px 0 0;text-align:center;min-height:1.2em;"
                ></div>

                <div class="bv-sus-google">

                    <a
                        class="bv-gate-google"
                        id="bvSusGoogle"
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

                </div>


                <p class="bv-gate-note">
                    Elige tu suscripción con SELECCIONA y luego
                    presiona Ingresar con Google. Pasarela de
                    pagos a través de PayPal, tarjeta de débito
                    o ahorros. Stripe en integración. Los datos
                    están protegidos contra fraude en estricto
                    régimen de leyes nacionales e internacionales.
                    La suscripción se renueva cada mes, un día
                    antes, contando desde la fecha de adquisición.
                </p>

            </div>


            <!-- ======== INDIVIDUAL: NIVEL 1 ======== -->

            <div data-view="nivel1" hidden>

                <div class="bv-ind">

                    <div class="ind-title">
                        Activar tu nivel 1
                    </div>

                    <div class="ind-connect">
                        Conectar Cuenta ✓
                    </div>

                    <div class="ind-name">
                        Suscripción Expectador
                    </div>

                    <div class="ind-price">
                        $ <em>Gratuito</em>
                    </div>

                    <div class="ind-std">
                        Suscripción estándar
                    </div>

                    <ul>
                        <li>Acceso a álbumes lanzamientos y
                            música limitada</li>
                        <li>Streaming en línea</li>
                        <li>Cuenta y Usuario</li>
                        <li>Soporte al cliente 24/7 a través de
                            bvrosmusic@gmail.com</li>
                        <li>Ebook, Cursos, Clases online, música,
                            bajo cargo</li>
                    </ul>

                    <button
                        class="ind-register"
                        data-act="register-nivel1"
                        type="button"
                    >REGISTRARSE</button>

                    <p class="bv-gate-note">
                        Pago mensual con PayPal o tarjeta de
                        débito/crédito. Producto digital: no
                        reembolsable una vez suscrito o descargado. Disputas:
                        primero vía administrativa (soporte bvrosmusic@gmail.com);
                        no se aceptan reclamos después de 30 días.
                        Reproducciones ilimitadas mientras tu
                        cuenta exista.
                    </p>

                </div>

            </div>


            <!-- ======== INDIVIDUAL: NIVEL 2 ======== -->

            <div data-view="nivel2" hidden>

                <div class="bv-ind">

                    <div class="ind-title">
                        Activar tu nivel 2
                    </div>

                    <div class="ind-connect">
                        Conectar Cuenta ✓
                    </div>

                    <div class="ind-name">
                        Suscripción Oyente Experto
                    </div>

                    <div class="ind-price">
                        <span data-ref="n2Price">$3.99</span>
                        <em>/mes · renovación automática</em>
                    </div>

                    <div class="ind-std">
                        Suscripción estándar
                    </div>

                    <ul>
                        <li>Streaming de música exclusiva</li>
                        <li>Acceso a álbumes gestionados
                            por BVros</li>
                        <li>50% de descuento en productos
                            seleccionados (tienda y academy)</li>
                        <li>Ebook, Cursos, Clases online,
                            gratuitos</li>
                        <li>Acceso a partner o socios BVros.
                            Vendedores requieren perfil 2
                            y verificación</li>
                    </ul>

                    <div id="bvPayN2"></div>

                    <p class="bv-gate-note">
                        Pago mensual con PayPal o tarjeta de
                        débito/crédito. Producto digital: no
                        reembolsable una vez suscrito o descargado. Disputas:
                        primero vía administrativa (soporte bvrosmusic@gmail.com);
                        no se aceptan reclamos después de 30 días.
                        Reproducciones ilimitadas mientras tu
                        cuenta exista.
                    </p>

                </div>

            </div>


            <!-- ======== INDIVIDUAL: NIVEL 3 ======== -->

            <div data-view="nivel3" hidden>

                <div class="bv-ind">

                    <div class="ind-title">
                        Activar tu nivel 3
                    </div>

                    <div class="ind-connect">
                        Conectar Cuenta ✓
                    </div>

                    <div class="ind-name">
                        Suscripción Creador Avanzado
                    </div>

                    <div class="ind-price">
                        <span data-ref="n3Price">$4.75</span>
                        <em>/mes · renovación automática</em>
                    </div>

                    <div class="ind-std">
                        Suscripción estándar
                    </div>

                    <ul>
                        <li>Distribución de tu Música en BVros
                            Network Online</li>
                        <li>Acceso a álbumes, sencillos y catálogo
                            de música sin límites</li>
                        <li>Marketing personalizado dentro y fuera
                            de BVros Music Network</li>
                        <li>Perfil de artista</li>
                        <li>Acceso a partner o socios BVros.
                            Vendedores requieren perfil 2
                            y verificación</li>
                        <li>50% de descuento en todos los productos
                            exclusivos</li>
                        <li>Ebook, Cursos, Clases online, gratuitos</li>
                    </ul>

                    <button
                        class="ind-promo"
                        data-act="open-promo"
                        type="button"
                    >CODIGO PROMOCIONAL</button>

                    <div
                        class="ind-promo-box"
                        id="bvPromoBox"
                        style="display:none;"
                    >
                        <label>Código de descuento</label>
                        <input
                            data-f="promoCode"
                            type="text"
                            placeholder="BVLUX170"
                        >
                        <button
                            class="bv-menu-save"
                            data-act="apply-promo"
                            type="button"
                        >APLICAR CÓDIGO</button>
                        <div class="bv-menu-ok" data-ref="okPromo"></div>
                        <div class="bv-menu-err" data-ref="errPromo"></div>
                    </div>

                    <div id="bvPayN3"></div>

                    <p class="bv-gate-note">
                        Pago mensual con PayPal o tarjeta de
                        débito/crédito. Producto digital: no
                        reembolsable una vez suscrito o descargado. Disputas:
                        primero vía administrativa (soporte bvrosmusic@gmail.com);
                        no se aceptan reclamos después de 30 días.
                        Reproducciones ilimitadas mientras tu
                        cuenta exista.
                    </p>

                </div>

            </div>


            <!-- BLOQUEADO (nivel 3) -->

            <div data-view="blocked" hidden>

                <h3 class="bv-gate-title"
                    style="color:#F87171;text-align:center;">
                    Lamentamos este inconveniente
                </h3>

                <p class="bv-block-p">
                    BVros se encuentra en fase de
                    experimentación y los beneficios a los
                    que quieres acceder están interrumpidos
                    o en fase de creación por el momento.
                    Apreciamos tu entusiasmo y queremos
                    darte la bienvenida a nuestra plataforma
                    con los brazos abiertos.
                </p>

                <p class="bv-block-p">
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
                    data-f="promoCode2"
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


            <!-- ÉXITO / BIENVENIDA -->

            <div data-view="ok" hidden>

                <p class="bv-welcome-plan" data-ref="okPlanLine"></p>

                <div class="bv-welcome-member" data-ref="okMember"></div>

                <p class="bv-welcome-text">
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
                    data-act="go-perfil"
                    type="button"
                    style="display:none;"
                >ELIGE TU PERFIL</button>

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

  const q = (sel) => gateRoot.querySelector(sel);

  gateRoot._ui = {
    compound: q('[data-ref="compoundTitle"]'),

    tabs: q(".bv-gate-tabs"),

    sub: q('[data-ref="sub"]'),

    errLogin: q('[data-ref="errLogin"]'),

    errSignup: q('[data-ref="errSignup"]'),

    errComplete: q('[data-ref="errComplete"]'),

    errPay: q('[data-ref="errPay"]'),

    errBlocked: q('[data-ref="errBlocked"]'),

    roleSelect: q('[data-f="role"]'),

    roleSelect2: q('[data-f="role2"]'),

    panel: q(".bv-gate-panel"),
  };

  /* Tabs */

  gateRoot.querySelectorAll(".bv-gate-tab").forEach((tab) => {
    tab.addEventListener("click", () => showView(tab.dataset.tab));
  });

  /* Perfiles */

  gateRoot.querySelectorAll("[data-type]").forEach((btn) => {
    btn.addEventListener("click", () => {
      chosenType = btn.dataset.type;

      gateRoot.querySelectorAll("[data-type]").forEach((b) => {
        b.classList.toggle("on", b === btn);
      });

      fillRoles();
    });
  });

  /* NIVELES: marcan el nivel y guían el paso siguiente.
       · Sin cuenta → se guarda el nivel y se pide Google.
       · Con cuenta → abre directo la pasarela del nivel. */

  gateRoot.querySelectorAll(".bv-plan").forEach((btn) => {
    btn.addEventListener("click", () => {
      payPlan = btn.dataset.plan;

      gateRoot
        .querySelectorAll(".bv-plan")
        .forEach((b) => b.classList.toggle("on", b === btn));

      sessionStorage.setItem("bvros_pay_plan", payPlan);

      const hint = gateRoot.querySelector('[data-ref="planHint"]');

      const auth = window.BVrosAuth;

      if (auth?.isAuthenticated()) {
        if (hint) {
          hint.textContent = "";
        }

        openLevelView(payPlan);

        return;
      }

      if (hint) {
        hint.textContent =
          "Nivel " +
          payPlan.replace("nivel", "") +
          " seleccionado ✓ — ahora presiona «Ingresar con Google» para crear tu cuenta y continuar con el pago.";
      }
    });
  });

  /* BOTÓN GOOGLE DE LA VISTA SUSCRIBIRSE:
       su única función es crear la cuenta para
       CONTINUAR LA SUSCRIPCIÓN elegida. Si no hay
       nivel seleccionado, avisa y NO redirige
       (antes se saltaba el pago por completo). */

  const susGoogle = gateRoot.querySelector("#bvSusGoogle");

  if (susGoogle) {
    susGoogle.addEventListener("click", (event) => {
      if (!payPlan) {
        payPlan = sessionStorage.getItem("bvros_pay_plan");
      }

      if (!payPlan) {
        event.preventDefault();

        const errEl = gateRoot.querySelector('[data-ref="errPay"]');

        if (errEl) {
          errEl.textContent =
            "Primero selecciona un nivel con el botón SELECCIONA. Después crea tu cuenta con Google para continuar con el pago.";
        }

        return;
      }

      sessionStorage.setItem("bvros_pay_plan", payPlan);
    });
  }

  /* CLIC FUERA DEL RECUADRO: BLOQUEADO en TODAS las
       interfaces. La única salida es la × (cuando está
       visible) o el botón VOLVER — así no se corta el
       proceso de admisión ni el pago por accidente. */

  q(".bv-gate-close").addEventListener("click", () => closeGate());

  /* Acciones */

  gateRoot.querySelectorAll("[data-act]").forEach((btn) => {
    btn.addEventListener("click", () => handleAction(btn.dataset.act));
  });
}

/* =========================================================
   UTILIDADES
========================================================= */

function gateError(msg) {
  if (!gateRoot || !msg) return;

  const el = gateRoot.querySelector('[data-ref="errGlobal"]');

  if (el) {
    el.textContent = "⚠ " + msg;
  }

  console.error("[BVros Gate]", msg);
}

function val(name) {
  const el = gateRoot.querySelector(`[data-f="${name}"]`);

  return el ? el.value.trim() : "";
}

function fillRoles() {
  const roles = PROFILE_ROLES[chosenType] || [];

  const options = roles.map((r) => `<option>${r}</option>`).join("");

  if (gateRoot._ui.roleSelect) {
    gateRoot._ui.roleSelect.innerHTML = options;
  }

  if (gateRoot._ui.roleSelect2) {
    gateRoot._ui.roleSelect2.innerHTML = options;
  }
}

function showView(name) {
  /* Cabecera de acceso (título compuesto + pestañas +
       subtítulo) SOLO en las interfaces de acceso:
       iniciar sesión, crear cuenta y suscribirse.
       En pago, perfil, bienvenida y código promocional
       se ocultan: cada interfaz muestra únicamente
       su propio título. */

  const esAcceso =
    name === "login" || name === "signup" || name === "suscribe";

  const compoundEl = gateRoot.querySelector('[data-ref="compoundTitle"]');

  const tabsEl = gateRoot.querySelector('.bv-gate-tabs');

  const subEl = gateRoot.querySelector('[data-ref="sub"]');

  if (compoundEl) {
    compoundEl.style.display = esAcceso ? "" : "none";
  }

  if (tabsEl) {
    tabsEl.style.display = esAcceso ? "flex" : "none";
  }

  if (subEl) {
    subEl.style.display = esAcceso ? "" : "none";
  }

  if (gateRoot._ui?.panel) {
    gateRoot._ui.panel.classList.toggle("suscribe-mode", name === "suscribe");
  }

  /* REGLAS DE SALIDA POR INTERFAZ:
       · acceso (login/signup/suscribe/confirm):
           × visible · volver oculto · clic fuera BLOQUEADO.
       · compra (nivel1/nivel2/nivel3/blocked):
           × OCULTO · volver visible · clic fuera BLOQUEADO.
       · perfil (complete):
           × OCULTO · volver OCULTO · clic fuera BLOQUEADO
           (solo "GUARDAR Y ENTRAR" avanza).
       · bienvenida (ok):
           × visible · volver visible · clic fuera BLOQUEADO. */

  currentView = name;

  const closeBtn = gateRoot.querySelector(".bv-gate-close");

  const backBtn = gateRoot.querySelector(".bv-gate-back");

  const grupo =
    name === "ok"
      ? "bienvenida"
      : name === "complete"
        ? "perfil"
        : name === "nivel1" ||
          name === "nivel2" ||
          name === "nivel3" ||
          name === "blocked"
          ? "compra"
          : "acceso";

  if (closeBtn) {
    closeBtn.style.display =
      grupo === "compra" || grupo === "perfil" ? "none" : "";
  }

  if (backBtn) {
    backBtn.style.display =
      grupo === "compra" || grupo === "bienvenida" ? "" : "none";
  }

  /* 2B.8 · ESQUINA DEL VOLVER LIBRE: con el botón
     ← en pantalla, el eyebrow se desplaza (ver CSS
     .bv-gate-panel.has-back). Sin volver, todo
     vuelve a su sitio. */

  if (gateRoot._ui?.panel) {
    gateRoot._ui.panel.classList.toggle(
      "has-back",
      grupo === "compra" || grupo === "bienvenida",
    );
  }

  /* Prellenar el nombre en "Completa tu perfil" con el
       username real (cuenta de Google o correo) — ya no
       aparece vacío ni el patrón user_xxxxxxxx. */

  if (name === "complete") {
    const u3 = gateRoot.querySelector('[data-f="username3"]');

    const prof = window.BVrosAuth?.profile;

    if (u3 && prof?.username && !u3.value) {
      u3.value = prof.username;
    }
  }

  if (name === "complete" && payIntent?.onlyPerfil2) {
    chosenType = "perfil2";

    /* Promo $1.70 = Perfil 2 obligatorio:
         el Perfil 1 queda deshabilitado */

    const p1 = gateRoot.querySelector(
      '[data-view="complete"] [data-type="perfil1"]',
    );

    const p2 = gateRoot.querySelector(
      '[data-view="complete"] [data-type="perfil2"]',
    );

    if (p1) {
      p1.disabled = true;

      p1.style.opacity = ".45";

      p1.classList.remove("on");
    }

    if (p2) {
      p2.classList.add("on");
    }
  }

  gateRoot.querySelectorAll("[data-view]").forEach((v) => {
    v.hidden = v.dataset.view !== name;
  });

  gateRoot.querySelectorAll(".bv-gate-tab").forEach((t) => {
    t.classList.toggle("on", t.dataset.tab === name);
  });
}

function setBusy(act, busy) {
  const btn = gateRoot.querySelector(`[data-act="${act}"]`);

  if (btn) {
    btn.disabled = busy;
  }
}

/* =========================================================
   INTERFAZ INDIVIDUAL POR NIVEL
========================================================= */

function openLevelView(plan) {
  if (!gateRoot) return;

  const auth = window.BVrosAuth;

  const authed = !!auth?.isAuthenticated();

  const hint = gateRoot.querySelector('[data-ref="planHint"]');

  if (hint) {
    hint.textContent = "";
  }

  if (plan === "nivel1") {
    showView("nivel1");

    const reg = gateRoot.querySelector('[data-act="register-nivel1"]');

    if (reg) {
      reg.textContent = authed ? "ACTIVAR MEMBRESÍA GRATUITA" : "REGISTRARSE";
    }

    return;
  }

  if (!authed) {
    showView("signup");

    return;
  }

  /* Ya es premium: NO volver a cobrar.
       Se muestra su bienvenida con el estado real. */

  if (auth.profile?.plan === "premium") {
    payPlan = null;

    sessionStorage.removeItem("bvros_pay_plan");

    afterAuth();

    return;
  }

  if (plan === "nivel2") {
    showView("nivel2");

    const price = promoActive ? 1.7 : 3.99;

    const priceEl = gateRoot.querySelector('[data-ref="n2Price"]');

    if (priceEl) {
      priceEl.textContent = "$" + price.toFixed(2);
    }

    mountLevelPay(
      "bvPayN2",
      price,
      promoActive
        ? "PROMOCIÓN CREADOR AVANZADO · $1.70/MES"
        : "SUSCRIPCIÓN OYENTE EXPERTO · $3.99/MES",
      promoActive ? "nivel2_promo" : "nivel2",
    );

    return;
  }

  if (plan === "nivel3") {
    /* NIVEL 3 INTERRUMPIDO (fase de experimentación):
         pantalla roja + código promocional → Nivel 2 $1.70.
         Si algún día habilitas el Nivel 3 real, borra este
         bloque "if (!promoActive)" y se montará PayPal
         en la vista del Nivel 3. */

    if (!promoActive) {
      showView("blocked");

      return;
    }

    showView("nivel2");

    const priceEl = gateRoot.querySelector('[data-ref="n2Price"]');

    if (priceEl) {
      priceEl.textContent = "$1.70";
    }

    mountLevelPay(
      "bvPayN2",
      1.7,
      "PROMOCIÓN CREADOR AVANZADO · $1.70/MES",
      "nivel2_promo",
    );

    return;
  }
}

/* Guardar el nivel REAL de la suscripción en profiles
     (alimenta la pastilla). Requiere la columna
     subscription_tier: ver bvlux-columna-tier.sql */

async function guardarTier(tier) {
  const auth = window.BVrosAuth;

  if (!tier || !auth?.user) return;

  try {
    await supabase
      .from("profiles")
      .update({ subscription_tier: tier })
      .eq("id", auth.user.id);

    await auth.refreshProfile();
  } catch (error) {
    console.warn("[BVros Gate] Nivel no guardado:", error);
  }
}

/* Montar PayPal en la vista individual */

function mountLevelPay(containerId, price, welcome, tier) {
  const container = gateRoot.querySelector(`#${containerId}`);

  if (!container) return;

  container.innerHTML = "";

  if (!window.BVrosPay) {
    return;
  }

  window.BVrosPay.startSubscription(
    containerId,
    () => {
      bvWelcomeLine = welcome;

      promoActive = false;

      payIntent = null;

      sessionStorage.removeItem("bvros_pay_plan");

      /* Pago concluido: el proceso inconcluso queda
           saldado — nada de avisos rojos ni re-aperturas
           en futuras recargas. */

      clearPendingFlow();

      guardarTier(tier);

      afterAuth();
    },
    (error) => {
      gateError("Error de pago: " + (error?.message || "intenta de nuevo"));
    },
    price,
    tier,
  );
}

/* =========================================================
   ACCIONES
========================================================= */

async function handleAction(action) {
  const ui = gateRoot._ui;

  switch (action) {
    case "go-login":
      showView("login");
      break;

    case "go-signup":
      showView("signup");
      break;

    case "close":
      closeGate();
      break;

    case "go-back":
      /* VOLVER: en bienvenida regresa a "Completa tu
           perfil" para revisar datos; en las interfaces
           de compra regresa a la parrilla de planes. */

      if (currentView === "ok") {
        showView("complete");

        fillRoles();
      } else {
        showView("suscribe");
      }

      break;

    case "go-perfil":
      bvWelcomeLine = null;

      showView("complete");

      fillRoles();

      break;

    case "google":
      try {
        await BVrosAuth.signInWithGoogle();
      } catch (error) {
        gateError(error.message);
      }
      break;

    case "do-login": {
      if (ui.errLogin) {
        ui.errLogin.textContent = "";
      }

      setBusy(action, true);

      try {
        await BVrosAuth.signInWithEmail(val("email"), val("password"));

        /* Retomar la suscripción elegida antes de entrar */

        if (!payPlan) {
          payPlan = sessionStorage.getItem("bvros_pay_plan");
        }

        if (payPlan) {
          openLevelView(payPlan);

          return;
        }

        afterAuth();
      } catch (error) {
        if (ui.errLogin) {
          ui.errLogin.textContent = error.message;
        }
      } finally {
        setBusy(action, false);
      }

      break;
    }

    case "do-signup": {
      if (ui.errSignup) {
        ui.errSignup.textContent = "";
      }

      const username = val("username");

      if (!username) {
        if (ui.errSignup) {
          ui.errSignup.textContent = "Elige un nombre de usuario.";
        }

        return;
      }

      setBusy(action, true);

      try {
        const res = await BVrosAuth.signUpWithEmail({
          email: val("email2"),

          password: val("password2"),

          username,

          profileType: chosenType,

          profileRole: ui.roleSelect ? ui.roleSelect.value : "",
        });

        if (res.needsConfirmation) {
          showView("confirm");
        } else {
          /* Retomar la suscripción elegida antes de entrar */

          if (!payPlan) {
            payPlan = sessionStorage.getItem("bvros_pay_plan");
          }

          if (payPlan) {
            openLevelView(payPlan);

            return;
          }

          afterAuth();
        }
      } catch (error) {
        if (ui.errSignup) {
          ui.errSignup.textContent = error.message;
        }
      } finally {
        setBusy(action, false);
      }

      break;
    }

    case "do-complete": {
      if (ui.errComplete) {
        ui.errComplete.textContent = "";
      }

      setBusy(action, true);

      try {
        await BVrosAuth.saveProfileChoice(
          val("username3"),
          chosenType,
          ui.roleSelect2 ? ui.roleSelect2.value : "",
        );

        /* Actualizar la pastilla y el nombre de la
             cabecera AL INSTANTE (sin recargar). */

        syncNavAuth();

        /* CLAVE: tras el redirect de Google la página se
             recarga y la variable en memoria se pierde.
             El nivel sobrevive en sessionStorage. Sin esto,
             el sistema mandaba a bienvenida gratuita y se
             saltaba el pago. */

        if (!payPlan) {
          payPlan = sessionStorage.getItem("bvros_pay_plan");
        }

        if (payPlan) {
          if (BVrosAuth.profile?.plan === "premium") {
            sessionStorage.removeItem("bvros_pay_plan");

            clearPendingFlow();

            afterAuth();

            return;
          }

          openLevelView(payPlan);

          return;
        }

        /* Perfil guardado sin pago pendiente: proceso
             concluido — se limpia la memoria del aviso. */

        clearPendingFlow();

        afterAuth();
      } catch (error) {
        console.error("[BVros Gate] Error al guardar perfil:", error);

        if (ui.errComplete) {
          ui.errComplete.textContent = error.message;
        }
      } finally {
        setBusy(action, false);
      }

      break;
    }

    case "register-nivel1": {
      const auth = window.BVrosAuth;

      if (!auth?.isAuthenticated()) {
        showView("signup");
        return;
      }

      /* Nivel 1 es gratuito: descarta cualquier
           nivel de pago pendiente antes de seguir */

      payPlan = null;

      sessionStorage.removeItem("bvros_pay_plan");

      clearPendingFlow();

      if (!auth.profile?.profile_chosen) {
        showView("complete");
        fillRoles();
        return;
      }

      bvWelcomeLine = "MIEMBRO GRATUITO";

      guardarTier("nivel1");

      afterAuth();

      break;
    }

    case "open-promo": {
      const box = gateRoot.querySelector("#bvPromoBox");

      if (box) {
        box.style.display = box.style.display === "none" ? "block" : "none";
      }

      break;
    }

    case "apply-promo": {
      /* El código puede venir del cuadro del Nivel 3
           (promoCode) o de la pantalla roja (promoCode2) */

      const code = (val("promoCode2") || val("promoCode"))
        .trim()
        .toUpperCase();

      const okEl = gateRoot.querySelector('[data-ref="okPromo"]');

      const errEl = gateRoot.querySelector('[data-ref="errPromo"]');

      const errBlocked = gateRoot.querySelector('[data-ref="errBlocked"]');

      if (code !== "BVLUX170") {
        if (errEl) {
          errEl.textContent = "Código no válido.";
        }

        if (errBlocked) {
          errBlocked.textContent = "Código no válido.";
        }

        return;
      }

      promoActive = true;

      payPlan = "nivel2";

      sessionStorage.setItem("bvros_pay_plan", "nivel2");

      payIntent = {
        plan: "nivel2",

        price: 1.7,

        onlyPerfil2: true,

        welcome: "PROMOCIÓN CREADOR AVANZADO · $1.70/MES",
      };

      chosenType = "perfil2";

      if (okEl) {
        okEl.textContent = "Código aplicado ✔ Actualizando…";
      }

      setTimeout(() => openLevelView("nivel2"), 600);

      break;
    }
  }
}

/* =========================================================
   BIENVENIDA (3 MIN) — formato único para los 4 casos
========================================================= */

/* Datos de la bienvenida según el nivel real.
     · El nivel se deduce primero de la línea de pago
       reciente (bvWelcomeLine) porque guardarTier es
       asíncrono y la base aún podría no estar al día.
     · Sin pago reciente: se usa el tier del perfil. */

function welcomeData() {
  const auth = window.BVrosAuth;

  const line = bvWelcomeLine || "";

  let tier;

  if (line === "MIEMBRO GRATUITO") {
    tier = "nivel1";
  } else if (line.includes("1.70")) {
    tier = "nivel2_promo";
  } else if (line.includes("3.99")) {
    tier = "nivel2";
  } else if (line.includes("4.75")) {
    tier = "nivel3";
  } else {
    tier =
      auth?.profile?.subscription_tier ||
      (auth?.profile?.plan === "premium"
        ? auth.profile.profile_type === "perfil2"
          ? "nivel3"
          : "nivel2"
        : "nivel1");
  }

  const DATA = {
    nivel1: {
      member: "MIEMBRO GRATUITO",

      plan: "Suscripción Expectador Nivel 1 · ✓ Cuenta conectada",
    },

    nivel2: {
      member: "MIEMBRO PREMIUM",

      plan: "Suscripción Experto $3.99/mes · Nivel 2 · ✓ Cuenta conectada",
    },

    nivel2_promo: {
      member: "MIEMBRO PREMIUM",

      plan: "Suscripción Especial $1.70/mes · ✓ Cuenta conectada",
    },

    nivel3: {
      member: "MIEMBRO PREMIUM",

      plan: "Suscripción Avanzado $4.75/mes · ✓ Cuenta conectada",
    },
  };

  return DATA[tier] || DATA.nivel1;
}

function afterAuth() {
  const auth = window.BVrosAuth;

  if (!gateRoot) return;

  /* Ocultar cabecera de acceso y preparar bienvenida */

  const compound = gateRoot.querySelector('[data-ref="compoundTitle"]');

  const tabsEl = gateRoot.querySelector('.bv-gate-tabs');

  const subEl = gateRoot.querySelector('[data-ref="sub"]');

  if (compound) {
    compound.style.display = "none";
  }

  if (tabsEl) {
    tabsEl.style.display = "none";
  }

  if (subEl) {
    subEl.style.display = "none";
  }

  setRef("title", "Bienvenido a BVros");

  const titleEl = gateRoot.querySelector('[data-ref="title"]');

  if (titleEl) {
    titleEl.style.display = "block";

    titleEl.style.textAlign = "center";

    titleEl.style.fontSize = "1.4rem";
  }

  const perfilListo = !!(auth.profile && auth.profile.profile_chosen);

  /* Perfil sin elegir y sin pago reciente
       → elegir perfil ahora mismo */

  if (!perfilListo && !bvWelcomeLine) {
    showView("complete");

    fillRoles();

    return;
  }

  /* Bienvenida (3 min): línea de suscripción arriba
       + título MIEMBRO en dorado, según el nivel real.
       Si falta el perfil, debajo aparece el botón
       "ELIGE TU PERFIL". */

  const wd = welcomeData();

  setRef("okPlanLine", wd.plan);

  setRef("okMember", wd.member);

  const goPerfil = gateRoot.querySelector('[data-act="go-perfil"]');

  if (goPerfil) {
    goPerfil.style.display = perfilListo ? "none" : "block";
  }

  showView("ok");

  clearTimeout(afterAuth._timer);

  /* 3 minutos para leer; si no toca nada, se cierra solo */

  afterAuth._timer = setTimeout(() => {
    bvWelcomeLine = null;

    closeGate(true);
  }, 180000);
}

function openGate(context = null) {
  buildGate();

  const compound = gateRoot.querySelector('[data-ref="compoundTitle"]');

  const tabsEl = gateRoot.querySelector('.bv-gate-tabs');

  const subEl = gateRoot.querySelector('[data-ref="sub"]');

  if (compound) {
    compound.style.display = "";
  }

  if (tabsEl) {
    tabsEl.style.display = "flex";
  }

  if (subEl) {
    subEl.style.display = "";
  }

  const titleEl = gateRoot.querySelector('[data-ref="title"]');

  if (titleEl) {
    titleEl.style.display = "none";
  }

  const sub = gateRoot.querySelector('[data-ref="sub"]');

  const titles = {
    stream: "Para acceder a este contenido inicia sesión o suscríbete",

    compra: "Para comprar, inicia sesión o suscríbete",

    academy: "Para acceder a este curso inicia sesión o suscríbete",

    artista: "Para acceder a este artista inicia sesión o suscríbete",

    distribucion: "Distribución exclusiva para suscriptores verificados",
  };

  setRef("title", titles[context] || titles.stream);

  if (sub) {
    if (context === "suscripcion") {
      sub.textContent =
        "Desbloquea el catálogo completo, álbumes exclusivos y 50% de descuento en productos.";
    } else if (context === "distribucion") {
      sub.textContent =
        "Distribución bajo términos de condición y solicitud previa, revisión de datos y de admisión. BVros se reserva el derecho de admisión.";
    } else {
      sub.textContent = "· Acceso de espectador externo · nivel 1 ·";
    }
  }

  const auth = window.BVrosAuth;

  if (auth?.isAuthenticated() && auth.profile && !auth.profile.profile_chosen) {
    setRef("title", "Selecciona tu perfil a continuación");

    if (sub) {
      sub.textContent =
        "Cuenta conectada ✓ — tu perfil determina tus beneficios y tu precio.";
    }

    showView("complete");

    fillRoles();
  } else if (context === "suscripcion") {
    showView("suscribe");
  } else {
    showView("login");
  }

  gateRoot.classList.add("open");
}

function closeGate(resolved = false) {
  if (!gateRoot) return;

  gateRoot.classList.remove("open");

  if (resolveGate) {
    const r = resolveGate;

    resolveGate = null;

    r(resolved ? window.BVrosAuth.user : null);
  }
}

/* =========================================================
   API PÚBLICA
========================================================= */

window.BVrosGate = {
  open: openGate,

  close: () => closeGate(),

  requireAuth(context) {
    if (window.BVrosAuth?.isAuthenticated()) {
      return Promise.resolve(window.BVrosAuth.user);
    }

    return new Promise((resolve) => {
      resolveGate = resolve;

      openGate(context);
    });
  },
};

/* =========================================================
   BOTÓN INICIO / CHIP DE SESIÓN
========================================================= */

function syncNavAuth() {
  const links = document.querySelector(".hub-links");

  if (!links) return;

  links.querySelectorAll("[data-bvros-auth]").forEach((n) => n.remove());

  const auth = window.BVrosAuth;

  if (auth && auth.isAuthenticated()) {
    const chip = document.createElement("span");

    chip.className = "bv-auth-chip";

    chip.setAttribute("data-bvros-auth", "true");

    const displayName = auth.profile?.username || auth.user.email;

    /* Nivel real de la suscripción (para la pestaña
         Artista): nivel1 → bloqueado · nivel2 → bloqueado
         + SOLICITAR · nivel2_promo / nivel3 → desbloqueado.
         Cuentas premium antiguas: se deduce del perfil. */

    const tierActual =
      auth.profile?.subscription_tier ||
      (auth.profile?.plan === "premium"
        ? auth.profile?.profile_type === "perfil2"
          ? "nivel3"
          : "nivel2"
        : "nivel1");

    const artistaLock = tierActual === "nivel1";

    const artistaSolicitar = tierActual === "nivel2";

    const avatarHtml = auth.profile?.avatar_url
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
                    >Artista</button>

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
                        data-edit="username"
                        maxlength="24"
                        value="${auth.profile?.username || ""}"
                        placeholder="tu_nombre"
                    >

                    <label>Perfil asignado</label>
                    <input
                        type="text"
                        value="${
                          auth.profile?.profile_type === "perfil2"
                            ? "Perfil 2 · Creador"
                            : "Perfil 1 · Escucha"
                        }"
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

                    <label>Suscripción</label>
                    <input
                        type="text"
                        value="${planBadge()}"
                        readonly
                        style="opacity:.6;"
                    >

                    <button
                        class="bv-menu-save"
                        data-act="save-username"
                        type="button"
                    >GUARDAR NOMBRE</button>

                    <div class="bv-menu-ok" data-ref="okPerfil"></div>
                    <div class="bv-menu-err" data-ref="errPerfil"></div>

                </div>


                <div class="bv-menu-panel" data-view="editar">

                    <button
                        class="bv-menu-back"
                        data-menu="main"
                        type="button"
                    >← Volver</button>

                    ${
                      artistaLock || artistaSolicitar
                        ? `<div class="bv-art-lock">
                               El perfil de Artista se activa con la
                               Suscripción Creador Avanzado ($4.75/mes)
                               o con la Promoción Creador ($1.70/mes).
                               ${
                                 artistaSolicitar
                                   ? "Como suscriptor Oyente Experto puedes solicitar acceso con el botón de abajo."
                                   : "Activa tu suscripción Creador para desbloquear esta sección."
                               }
                           </div>`
                        : ""
                    }

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
                            ${artistaLock || artistaSolicitar ? "disabled" : ""}
                        >Subir foto</button>

                        <button
                            class="bv-avatar-btn"
                            data-act="remove-avatar"
                            type="button"
                            ${artistaLock || artistaSolicitar ? "disabled" : ""}
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
                        value="${auth.profile?.artist_name || ""}"
                        placeholder="Tu nombre artístico"
                        ${artistaLock || artistaSolicitar ? "disabled" : ""}
                    >

                    <label>Instrumento principal</label>
                    <select data-edit="main_instrument" ${
                      artistaLock || artistaSolicitar ? "disabled" : ""
                    }>

                        ${[
                          "",
                          "Canto",
                          "Guitarra",
                          "Piano",
                          "Batería",
                          "Bajo",
                          "Violín",
                          "Brass (vientos)",
                          "Consola",
                        ]
                          .map(
                            (i) =>
                              `<option ${
                                auth.profile?.main_instrument === i
                                  ? "selected"
                                  : ""
                              }>${i || "— Seleccionar —"}</option>`,
                          )
                          .join("")}

                    </select>

                    ${
                      artistaSolicitar
                        ? `<button
                              class="bv-menu-save"
                              data-act="solicitar-artista"
                              type="button"
                          >SOLICITAR</button>`
                        : ""
                    }

                    <button
                        class="bv-menu-save"
                        data-act="save-edit"
                        type="button"
                        ${
                          artistaLock || artistaSolicitar
                            ? 'style="display:none;"'
                            : ""
                        }
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

    const menu = chip.querySelector(".bv-auth-menu");

    chip
      .querySelector(".bv-auth-trigger")
      .addEventListener("click", (event) => {
        event.stopPropagation();

        menu.classList.toggle("open");
      });

    document.addEventListener("click", (event) => {
      if (!chip.contains(event.target)) {
        menu.classList.remove("open");
      }
    });

    chip.querySelectorAll("[data-menu]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.menu;

        if (target === "salir") {
          auth.logout();
          return;
        }

        if (target === "suscribir") {
          menu.classList.remove("open");
          openGate("suscripcion");
          return;
        }

        menu.querySelectorAll("[data-view]").forEach((v) => {
          v.style.display = v.dataset.view === target ? "block" : "none";
        });
      });
    });

    menu.querySelector('[data-view="main"]').style.display = "block";

    /* PERFIL: guardar el nombre de usuario (único campo
         editable; perfil, correo y suscripción son de
         solo lectura) */

    const saveUserBtn = chip.querySelector('[data-act="save-username"]');

    if (saveUserBtn) {
      saveUserBtn.addEventListener("click", async () => {
        const okEl = chip.querySelector('[data-ref="okPerfil"]');

        const errEl = chip.querySelector('[data-ref="errPerfil"]');

        okEl.textContent = "";

        errEl.textContent = "";

        const nuevo = chip
          .querySelector('[data-edit="username"]')
          .value.trim();

        if (!nuevo) {
          errEl.textContent = "El nombre no puede quedar vacío.";
          return;
        }

        try {
          const { error } = await supabase
            .from("profiles")
            .update({ username: nuevo })
            .eq("id", auth.user.id);

          if (error) throw error;

          await window.BVrosAuth.refreshProfile();

          okEl.textContent = "Nombre guardado ✔";

          setTimeout(() => syncNavAuth(), 900);
        } catch (error) {
          errEl.textContent =
            error.code === "23505"
              ? "Ese nombre de usuario ya existe. Elige otro."
              : error.message;
        }
      });
    }

    /* ARTISTA: botón SOLICITAR (visible solo en Nivel 2).
         Abre el panel de soporte con el asunto preparado. */

    const solBtn = chip.querySelector('[data-act="solicitar-artista"]');

    if (solBtn) {
      solBtn.addEventListener("click", () => {
        const subjectEl = chip.querySelector('[data-sup="subject"]');

        menu.querySelectorAll("[data-view]").forEach((v) => {
          v.style.display = v.dataset.view === "soporte" ? "block" : "none";
        });

        if (subjectEl && !subjectEl.value) {
          subjectEl.value = "Solicitud de perfil Artista · Nivel 2";
        }
      });
    }

    chip
      .querySelector('[data-act="save-edit"]')
      .addEventListener("click", async () => {
        const okEl = chip.querySelector('[data-ref="okEdit"]');

        const errEl = chip.querySelector('[data-ref="errEdit"]');

        okEl.textContent = "";

        errEl.textContent = "";

        try {
          const { error } = await supabase
            .from("profiles")
            .update({
              artist_name: chip
                .querySelector('[data-edit="artist_name"]')
                .value.trim(),

              main_instrument: chip.querySelector(
                '[data-edit="main_instrument"]',
              ).value,
            })

            .eq("id", auth.user.id);

          if (error) throw error;

          okEl.textContent = "Cambios guardados ✔";
        } catch (error) {
          errEl.textContent = error.message;
        }
      });

    chip
      .querySelector('[data-act="pick-avatar"]')
      .addEventListener("click", () => {
        chip.querySelector('[data-ref="avatarFile"]').click();
      });

    chip
      .querySelector('[data-ref="avatarFile"]')
      .addEventListener("change", async (event) => {
        const file = event.target.files[0];

        if (!file) return;

        const errEl = chip.querySelector('[data-ref="errEdit"]');

        errEl.textContent = "";

        if (file.size > 2 * 1024 * 1024) {
          errEl.textContent = "La imagen supera 2 MB.";
          return;
        }

        try {
          errEl.textContent = "Subiendo foto…";

          const path = `${auth.user.id}/avatar`;

          const { error: upError } = await supabase.storage
            .from("Avatars")
            .upload(path, file, {
              contentType: file.type,

              upsert: true,
            });

          if (upError) throw upError;

          const { data: urlData } = supabase.storage
            .from("Avatars")
            .getPublicUrl(path);

          await supabase
            .from("profiles")
            .update({
              avatar_url: urlData.publicUrl,
            })

            .eq("id", auth.user.id);

          await window.BVrosAuth.refreshProfile();
        } catch (error) {
          errEl.textContent =
            "No se pudo subir: " + (error.message || "intenta otra imagen");
        }
      });

    chip
      .querySelector('[data-act="remove-avatar"]')
      .addEventListener("click", async () => {
        const errEl = chip.querySelector('[data-ref="errEdit"]');

        try {
          const { data: files } = await supabase.storage
            .from("Avatars")
            .list(auth.user.id);

          if (files?.length) {
            await supabase.storage
              .from("Avatars")
              .remove(files.map((f) => `${auth.user.id}/${f.name}`));
          }

          await supabase
            .from("profiles")
            .update({
              avatar_url: null,
            })

            .eq("id", auth.user.id);

          await window.BVrosAuth.refreshProfile();
        } catch (error) {
          errEl.textContent = "No se pudo eliminar: " + error.message;
        }
      });

    chip
      .querySelector('[data-act="send-support"]')
      .addEventListener("click", async () => {
        const okEl = chip.querySelector('[data-ref="okSup"]');

        const errEl = chip.querySelector('[data-ref="errSup"]');

        okEl.textContent = "";

        errEl.textContent = "";

        try {
          const { error } = await supabase.from("support_tickets").insert({
            user_id: auth.user.id,

            email: chip.querySelector('[data-sup="email"]').value,

            subject: chip.querySelector('[data-sup="subject"]').value,

            details: chip.querySelector('[data-sup="details"]').value,

            phone: chip.querySelector('[data-sup="phone"]').value,

            notes: chip.querySelector('[data-sup="notes"]').value,
          });

          if (error) throw error;

          okEl.textContent = "Enviado ✔ Soporte te responderá al correo.";
        } catch (error) {
          errEl.textContent = error.message;
        }
      });

    links.appendChild(chip);
  } else {
    const btn = document.createElement("button");

    btn.className = "bv-auth-login";

    btn.setAttribute("data-bvros-auth", "true");

    btn.type = "button";

    btn.textContent = "INICIO";

    btn.addEventListener("click", () => openGate("stream"));

    links.appendChild(btn);
  }
}

/* =========================================================
   DETECTOR AUTOMÁTICO
========================================================= */

syncNavAuth();

window.addEventListener("bvros:navigated", () => syncNavAuth());

window.addEventListener("bvros:authstate", () => {
  syncNavAuth();

  const auth = window.BVrosAuth;

  if (!auth) return;

  const authed = auth.isAuthenticated();

  /* NIVEL elegido antes del redirect de Google:
       la pasarela del nivel va PRIMERO, el perfil
       se elige DESPUÉS de pagar. No se exige
       perfil completo para llegar al pago. */

  const savedPlan = sessionStorage.getItem("bvros_pay_plan");

  const pendientePago = authed && !!savedPlan;

  const pendientePerfil =
    authed && (!auth.profile || !auth.profile.profile_chosen);

  /* NADA PENDIENTE: el proceso concluyó (pagó, eligió
       perfil, activó el nivel 1 o cerró sesión). Se
       borra la memoria del proceso inconcluso y el
       aviso rojo. Comportamiento normal. */

  if (!pendientePago && !pendientePerfil) {
    if (readPendingFlow()) {
      clearPendingFlow();
    }

    return;
  }

  /* =========================================================
     ANTI-PERSISTENCIA (2B.7)
     El PRIMER evento authstate tras cargar la página es
     el "ARRANQUE". En el arranque manda la política
     anti-molestia; los eventos SIGUIENTES de la misma
     sesión (inicio con correo, guardar perfil, volver
     del redirect de Google) son continuación legítima
     del flujo y se abren como siempre.
  ========================================================= */

  const esArranque = !bvBootAuthHandled;

  bvBootAuthHandled = true;

  if (esArranque) {
    /* Clave del proceso: pay:nivel2, pay:nivel3 o
         complete. Si cambió el proceso, se empieza
         de cero. */

    const clave = pendientePago ? "pay:" + savedPlan : "complete";

    let rec = readPendingFlow();

    if (!rec || rec.step !== clave) {
      rec = {
        step: clave,

        tier: pendientePago ? savedPlan : null,

        boots: 0,

        noticed: false,
      };
    }

    /* 1er ARRANQUE con el proceso inconcluso: la
         interfaz se despliega UNA SOLA VEZ (la
         reanudación legítima que ya conocías). */

    if (rec.boots === 0) {
      rec.boots = 1;

      writePendingFlow(rec);

      if (pendientePago) {
        payPlan = savedPlan;

        openGate("suscripcion");

        openLevelView(payPlan);
      } else {
        openGate("stream");

        setRef("title", "Selecciona tu perfil a continuación");

        setRef(
          "sub",
          "Cuenta conectada ✓ — tu perfil determina tus beneficios y tu precio.",
        );

        showView("complete");

        fillRoles();
      }

      return;
    }

    /* 2º ARRANQUE: YA NINGÚN MODAL. Una única vez
         aparece el aviso rojo fijo con botones
         directos — sin bloquear la página. */

    if (!rec.noticed) {
      rec.noticed = true;

      writePendingFlow(rec);

      showPendingNotice(
        pendientePago ? "pay" : "complete",
        pendientePago ? savedPlan : null,
      );

      return;
    }

    /* ARRANQUES SIGUIENTES: silencio total. Nada se
         abre solo. El usuario decide con INICIO o
         SUSCRIBIRSE (y ahí el gate funciona normal). */

    return;
  }

  /* =========================================================
     CONTINUACIÓN DENTRO DE LA MISMA SESIÓN
     (igual que siempre — el usuario está en pleno flujo)
  ========================================================= */

  if (pendientePago) {
    payPlan = savedPlan;

    openGate("suscripcion");

    openLevelView(payPlan);

    return;
  }

  /* Si la bienvenida está en pantalla no se la arrebata
       al usuario: la bienvenida tiene su propio botón
       para pasar al perfil (evita el tirón de pantalla
       que llegaba con el refreshProfile del pago). */

  if (currentView === "ok") {
    return;
  }

  openGate("stream");

  setRef("title", "Selecciona tu perfil a continuación");

  setRef(
    "sub",
    "Cuenta conectada ✓ — tu perfil determina tus beneficios y tu precio.",
  );

  showView("complete");

  fillRoles();
});
