/* =========================================================
   BVROS SHELL v3.5
   Router SPA — intercambia el contenedor .shell COMPLETO
   (nav + título + contenido + footer juntos). Esto elimina
   los residuos de título entre módulos con estructuras
   distintas (ej: index vs stream).
   Mantiene: reproductor persistente, rutas anidadas,
   estilos por página, re-ejecución de scripts, popstate.
   ========================================================= */

window.__BVROS_SHELL__ = true;


/* =========================================================
   BOOTSTRAP DEL REPRODUCTOR GLOBAL
========================================================= */

let playerLoadedFrom = null;

try{

    const playerModule =
        await import('./player.js');

    window.BVrosPlayer =
        playerModule.default;

    playerLoadedFrom =
        'assets/js/player.js';

}catch(error1){

    try{

        const playerModule =
            await import('./modules/player.js');

        window.BVrosPlayer =
            playerModule.default;

        playerLoadedFrom =
            'assets/js/modules/player.js';

        console.warn(
            '[BVros Shell] player.js encontrado en modules/ — la ubicación oficial es assets/js/player.js.'
        );

    }catch(error2){

        console.error(
            '%c[BVros Shell] player.js NO EXISTE en ninguna ruta conocida.',
            'color:#f87171;font-weight:bold;',
            '\nBuscado en:\n  1) assets/js/player.js\n  2) assets/js/modules/player.js'
        );

    }

}


if(window.BVrosPlayer){

    console.info(
        `[BVros Shell] Reproductor global activo ✔ (${playerLoadedFrom})`
    );

    window.dispatchEvent(
        new CustomEvent('bvros:playerready')
    );

}


/* =========================================================
   PÁGINAS INTERNAS
========================================================= */

const BVROS_INTERNAL_PAGES = [
    'index.html',
    'stream.html',
    'distribution.html',
    'academy.html',
    'artists.html',
    'privacy.html',
    'terms.html'
];


/* =========================================================
   BARRA DE PROGRESO DE NAVEGACIÓN
========================================================= */

const barStyle =
    document.createElement('style');

barStyle.textContent = `

#bvgRouterBar{
    position:fixed;
    top:0; left:0;
    height:2px;
    width:0%;
    background:var(--accent,#0f5);
    z-index:10000;
    transition:width .25s ease, opacity .3s ease;
    opacity:0;
    pointer-events:none;
}

`;

document.head.appendChild(barStyle);

const routerBar =
    document.createElement('div');

routerBar.id =
    'bvgRouterBar';

document.body.appendChild(routerBar);


function showBar(){

    routerBar.style.opacity = '1';

    routerBar.style.width = '60%';

}

function hideBar(){

    routerBar.style.width = '100%';

    setTimeout(() => {

        routerBar.style.opacity = '0';

        routerBar.style.width = '0%';

    }, 250);

}


/* =========================================================
   ESTILOS DE PÁGINA (deduplicados por hash)
========================================================= */

function hashStyle(text){

    let hash = 0;

    for(let i = 0; i < text.length; i++){

        hash =
            (
                (hash << 5) -
                hash +
                text.charCodeAt(i)
            ) | 0;

    }

    return Math.abs(hash);

}


function injectPageStyles(parsedDoc){

    parsedDoc
        .querySelectorAll('head style')
        .forEach(originalStyle => {

            const hash =
                hashStyle(
                    originalStyle.textContent
                );

            const attr =
                'data-bvros-page-style';

            if(
                document.head.querySelector(
                    `[${attr}="${hash}"]`
                )
            ){
                return;
            }


            const style =
                document.createElement('style');

            style.setAttribute(
                attr,
                String(hash)
            );

            style.textContent =
                originalStyle.textContent;

            document.head.appendChild(style);

        });

}


/* =========================================================
   SCRIPTS DE PÁGINA
   Re-ejecuta los scripts del body de la página
   destino. Excluye shell/player/queue para no
   duplicar el router ni el reproductor.
========================================================= */

function isExcludedScript(oldScript){

    const src =
        oldScript.getAttribute('src');

    if(!src){
        return false;
    }

    return (
        src.includes('assets/js/shell.js') ||
        src.includes('assets/js/player.js') ||
        src.includes('assets/js/queue.js')
    );

}


