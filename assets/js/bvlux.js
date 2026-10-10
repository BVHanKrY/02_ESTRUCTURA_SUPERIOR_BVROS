/* =========================================================
   BVLUXPRO 1.1.2 / 1.1.2.1
   Interfaz de compra única de productos exclusivos
   (pistas, ebooks, cursos). Replicable por producto:
   solo cambia título, precio y descripción.
========================================================= */

import { supabase }
    from './services/auth-service.js';

const STYLE =
    document.createElement('style');

STYLE.textContent = `

#bvluxModal{
    position:fixed;
    inset:0;
    z-index:9700;
    display:flex;
    align-items:center;
    justify-content:center;
    background:rgba(0,0,0,.8);
    backdrop-filter:blur(6px);
    padding:16px;
}
#bvluxModal.hidden{ display:none; }

.bvlux-card{
    width:100%;
    max-width:400px;
    max-height:92vh;
    overflow:auto;
    background:var(--surface,#14100C);
    border:1px solid #FFD700;
    padding:22px;
    position:relative;
    color:var(--text,#F2EDE4);
}

.bvlux-title{
    font-family:'Orbitron',sans-serif;
    font-size:.95rem;
    font-weight:700;
    color:#FFD700;
    margin:0 0 4px;
}

.bvlux-unique{
    font-family:var(--mono,monospace);
    font-size:.55rem;
    letter-spacing:.15em;
    color:var(--text-muted,#9A8D7D);
    margin-bottom:14px;
}

.bvlux-cover{
    width:100%;
    aspect-ratio:1;
    object-fit:cover;
    border:1px solid var(--border,#2A2119);
    margin-bottom:12px;
}

.bvlux-meta div{
    margin-bottom:6px;
    font-size:.72rem;
    line-height:1.5;
}
.bvlux-meta b{
    color:#FFD700;
    font-family:var(--mono,monospace);
    font-size:.55rem;
    letter-spacing:.1em;
    text-transform:uppercase;
    display:block;
}

.bvlux-sello{
    margin:14px 0;
    padding-top:10px;
    border-top:1px solid var(--border,#2A2119);
    font-family:var(--mono,monospace);
    font-size:.55rem;
    color:var(--text-muted,#9A8D7D);
}

#bvluxPayContainer{
    margin-top:12px;
    min-height:52px;
}

.bvlux-note{
    margin-top:10px;
    font-size:.55rem;
    line-height:1.5;
    color:var(--text-muted,#9A8D7D);
}

.bvlux-close{
    position:absolute;
    top:10px; right:12px;
    width:28px; height:28px;
    border:1px solid var(--border,#2A2119);
    background:none;
    color:var(--text-muted,#9A8D7D);
    cursor:pointer;
}
.bvlux-close:hover{
    color:#FFD700;
    border-color:#FFD700;
}

.bvlux-err{
    margin-top:8px;
    color:#F87171;
    font-size:.62rem;
    min-height:1em;
}

`;

document.head.appendChild(STYLE);


window.BVLUX = {

    

    /* Interfaz de compra: pista exclusiva.
       discounted = usuario registrado (nivel 2):
       aplica el precio con 50% de descuento. */

    openListen(track, discounted = false){

        const price =
            discounted
                ? (track.discount_price || 0.70)
                : (track.listen_price || 1.15);

        const title =
            discounted
                ? `Escucha 50% dscto. · $${price.toFixed(2)}`
                : `Escucha · $${price.toFixed(2)}`;


        const modal =
            document.createElement('div');

        modal.id =
            'bvluxModal';

        modal.innerHTML = `

            <div class="bvlux-card">

                <button
                    class="bvlux-close"
                    type="button"
                >×</button>

                <h3 class="bvlux-title">
                    ${title} · pago único
                </h3>

                <div class="bvlux-unique">
                    PRODUCTO EXCLUSIVO · ACCESO DEFINITIVO
                </div>

                ${
                    track.cover
                        ? `<img class="bvlux-cover"
                               src="${track.cover}"
                               alt="">`
                        : ''
                }

                <div class="bvlux-meta">

                    <div><b>Título</b>
                        ${track.title || '—'}</div>

                    <div><b>Artista</b>
                        ${track.artist || '—'}</div>

                    <div><b>Género</b>
                        ${track.genre || 'Instrumental'}</div>

                    <div>
                        <b>Descripción</b>
                        ${track.description
                            || 'Pista exclusiva del catálogo BVros.'}
                    </div>

                </div>

                <div class="bvlux-sello">
                    Sello discográfico BVros ©2026 ·
                    Hankry · Derechos reservados y
                    exclusivos · "versión inédita"
                </div>

                <div id="bvluxPayContainer"></div>

                <div class="bvlux-err"
                     data-ref="err"></div>

                <p class="bvlux-note">
                    Pago único con PayPal o tarjeta de
                    débito/crédito. Producto digital: no
                    reembolsable una vez descargado.
                    Disputas: primero vía administrativa
                    (soporte BVros); no se aceptan reclamos
                    después de 30 días. Reproducciones
                    ilimitadas mientras tu cuenta exista.
                </p>

            </div>

        `;

        document.body.appendChild(modal);

        const close =
            () => modal.remove();

        modal.querySelector('.bvlux-close')
            .addEventListener('click', close);

        modal.addEventListener(
            'click',
            e => {
                if(e.target === modal) close();
            }
        );


        /* Montar la pasarela con el precio
           del producto */

        window.BVrosPay.buyOnce(
            'bvluxPayContainer',
            'single',
            async details => {

                try{

                    await window.BVrosPay.recordPurchase(
                        track.id
                            || track.slug,
                        price,
                        details.id
                    );

                }catch(error){

                    console.warn(
                        '[BVLUX] Registro de compra:',
                        error
                    );

                }

                window.BVLUX.saveGuestPurchase(
                    track.id || track.slug,
                    details.id
                );

                modal.remove();

                window.BVrosPlayer
                    ?.showToast(
                        'Compra exitosa ✔ ya puedes escuchar la pista completa.'
                    );

            },
            error => {

                modal.querySelector(
                    '[data-ref="err"]'
                ).textContent =
                    'Error de pago: ' +
                    (error?.message || 'intenta de nuevo');

            },
            {
                amount:
                    price,

                description:
                    track.title
                        || 'Pista exclusiva'
            }
        );

        
    },

    /* Guardar la compra del invitado
       (localStorage): la compra de producto
       queda ligada a este navegador aunque
       no haya sesión. */

    saveGuestPurchase(trackId, reference){

        try{

            const key =
                'bvros_guest_purchases';

            const list =
                JSON.parse(
                    localStorage.getItem(key) || '[]'
                );

            list.push({
                trackId,
                reference,
                at:
                    Date.now()
            });

            localStorage.setItem(
                key,
                JSON.stringify(list)
            );

        }catch(error){

            /* ignorar */

        }

    },

    /* ¿Este navegador compró ya la pista? */

    hasGuestPurchase(trackId){

        try{

            const list =
                JSON.parse(
                    localStorage.getItem(
                        'bvros_guest_purchases'
                    ) || '[]'
                );

            return list.some(
                p =>
                    p.trackId === trackId
            );

        }catch{

            return false;

        }

    }

};