function executePageScripts(parsedDoc){

    const scripts =
        parsedDoc.body.querySelectorAll('script');

    scripts.forEach(oldScript => {

        if(isExcludedScript(oldScript)){
            return;
        }


        const newScript =
            document.createElement('script');

        Array
            .from(oldScript.attributes)
            .forEach(attribute => {

                newScript.setAttribute(
                    attribute.name,
                    attribute.value
                );

            });


        if(!oldScript.getAttribute('src')){

            newScript.textContent =
                oldScript.textContent;

        }


        document.body.appendChild(newScript);

    });

}


/* =========================================================
   NAV ACTIVO
========================================================= */

function highlightNav(url){

    let path;

    try{

        path =
            new URL(url).pathname;

    }catch{

        return;

    }


    document
        .querySelectorAll('.hub-links a')
        .forEach(a => {

            let linkPath;

            try{

                linkPath =
                    new URL(
                        a.href,
                        location.href
                    ).pathname;

            }catch{

                return;

            }


            if(linkPath === path){
                a.style.color =
                    'var(--accent)';
            }else{
                a.style.color =
                    '';
            }

        });

}


/* =========================================================
   ROUTER
   FIX PRINCIPAL v3.5:
   se intercambia el .shell COMPLETO de la página
   destino. Así ninguna pieza del módulo anterior
   (título, héroe, contenido) sobrevive al cambio,
   sin importar la anatomía interna de cada página.
========================================================= */

let navigating = false;


async function navigate(url, push = true){

    if(navigating){
        return;
    }

    navigating = true;

    showBar();

    try{

        const urlObj =
            new URL(url, location.href);


        const filename =
            urlObj.pathname.split('/').pop();

        if(
            !BVROS_INTERNAL_PAGES.includes(filename)
        ){

            location.href = urlObj.href;

            return;

        }


        /*
           FIX RUTAS ANIDADAS:
           1) la URL pedida (puede ser de subcarpeta)
           2) el mismo archivo en la raíz del sitio
        */

        const candidates =
            [ urlObj.href ];


        const rootCandidate =
            location.origin + '/' + filename;

        if(rootCandidate !== urlObj.href){
            candidates.push(rootCandidate);
        }


        let response = null;

        let usedUrl = null;

        for(const candidate of candidates){

            try{

                const r =
                    await fetch(
                        candidate,
                        { cache: 'no-store' }
                    );

                if(r.ok){
                    response = r;
                    usedUrl = candidate;
                    break;
                }

            }catch(fetchError){

                /* probar siguiente candidato */

            }

        }


        if(!response){
            throw new Error(
                'Página no encontrada en ninguna ruta'
            );
        }


        const html =
            await response.text();

        const doc =
            new DOMParser().parseFromString(
                html,
                'text/html'
            );


        /*
           INTERCAMBIO COMPLETO DEL .shell:
           una sola pieza, cero residuos.
        */

        const newShell =
            doc.querySelector('.shell');

        const curShell =
            document.querySelector('.shell');

        if(!newShell || !curShell){

            /* Página sin la estructura estándar:
               navegación tradicional como respaldo. */

            location.href = usedUrl;

            return;

        }


        /* El reproductor global es el ÚNICO:
           limpiar cualquier player/audio que viniera
           dentro del shell de la página destino. */

        newShell
            .querySelectorAll(
                '.demo-player, .global-player, audio[data-secure-audio]'
            )
            .forEach(node => node.remove());


        /* Estilos exclusivos de la página */

        /* LIMPIEZA DE ESTILOS HEREDADOS:
           retira los <style> inyectados por la
           página anterior (evita fugas como el
           footer centrado de privacy/terms) */

        document.head
            .querySelectorAll('[data-bvros-page-style]')
            .forEach(s => s.remove());

        injectPageStyles(doc);


        /* Título */

        if(doc.title){
            document.title = doc.title;
        }


        /* Intercambio del shell completo */

        curShell.replaceWith(
            document.adoptNode(newShell)
        );


        /* Scripts de la página destino */

        executePageScripts(doc);


        /* Nav activo (el nav fue reemplazado,
           se vuelve a marcar) */

        highlightNav(usedUrl);


        /* Scroll arriba */

        window.scrollTo(0, 0);


        /* URL */

        if(push){
            history.pushState(
                { bvros: true },
                '',
                new URL(usedUrl).pathname
            );
        }


        hideBar();


        /* Notificar navegación completa */

        window.dispatchEvent(
            new CustomEvent(
                'bvros:navigated',
                {
                    detail: { url: usedUrl }
                }
            )
        );

    }catch(error){

        console.warn(
            '[BVros Shell] Fallback a navegación normal:',
            error
        );

        location.href = url;

    }finally{

        navigating = false;

    }

}


/* =========================================================
   INTERCEPTAR CLICS EN ENLACES INTERNOS
   (delegación en document: sobrevive a los
   intercambios de shell sin re-vincular)
========================================================= */

document.addEventListener(
    'click',
    event => {

        if(
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
        ){
            return;
        }


        const anchor =
            event.target.closest('a');

        if(!anchor){
            return;
        }


        if(
            anchor.target === '_blank' ||
            anchor.hasAttribute('download')
        ){
            return;
        }


        const href =
            anchor.getAttribute('href');

        if(
            !href ||
            href.startsWith('#') ||
            href.startsWith('mailto:') ||
            href.startsWith('tel:') ||
            href.startsWith('javascript:')
        ){
            return;
        }


        let target;

        try{

            target =
                new URL(anchor.href, location.href);

        }catch{

            return;

        }


        if(target.origin !== location.origin){
            return;
        }

        if(!target.pathname.endsWith('.html')){
            return;
        }

                /*
           SOLO PÁGINAS DE LA RAÍZ:
           las anidadas (artist/bvhankry/..., release/...)
           tienen diseño propio y navegan de forma
           tradicional para no romper sus estilos.
        */

        const pathParts =
            target.pathname
                .split('/')
                .filter(Boolean);

        if(pathParts.length > 1){
            return;
        }

        if(target.href === location.href){
            return;
        }


        event.preventDefault();

        navigate(target.href);

    }
);


/* =========================================================
   ATRÁS / ADELANTE
========================================================= */

window.addEventListener(
    'popstate',
    () => {

        navigate(
            location.href,
            false
        );

    }
);


/* Nav activo de la primera carga */

highlightNav(location.href);

/* =========================================================
   BVROS UI-LANG v3 — ES/EN de página completa
   Nav + encabezados + footer por módulo.
   Los archivos y el código siguen en inglés.
========================================================= */

console.info('[BVros Lang] v3 activo — idioma:', localStorage.getItem('bvros_lang') || 'es');

const BV_LANG = {

    es: {
        'stream.html':   'MÚSICA EN LÍNEA',
        'academy.html':  'ESCUELA',
        'distribution.html': 'DISTRIBUCIÓN',
        'artists.html':  'ARTISTAS',
        'tienda.html':   'TIENDA'
    },

    en: {
        'stream.html':   'STREAM',
        'academy.html':  'ACADEMY',
        'distribution.html': 'DISTRIBUTION',
        'artists.html':  'ARTISTS',
        'tienda.html':   'SHOP'
    }

};


/* Textos por página: selector → texto.
   Los que empiezan con "html:" se insertan como
   HTML (para que los enlaces del footer vivan). */

const BV_PAGE_TEXTS = {

    es: {

        'index.html': [
            ['.hub-hero h1', 'Una casa para crear, aprender y publicar.'],
            ['.hub-hero .eyebrow', 'RED MUSICAL · ECUADOR'],
            ['.hub-hero p', 'Esta es la cabeza del ecosistema. Desde aquí se accede a la plataforma musical, distribución interna, perfiles artísticos, formación y productos'],
            ['.module-grid a:nth-child(1) h2', 'Musica en Línea'],
            ['.module-grid a:nth-child(1) p', 'Catálogo y reproducción musical.'],
            ['.module-grid a:nth-child(2) h2', 'Distribución'],
            ['.module-grid a:nth-child(2) p', 'Recepción, revisión y publicación de lanzamientos.'],
            ['.module-grid a:nth-child(3) h2', 'Escuela'],
            ['.module-grid a:nth-child(3) p', 'Cursos, talleres y acompañamiento musical.'],
            ['.module-grid a:nth-child(4) h2', 'Artistas'],
            ['.module-grid a:nth-child(4) p', 'Directorio y perfiles públicos de artistas.'],
            ['footer', 'html:© 2026 · BVros Music Ecuador · versión 1.1 · <a href="privacy.html">Privacidad</a> · <a href="terms.html">Términos</a>']
        ],

        'stream.html': [
            ['.page-head .eyebrow', 'CATÁLOGO GLOBAL'],
            ['.page-head h1', 'Musica en Línea'],
            ['.page-head p', 'Toda la música del ecosistema en un solo lugar.'],
            ['.catalog-header :nth-child(3)', 'PISTA'],
            ['.catalog-header :nth-child(4)', 'ÁLBUM'],
            ['.catalog-header .h-dur', 'DURACIÓN'],
            ['.catalog-header .h-plays', 'PLAYS'],
            ['footer', 'html:© 2026 · BVros Music Ecuador · versión 1.1 · <a href="privacy.html">Privacidad</a> · <a href="terms.html">Términos</a>']
        ],

        'academy.html': [
            ['.page-head .eyebrow', 'ESCUELA'],
            ['.page-head h1', 'Escuela'],
            ['.page-head p', 'Cursos, talleres y acompañamiento musical para creadores del ecosistema.'],
            ['footer', 'html:© 2026 · BVros Music Ecuador · versión 1.1 · <a href="privacy.html">Privacidad</a> · <a href="terms.html">Términos</a>']
        ],

        'artists.html': [
            ['.page-head .eyebrow', 'DIRECTORIO'],
            ['.page-head h1', 'Nuestros Artistas'],
            ['.page-head p', 'Descubre a los creadores que forman parte del ecosistema BVros.'],
            ['footer', 'html:© 2026 · BVros Music Ecuador · versión 1.1 · <a href="privacy.html">Privacidad</a> · <a href="terms.html">Términos</a>']
        ],

        'distribution.html': [
            ['.page-head .eyebrow', 'DISTRIBUCIÓN'],
            ['.page-head h1', 'Distribución'],
            ['.page-head p', 'Recepción, revisión y publicación de lanzamientos dentro del ecosistema BVros.'],
            ['footer', 'html:© 2026 · BVros Music Ecuador · versión 1.1 · <a href="privacy.html">Privacidad</a> · <a href="terms.html">Términos</a>']
        ]

    },

    en: {

        'index.html': [
            ['.hub-hero h1', 'A home to create, learn and publish.'],
            ['.hub-hero .eyebrow', 'MUSIC NETWORK · ECUADOR'],
            ['.hub-hero p', 'This is the head of the ecosystem. From here you can access the music platform, internal distribution, artist profiles, training and products.'],
            ['.module-grid a:nth-child(1) h2', 'BVros Stream'],
            ['.module-grid a:nth-child(1) p', 'Music catalog and playback.'],
            ['.module-grid a:nth-child(2) h2', 'Distribution'],
            ['.module-grid a:nth-child(2) p', 'Reception, review and publishing of releases.'],
            ['.module-grid a:nth-child(3) h2', 'Academy'],
            ['.module-grid a:nth-child(3) p', 'Courses, workshops and music mentorship for creators of the ecosystem.'],
            ['.module-grid a:nth-child(4) h2', 'Artists'],
            ['.module-grid a:nth-child(4) p', 'Directory and public profiles of artists.'],
            ['footer', 'html:© 2026 · BVros Music Ecuador · versión 1.1 · <a href="privacy.html">Privacy</a> · <a href="terms.html">Terms</a>']
        ],

        'stream.html': [
            ['.page-head .eyebrow', 'GLOBAL CATALOG'],
            ['.page-head h1', 'BVros Stream'],
            ['.page-head p', 'All the music of the ecosystem in one place.'],
            ['.catalog-header :nth-child(3)', 'TRACK'],
            ['.catalog-header :nth-child(4)', 'ALBUM'],
            ['.catalog-header .h-dur', 'DURATION'],
            ['.catalog-header .h-plays', 'PLAYS'],
            ['footer', 'html:© 2026 · BVros Music Ecuador · versión 1.1 · <a href="privacy.html">Privacy</a> · <a href="terms.html">Terms</a>']
        ],

        'academy.html': [
            ['.page-head .eyebrow', 'ACADEMY'],
            ['.page-head h1', 'Academy'],
            ['.page-head p', 'Courses, workshops and music mentorship for creators of the ecosystem.'],
            ['footer', 'html:© 2026 · BVros Music Ecuador · versión 1.1 · <a href="privacy.html">Privacy</a> · <a href="terms.html">Terms</a>']
        ],

        'artists.html': [
            ['.page-head .eyebrow', 'DIRECTORY'],
            ['.page-head h1', 'Our Artists'],
            ['.page-head p', 'Meet the creators who are part of the BVros ecosystem.'],
            ['footer', 'html:© 2026 · BVros Music Ecuador · versión 1.1 · <a href="privacy.html">Privacy</a> · <a href="terms.html">Terms</a>']
        ],

        'distribution.html': [
            ['.page-head .eyebrow', 'DISTRIBUTION'],
            ['.page-head h1', 'Distribution'],
            ['.page-head p', 'Reception, review and publishing of releases within the BVros ecosystem.'],
            ['footer', 'html:© 2026 · BVros Music Ecuador · versión 1.1 · <a href="privacy.html">Privacy</a> · <a href="terms.html">Terms</a>']
        ]       

    }

};


function bvCurrentLang(){
    return localStorage.getItem('bvros_lang') || 'es';
}


function bvApplyLang(){

    const lang =
        bvCurrentLang();

    const nav =
        document.querySelector('.hub-links');

    if(!nav) return;


    /* 1) NAV */

    nav
        .querySelectorAll(':scope > a[href]')
        .forEach(a => {

            const file =
                (a.getAttribute('href') || '')
                    .split('/')
                    .pop();

            if(file === 'privacy.html'){
                a.style.display =
                    'none';
                return;
            }

            const label =
                BV_LANG[lang][file];

            if(label){
                a.textContent =
                    label;
            }

        });


    const loginBtn =
        nav.querySelector('button.bv-auth-login');

    if(loginBtn){
        loginBtn.textContent =
            lang === 'es' ? 'INICIO' : 'SIGN IN';
    }


    const toggle =
        nav.querySelector('#bvLangToggle');

    if(toggle){
        toggle.textContent =
            lang === 'es' ? 'EN' : 'ES';
    }


    /* 2) TEXTOS DE LA PÁGINA ACTUAL */

    const file =
        location.pathname.split('/').pop().toLowerCase();

    const map =
        (BV_PAGE_TEXTS[lang] || {})[file];

    if(map){

        map.forEach(entry => {

            const selector =
                entry[0];

            const text =
                entry[1];

            const el =
                document.querySelector(selector);

            if(!el) return;


            if(text.startsWith('html:')){
                el.innerHTML =
                    text.slice(5);
            }else{
                el.textContent =
                    text;
            }

        });

    }

    /* 3) Traductor legal (privacy/terms) */

    bvApplyLegal();

}


function bvEnsureToggle(){

    const nav =
        document.querySelector('.hub-links');

    if(
        !nav ||
        nav.querySelector('#bvLangToggle')
    ){
        return;
    }


    const toggle =
        document.createElement('button');

    toggle.id =
        'bvLangToggle';

    toggle.type =
        'button';

    toggle.textContent =
        bvCurrentLang() === 'es' ? 'EN' : 'ES';

    toggle.addEventListener(
        'click',
        () => {

            localStorage.setItem(
                'bvros_lang',
                bvCurrentLang() === 'es'
                    ? 'en'
                    : 'es'
            );

            bvApplyLang();

        }
    );

    nav.appendChild(toggle);

}


const bvLangStyle =
    document.createElement('style');

bvLangStyle.textContent = `

#bvLangToggle{
    border:1px solid var(--border,#2A2119);
    background:none;
    color:var(--accent,#F97316);
    font-family:var(--mono, monospace);
    font-size:.55rem;
    letter-spacing:.1em;
    padding:5px 9px;
    cursor:pointer;
}
#bvLangToggle:hover{
    border-color:var(--accent,#F97316);
}

`;

document.head.appendChild(bvLangStyle);


/* =========================================================
   BVROS LEGAL TRANSLATOR
   Traducción en bloque de privacy.html y terms.html:
   todos los h3 / p / li de .content.legal por índice.
   El HTML es la fuente ES; el snapshot permite
   restaurar al volver a español.
========================================================= */

const BV_LEGAL_EN = {

    'privacy.html': {

        head: [
            'LEGAL',
            'Privacy Notice',
            'How we handle your data within the BVros ecosystem.'
        ],

        h3s: [
            '1. Data we collect',
            '2. What we use it for',
            '3. Who we share it with',
            '4. Audio and protected content',
            '5. Your rights',
            '6. Cookies and local storage',
            '7. Accounts and passwords',
            '8. Contact'
        ],

        ps: [
            'Last updated: July 2026 · BVros Music Network · Ecuador',
            'When you use BVros we may collect: name and email when creating an account or subscribing; browsing and playback data within the platform; content artists upload (audio, covers, metadata); and shipping data when you buy physical products.',
            'We do not sell your data. We only share it with: payment gateways (to charge and to pay), hosting and database providers, digital distribution platforms when the artist authorizes it, and shipping services for physical products.',
            'Artists\' audio is served through short-lived signed URLs. This means nobody can download or redistribute the content without authorization: every playback is temporarily authorized and expires.',
            'You can request access, correction or deletion of your data by writing to bvrosmusic@gmail.com. We will respond within a maximum of 30 days.',
            'We use the browser\'s local storage to remember preferences (volume, last track, favorites). We do not use third-party advertising cookies.',
            'Passwords are stored solely as an irreversible encrypted hash: neither BVros nor its staff can see them. The email address is used for the session, access recovery and support replies. Your profile picture (if you upload one) is stored in the platform\'s storage and is publicly visible next to your username. Support forms are stored to handle your case and later archived according to the retention policy.',
            'Data controller: BVros Music Network, Ecuador · bvrosmusic@gmail.com'
        ],

        lis: [
            'Operate the stream, the catalog and the artist profiles.',
            'Process purchases of music and merchandising (physical or digital).',
            'Pay royalties to artists for plays and sales.',
            'Send communications you requested (releases, courses).'
        ],

        footer: 'html:© 2026 · BVros Music Ecuador · v1.1 · <a href="privacy.html">Privacy</a> · <a href="terms.html">Terms</a>'

    },

    'terms.html': {

        head: [
            'LEGAL',
            'Terms of Service',
            'BVros Music Network Ecuador.'
        ],

        h3s: [
            '1. Acceptance',
            '2. Access levels',
            '3. Registration and sign-in',
            '4. User profiles',
            '5. BVros License',
            '6. Artist profiles',
            '7. Prices, purchases and refunds',
            '8. Academy School',
            '9. Store and services',
            '10. Distribution',
            '11. Intellectual property',
            '12. Professional verification forms',
            '13. Payments',
            '14. Privacy',
            '15. Prohibited conduct',
            '16. Right of admission and amendments',
            '17. Liability',
            '18. Changes and applicable law'
        ],

        ps: [
            'Last updated: October 6, 2026 · BVros Music Network · Ecuador',
            'By using BVros you accept these terms. If you do not agree, do not use the platform.',
            '<strong>Level 1 — External spectator (no account):</strong> may browse all modules and view the streaming catalog classified by albums and singles, the course information in Academy, artist profiles and the store. Cannot play locked content or access previews. BVros may unlock albums or tracks by season or promotional moments, without prior notice, as advertising for the next level.',
            '<strong>Level 2 — Free account:</strong> obtained by registering (email + password or Google account). Includes previews: first pages of ebooks, short videos in Academy and playback of a few seconds of exclusive tracks designated by BVros operational control, plus active plays and likes.',
            '<strong>Level 3 — Subscriber:</strong> paid monthly subscription that unlocks benefits according to the declared profile (see sections 4-6-8-9).',
            'Registration is free. The user chooses a unique username and declares their profile. Access can be via Google account (no password; to obtain a personal password it must be requested from support) or via email and password. Passwords are stored encrypted with an irreversible hash: nobody at BVros can see them. If the user loses access, they can reset it through the recovery link sent to their email, or contact support.',
            '<strong>Profile 1 (listener):</strong> fan, music lover, influencer, radio listener, entertainment or hobby. Standard subscription: $3.99 USD/month. Does not include distribution, artist profile, own store or music uploads. These benefits may be enabled in the future based on merit, verified and registered application.',
            '<strong>Profile 2 (creator):</strong> professional musician, academic, teacher, composer, producer, beat maker, sound engineer or cultural manager. Professional subscription: $3.00 USD/month. Includes everything in Profile 1 plus: public artist profile, store with merch and services, and access to the distribution process with BVros Music Network Ecuador (subject to verification).',
            'Audio and video content is served through short-lived signed URLs. This means nobody can download or redistribute the content without authorization: every playback is temporarily authorized and expires.',
            'Each artist has a free follow button (to view their information, demos and links to external platforms) and a paid subscription exclusive to their content. The artist subscription split is 60% artist / 40% BVros (operations, support and distribution). BVros does not appropriate copyrights, sales or the artist\'s identity.',
            'Playback of purchased content is unlimited for as long as the account exists.',
            'Digital music and digital products (ebooks, courses) are non-refundable once downloaded. Physical products accept returns within 30 days in original packaging, per the seller\'s policy (Mercado Libre or another channel).',
            'Courses (piano, guitar, production, music marketing, cultural management, competitive funds such as IFAC and RUAC, among others), ebooks, pre-recorded webinars and sheet music are shown with cover, name and date. Access for partners or sellers requires profile 2, Level 3 and subscription; Level 2 does not include this benefit.',
            'Accessible for online purchases without a subscription. Level 2 and 3 subscribers get 50% off selected products. Each artist with a verified profile 2 publishes products and services (merchandising, instruments, own courses, unreleased content, bookings for events, rehearsals, recording and teaching). Hiring is done through the service form: natural person or company name, specific requirement, offered budget, contact location, address and additional details.',
            'Module exclusive to Profile 2 subscribers. Requires prior application through a form, verification of data and track record during two weeks of anticipation. BVros reserves the right of admission. Representation and distribution under the BVros Music Network Ecuador label is split 70% artist / 30% platform. Artist payments are made via PayPal or savings account upon reaching a minimum accumulated threshold of $20.00 USD.',
            'Audio and covers belong to their artists. Design, code and the BVros brand belong to BVros Music Network. Re-uploading, ripping or redistributing audio served through signed URLs is prohibited.',
            'Professional verification application forms are available to Profile 2 during the first month of subscription. If the professional user does not drive their activity during that period, access to these forms is blocked and is only restored by contacting support.',
            'Charges are processed through PayPal and an integrated debit/credit card gateway. Renewal is monthly and automatic and can be canceled from the account or through support. Payments to artists are broken down and remitted once the established threshold is reached.',
            'The processing of personal data is governed by our <a href="privacy.html">Privacy Policy</a>. Passwords are irreversibly encrypted and are not visible even to the BVros team.',
            'BVros reserves the right of admission, to enable or restrict benefits according to the user\'s profile and merit, and to update these terms, notifying relevant changes on the platform.',
            'BVros operates the platform "as is". We are not liable for outages of third-party services (payment gateways, hosting, external stores) beyond our reasonable management.',
            'We may update these terms with 30 days\' notice. They are governed by the laws of the Republic of Ecuador; disputes will be resolved through arbitration in Quito.'
        ],

        lis: [
            'You must be 18 years old or have a guardian\'s authorization.',
            'You are responsible for the truthfulness of your data and for keeping your password safe.',
            'We may suspend accounts that violate these terms.',
            'BVros is not responsible for redistribution of content by third parties.',
            'You guarantee that you own or hold a license for the audio and images you upload.',
            'You grant BVros a non-exclusive license to distribute and display your content inside and outside the ecosystem.',
            'Uploading content with third-party rights without authorization.',
            'Attempting to access other people\'s data or accounts.',
            'Publishing offensive, discriminatory or illegal content.'
        ],

        footer: 'html:© 2026 · BVros Music Ecuador · v1.1 · <a href="privacy.html">Privacy</a> · <a href="terms.html">Terms</a>'

    }

};


let bvLegalSnapshot = null;


function bvSnapshotLegal(){

    const file =
        location.pathname.split('/').pop().toLowerCase();

    if(
        file !== 'privacy.html' &&
        file !== 'terms.html'
    ){
        bvLegalSnapshot = null;
        return;
    }

    const main =
        document.querySelector('.content.legal');

    if(!main){
        bvLegalSnapshot = null;
        return;
    }

    bvLegalSnapshot = {
        head: [
            '.page-head .eyebrow',
            '.page-head h1',
            '.page-head p'
        ].map(
            s => document.querySelector(s)?.innerHTML || ''
        ),
        ps:
            [...main.querySelectorAll('p')]
                .map(e => e.innerHTML),
        h3s:
            [...main.querySelectorAll('h3')]
                .map(e => e.innerHTML),
        lis:
            [...main.querySelectorAll('li')]
                .map(e => e.innerHTML),
        footer:
            document.querySelector('footer')?.innerHTML || ''
    };

}


function bvApplyLegal(){

    const file =
        location.pathname.split('/').pop().toLowerCase();

    const doc =
        BV_LEGAL_EN[file];

    if(!doc) return;

    const lang =
        bvCurrentLang();


    /* --- EN: aplicar traducción --- */

    if(lang === 'en'){

        [
            '.page-head .eyebrow',
            '.page-head h1',
            '.page-head p'
        ].forEach((sel, i) => {

            const el =
                document.querySelector(sel);

            if(el){
                el.innerHTML =
                    doc.head[i] || '';
            }

        });


        document
            .querySelectorAll('.content.legal p')
            .forEach((el, i) => {
                el.innerHTML =
                    doc.ps[i] || el.innerHTML;
            });

        document
            .querySelectorAll('.content.legal h3')
            .forEach((el, i) => {
                el.textContent =
                    doc.h3s[i] || el.textContent;
            });

        document
            .querySelectorAll('.content.legal li')
            .forEach((el, i) => {
                el.innerHTML =
                    doc.lis[i] || el.innerHTML;
            });


        const footer =
            document.querySelector('footer');

        if(footer){
            footer.innerHTML =
                doc.footer.slice(5);
        }

        return;

    }


    /* --- ES: restaurar desde el snapshot --- */

    if(bvLegalSnapshot){

        [
            '.page-head .eyebrow',
            '.page-head h1',
            '.page-head p'
        ].forEach((sel, i) => {

            const el =
                document.querySelector(sel);

            if(el){
                el.innerHTML =
                    bvLegalSnapshot.head[i] || '';
            }

        });


        document
            .querySelectorAll('.content.legal p')
            .forEach((el, i) => {
                el.innerHTML =
                    bvLegalSnapshot.ps[i] ?? el.innerHTML;
            });

        document
            .querySelectorAll('.content.legal h3')
            .forEach((el, i) => {
                el.innerHTML =
                    bvLegalSnapshot.h3s[i] ?? el.innerHTML;
            });

        document
            .querySelectorAll('.content.legal li')
            .forEach((el, i) => {
                el.innerHTML =
                    bvLegalSnapshot.lis[i] ?? el.innerHTML;
            });


        const footer =
            document.querySelector('footer');

        if(footer){
            footer.innerHTML =
                bvLegalSnapshot.footer;
        }


        /* El DOM volvió a ser español:
           el snapshot queda fresco para el
           próximo cambio a EN. */

        bvSnapshotLegal();

    }

}

/* =========================================================
   INICIALIZACIÓN (debe ir AL FINAL:
   usa const definidas más arriba)
========================================================= */

bvEnsureToggle();

bvSnapshotLegal();

bvApplyLang();

window.addEventListener(
    'bvros:navigated',
    () => {
        bvSnapshotLegal();
        bvEnsureToggle();
        bvApplyLang();
        bvApplyLegal();
    }
);

window.addEventListener(
    'bvros:authstate',
    () => setTimeout(
        () => {
            bvEnsureToggle();
            bvApplyLang();
        },
        60
    )
);