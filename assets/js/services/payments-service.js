/* =========================================================
   BVROS PAYMENTS SERVICE — 2B.9 (WEBHOOK ACTIVO + ESCUDO
   ANTI-DOBLE-PAGO)
   PayPal Smart Buttons (incluye pago con tarjeta dentro
   del flujo de PayPal: enable-funding=card).
   Precios BVLUX pasarela 1.1.1:
     Nivel 2 $3.99 · Nivel 3 $4.75 · promo Nivel 2 $1.70.
   Compras únicas: $5.00 / $2.99 / $4.99 (2B.3).

   NUEVO EN 2B.9:
   · ESCUDO DE PROCESAMIENTO: al aprobar el pago la
     pantalla se cubre con un aviso que BLOQUEA todo
     ("Confirmando tu pago… no cierres ni toques Volver")
     hasta que llega la confirmación. Evita que el usuario
     desespere, toque atrás y pague dos veces.
   · POLLING MÁS RÁPIDO: primer chequeo a 1 s y luego
     cada 2 s (antes 3 s). Máx ~30 s.
   · WEBHOOK_ACTIVO = true: la activación es 100%
     server-side (probada en sandbox con el webhook
     funcionando: firma SUCCESS + nivel activado).

   NUEVO EN 2B.9.1 — BIENVENIDA INMEDIATA:
   · La bienvenida aparece en cuanto PayPal confirma el
     cobro (~2 s tras aprobar). El nivel se activa en
     SEGUNDO PLANO cuando el webhook aterrice: el
     navegador sigue sondeando sin bloquear a nadie.
   · Así el usuario nunca espera mirando una pantalla:
     el webhook de sandbox tarda 10–30 s y eso ya no
     lo sufre nadie.

   NUEVO EN 2B.9.2 — CONFIRMACIÓN VISIBLE:
   · Tras el cobro, el escudo cambia a modo ÉXITO
     (✓ dorado + "¡Pago confirmado!") y permanece un
     mínimo de 3.5 s antes de la bienvenida: el
     comprador VE que su pago quedó registrado.
   · Si el webhook confirma dentro de esa ventana, el
     nivel ya aparece activo al mostrar la bienvenida;
     si no, sigue activando en segundo plano.

   NUEVO EN 2B.9.3 — SECUENCIA DE CONFIRMACIÓN (10 s):
   · Dos fases visibles SIEMPRE, 5 segundos cada una:
     FASE 1 · CARGA — "Confirmando tu pago…" (spinner):
       5 s visibles (incluyen el cobro de PayPal y los
       primeros chequeos del webhook; tope
       FASE_CARGA_MAX_MS).
     FASE 2 · ÉXITO — "¡Pago confirmado!" (✓ dorado):
       5 s SIEMPRE visibles (FASE_EXITO_MS), pase lo
       que pase.
   · Total: ~10 segundos de punta a punta.
   · Mensaje de la fase 2 adaptable: si el webhook ya
     activó, dice "Tu nivel BVLUX ya está activo"; si
     aún no, dice "Activando tu nivel BVLUX…" y sigue
     en segundo plano. La seguridad no cambia: el
     navegador no activa nada.

   NUEVO EN 2B.9.4 — LIVE + COMPATIBILIDAD CON LA
   CANCELACIÓN (menú Suscripción 2B.9 del gate):
   · Client ID de la app LIVE «BVLUX LIVE».
   · hasActivePlan ahora cuenta también las
     suscripciones CANCELADAS no vencidas como
     vigentes: quien cancela conserva sus beneficios
     hasta expires_at (la caducidad la resuelve el
     cron de la base, no el navegador).

   BASE 2B.7 — VALIDACIÓN SERVER-SIDE (webhook):
   · El pedido se crea con custom_id compuesto:
       "idSuscripcion|idUsuario|tier"
     → la Edge Function de Supabase recibe
       PAYMENT.CAPTURE.COMPLETED, verifica la firma de
       PayPal y activa el nivel EN EL SERVIDOR.
   · Con WEBHOOK_ACTIVO = true el navegador YA NO
     activa nada: solo espera la confirmación del
     servidor (polling del perfil).

   CORRECCIONES previas conservadas:
   1. El intento de pago se registra en la base ANTES de
      abrir PayPal (createOrder).
   2. .maybeSingle() con mensaje claro si la política
      RLS bloquea el registro.
   3. activatePayment avisa con mensaje claro si el pago
      se capturó pero la activación falla.
   4. PRICING alineado: $3.99 Nivel 2, $4.75 Nivel 3,
      $1.70 promo Nivel 2.
   5. hasActivePlan degrada el perfil a 'free' si la
      suscripción expiró.
   ========================================================= */

import { supabase } from './auth-service.js';

/*
   CLIENT ID DE PRODUCCIÓN (LIVE):
   App «BVLUX LIVE» (developer.paypal.com → Live).
   El Client ID es público: viaja en el HTML igualmente.
   El SECRET de esta app NUNCA va en código web: vive
   en los secrets de la Edge Function de Supabase.
   Para pruebas de sandbox usa otra app y NO la
   subas a producción.
*/

const PAYPAL_CLIENT_ID =
    'BAAXFla6aVvDXePLDzOCwkUagGflIi-b5xuiNIHO8k20heffKL0w2nqzyGwOxwZCpgXYRcxLpU-5fP8PKc';

/* Único punto de intercambio de pasarela:
   cuando actives Stripe, cambia a 'stripe'. */

const PAYMENT_PROVIDER =
    'paypal';   // 'paypal' | 'stripe'

/* =========================================================
   INTERRUPTOR DEL WEBHOOK — ACTIVO DESDE 2B.9.
   El webhook está probado en sandbox (firma SUCCESS y
   nivel activado por el servidor). El navegador ya no
   activa nada: solo el servidor puede poner premium.
   Si algún día necesitas volver al modo de prueba
   (activación client-side sin webhook), cambia a false.
========================================================= */

const WEBHOOK_ACTIVO = true;

/* Espera tras capturar el pago (2B.9):
   · primer chequeo a los 1 s (el webhook suele tardar
     3–10 s),
   · luego cada 2 s,
   · máx 15 intentos ≈ 30 s.
   Desde 2B.9.1 esta espera corre EN SEGUNDO PLANO: la
   bienvenida se muestra al instante y el nivel queda
   activo cuando el webhook aterrice. */

const POLL_PRIMERA_MS = 1000;
const POLL_INTENTOS = 15;
const POLL_PAUSA_MS = 2000;

/* SECUENCIA DE CONFIRMACIÓN (2B.9.3) — dos fases
   visibles, 5 segundos cada una (total ~10 s):
   · FASE 1 (carga): "Confirmando tu pago…" — cubre el
     cobro de PayPal + los primeros chequeos del webhook.
   · FASE 2 (éxito): "¡Pago confirmado!" — siempre
     visible 5 s, pase lo que pase.
   El reloj arranca al aprobar el pago (no después del
   cobro), así el total queda garantizado. */

const FASE_CARGA_MAX_MS = 5000;
const FASE_EXITO_MS = 5000;

const PRICING = {

    mensual: {
        perfil1: 3.99,
        perfil2: 3.99
    },

    nivel3: 4.75,
    promoNivel2: 1.70,

    album_unico: 5.00,
    single: 2.99,
    album_exclusivo: 4.99

};

let paypalReady = null;


/* Carga del SDK de PayPal (una sola vez).
   CORRECCIÓN: enable-funding=card muestra el
   botón de tarjeta de débito/crédito además
   de PayPal (requisito de la pasarela BVros). */

function loadPayPalSDK(){

    if(paypalReady){
        return paypalReady;
    }

    paypalReady =
        new Promise((resolve, reject) => {

            if(window.paypal){
                resolve();
                return;
            }

            const s =
                document.createElement('script');

            s.src =
                `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD&intent=capture&enable-funding=card`;

            s.onload = () => resolve();

            s.onerror = () => reject(
                new Error(
                    'No se pudo cargar PayPal. Verifica el Client ID y tu conexión.'
                )
            );

            document.head.appendChild(s);

        });

    return paypalReady;

}


/* Registro del intento en la base.
   CORRECCIÓN: .maybeSingle() en lugar de .single()
   y mensajes claros si la RLS bloquea el INSERT. */

async function createPendingPayment({
    billingType,
    amount
}){

    const auth =
        window.BVrosAuth;

    /*
       USUARIO INVITADO (BVLUX):
       la compra sin sesión se registra con
       user_id NULL. Requiere política RLS:
         with check (auth.uid() = user_id or user_id is null)
    */

    const insertData = {
        billing_type:
            billingType,

        plan_type:
            'invitado',

        payment_provider:
            PAYMENT_PROVIDER,

        amount,

        status:
            'pending'
    };

    if(auth?.user){
        insertData.user_id =
            auth.user.id;
    }

    const { data, error } =
        await supabase
            .from('subscriptions')
            .insert(insertData)
            .select()
            .maybeSingle();

    if(error){
        console.error(
            '[BVros Pay] No se pudo registrar el intento de pago:',
            error
        );

        throw new Error(
            'No se pudo iniciar el registro del pago (revisa la política RLS de INSERT en subscriptions).'
        );
    }

    return data;

}


/* Confirmación: activa premium 30 días.
   CORRECCIÓN: si la activación falla tras capturar
   el pago, el error incluye la referencia para que
   soporte pueda activarla a mano. */

async function activatePayment(subscriptionId, reference){

    const now =
        new Date();

    const expires =
        new Date(
            now.getTime() + 30 * 24 * 60 * 60 * 1000
        );

    const { error: subError } =
        await supabase
            .from('subscriptions')
            .update({
                plan:
                    'premium',

                status:
                    'active',

                payment_reference:
                    reference,

                started_at:
                    now.toISOString(),

                expires_at:
                    expires.toISOString(),

                renews_at:
                    expires.toISOString()
            })

            .eq('id', subscriptionId);

    if(subError){
        throw new Error(
            `El pago se capturó (ref: ${reference}) pero no se pudo registrar la suscripción. Contacta a soporte con esa referencia.`
        );
    }


    /* Solo si hay sesión: el plan premium
       pertenece a una cuenta. La compra de
       invitado queda registrada sin plan. */

    if(window.BVrosAuth?.user){

        const { error: profError } =
            await supabase
                .from('profiles')
                .update({
                    plan:
                        'premium'
                })

                .eq('id', window.BVrosAuth.user.id);

        if(profError){
            throw new Error(
                `El pago se capturó (ref: ${reference}) pero no se pudo activar tu plan. Contacta a soporte con esa referencia.`
            );
        }

        await window.BVrosAuth.refreshProfile();

    }

}


/* =========================================================
   ESCUDO DE PROCESAMIENTO (2B.9 / 2B.9.2)
   Cubre TODA la pantalla mientras se confirma el pago y
   unos segundos más en modo ÉXITO — el comprador ve que
   su pago quedó registrado y nadie toca nada por error
   (Volver, cerrar, pagar dos veces).
   ========================================================= */

const ESCUDO_ID = 'bvros-escudo-pago';

function escudoPago(mostrar){

    const existente =
        document.getElementById(ESCUDO_ID);

    if(mostrar){

        if(existente){
            return;   /* ya está visible */
        }

        const escudo =
            document.createElement('div');

        escudo.id = ESCUDO_ID;

        escudo.innerHTML = `
          <style>
            #${ESCUDO_ID}{
                position:fixed; inset:0;
                z-index:10500;
                background:rgba(10,8,5,.93);
                display:flex; flex-direction:column;
                align-items:center; justify-content:center;
                gap:18px; text-align:center;
                font-family:system-ui,-apple-system,sans-serif;
                color:#F2E8D5; padding:24px;
            }
            #${ESCUDO_ID} .bv-escudo-aro{
                width:46px; height:46px;
                border-radius:50%;
                border:4px solid rgba(242,232,213,.18);
                border-top-color:#E8C15A;
                animation:bv-escudo-giro .9s linear infinite;
            }
            #${ESCUDO_ID} .bv-escudo-ok{
                width:46px; height:46px;
                border-radius:50%;
                border:4px solid #E8C15A;
                display:flex; align-items:center;
                justify-content:center;
                font-size:24px; color:#E8C15A;
                font-weight:bold;
            }
            #${ESCUDO_ID} h4{
                margin:0; font-size:17px;
                letter-spacing:.4px;
            }
            #${ESCUDO_ID} p{
                margin:0; font-size:13px;
                opacity:.78; max-width:330px;
                line-height:1.55;
            }
            @keyframes bv-escudo-giro{
                to{ transform:rotate(360deg); }
            }
          </style>
          <div class="bv-escudo-cuerpo">
            <div class="bv-escudo-aro"></div>
            <h4>Confirmando tu pago…</h4>
            <p>No cierres la página ni toques Volver.<br>Estamos validando tu pago con el servidor.<br>Esto tarda solo unos segundos.</p>
          </div>
        `;

        document.body.appendChild(escudo);

        return;
    }

    existente?.remove();

}


/* Cambia el escudo a modo ÉXITO (2B.9.2 / 2B.9.3):
   ✓ dorado + mensaje de pago recibido.
   Se muestra SIEMPRE que el capture de PayPal
   respondió bien — el dinero está cobrado.
   2B.9.3: el texto se adapta — si el webhook ya
   activó el nivel, lo dice; si no, avisa que está
   activando en segundos. */

function escudoExito(nivelActivo){

    const cuerpo =
        document.querySelector(
            `#${ESCUDO_ID} .bv-escudo-cuerpo`
        );

    if(!cuerpo){
        return;
    }

    cuerpo.innerHTML = `
      <div class="bv-escudo-ok">✓</div>
      <h4>¡Pago confirmado!</h4>
      <p>Tu pago fue recibido correctamente.<br>${
          nivelActivo
              ? 'Tu nivel BVLUX ya está activo.'
              : 'Activando tu nivel BVLUX…'
      }</p>
    `;

}


/* Espera a que el webhook de PayPal (Edge Function de
   Supabase) active el nivel en la base. El navegador NO
   activa nada por su cuenta: solo consulta el perfil
   hasta ver el tier confirmado por el servidor.
   2B.9: primer chequeo a 1 s, luego cada 2 s. */

async function esperarActivacionWebhook(
    tier,
    intentosMax = POLL_INTENTOS
){

    const auth =
        window.BVrosAuth;

    /* Compras únicas (sin tier): el webhook no activa
       nada aquí — no hacer esperar al usuario.
       Devuelve TRUE (nada que esperar). */

    if(!tier){
        return true;
    }

    /* ¿Ya es premium? (compra repetida o nivel vivo):
       no esperar. */

    if(auth?.profile?.plan === 'premium'){
        return true;
    }

    for(let i = 0; i < intentosMax; i++){

        await new Promise(
            r => setTimeout(
                r,
                i === 0
                    ? POLL_PRIMERA_MS
                    : POLL_PAUSA_MS
            )
        );

        try{
            await auth?.refreshProfile();
        }catch(e){
            /* Error de red: reintenta en la
               siguiente vuelta. */
        }

        const t =
            auth?.profile?.subscription_tier;

        if(tier && t === tier){
            return true;
        }

        /* El webhook pudo activar premium sin tier
           (cuentas antiguas): también es éxito. */

        if(auth?.profile?.plan === 'premium'){
            return true;
        }

    }

    /* Sin confirmación dentro de los intentos
       dados: quien llamó decide (segundo plano
       o aviso). */

    return false;

}


/* Montar botones PayPal en un contenedor.
   CORRECCIÓN: el intento se registra en createOrder
   (antes de abrir PayPal) y se reutiliza en
   onApprove; si no existiera, se crea ahí.
   2B.7: el pedido lleva custom_id compuesto
   "idSub|idUser|tier" para que la Edge Function
   sepa a quién y qué nivel activar. */

async function mountPayPalButtons({
    containerId, billingType, amount, description, onSuccess, onError, tier
}){

    const container =
        document.getElementById(containerId);

    if(!container){
        throw new Error(
            'Contenedor de pago no encontrado'
        );
    }

    await loadPayPalSDK();


    /* Los botones solo se renderizan una vez
       por contenedor: limpiar antes */

    container.innerHTML = '';

    let pendingSub = null;

    window.paypal.Buttons({

        style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal',
            height: 40
        },

        createOrder: async (data, actions) => {

            /* Registrar el intento ANTES del cobro.
               Si falla, no bloqueamos el pago: el
               registro se reintentará en onApprove. */

            try{
                pendingSub =
                    await createPendingPayment({
                        billingType,
                        amount
                    });
            }catch(e){
                console.warn(
                    '[BVros Pay] Intento de pago no registrado previamente:',
                    e
                );
            }

            return actions.order.create({
                purchase_units: [{
                    amount: {
                        value:
                            amount.toFixed(2)
                    },
                    description:
                        description || `BVros — ${billingType}`,
                    custom_id:
                        [
                            pendingSub?.id || '',
                            window.BVrosAuth?.user?.id || '',
                            tier || ''
                        ].filter(Boolean).join('|')
                }]
            });

        },

        onApprove: async (data, actions) => {

            /* ESCUDO 2B.9: desde este momento la pantalla
               queda bloqueada con el aviso de proceso.
               Se quita al confirmar o al fallar.
               2B.9.3: el reloj de la secuencia (máx ~10 s)
               arranca AQUÍ, con el escudo ya visible. */

            escudoPago(true);

            const inicio =
                Date.now();

            try{

                const details =
                    await actions.order.capture();

                if(!pendingSub?.id){
                    pendingSub =
                        await createPendingPayment({
                            billingType,
                            amount
                        });
                }

                /* WEBHOOK ACTIVO (producción): el
                   navegador no activa NADA. La Edge
                   Function de Supabase recibe el evento
                   de PayPal, verifica su firma y activa
                   el nivel en la base. Aquí solo se
                   espera la confirmación. */

                if (WEBHOOK_ACTIVO) {

                    /* 2B.9.3 — SECUENCIA DE CONFIRMACIÓN
                       (5 s carga + 5 s éxito = ~10 s,
                       reloj desde el inicio de onApprove):

                       FASE 1 · CARGA (spinner, ya visible):
                         el capture de PayPal + los primeros
                         chequeos del webhook. Tope 5 s:
                         FASE_CARGA_MAX_MS.

                       FASE 2 · ÉXITO (✓ dorado):
                         siempre visible 5 s
                         (FASE_EXITO_MS).

                       La seguridad NO cambia: el navegador
                       no activa nada. Si el webhook no
                       confirmó dentro de la secuencia,
                       sigue activando en segundo plano y
                       la próxima lectura del perfil ya lo
                       muestra. */

                    const confirmado =
                        await esperarActivacionWebhook(
                            tier,
                            2          /* ~3 s de chequeos */
                        );

                    /* Completar la FASE 1 hasta su tope
                       (el reloj incluye el cobro). */

                    const restanteCarga =
                        FASE_CARGA_MAX_MS
                            - (Date.now() - inicio);

                    if(restanteCarga > 0){
                        await new Promise(
                            r => setTimeout(r, restanteCarga)
                        );
                    }

                    /* FASE 2 · ÉXITO — siempre visible. */

                    escudoExito(confirmado);

                    await new Promise(
                        r => setTimeout(r, FASE_EXITO_MS)
                    );

                    escudoPago(false);

                    onSuccess?.(details);

                    if(!confirmado){

                        /* Segundo plano: nada bloqueado.
                           El nivel aparece solo cuando el
                           webhook aterrice. */

                        console.info(
                            '[BVros Pay] Pago cobrado; el nivel se activará en segundos (webhook en camino).'
                        );

                        esperarActivacionWebhook(tier)
                            .then(() =>
                                window.BVrosAuth
                                    ?.refreshProfile?.()
                            )
                            .catch(() => {});
                    }

                    return;
                }

                /* MODO DE PRUEBA (webhook apagado):
                   activación client-side. NO cobres en
                   real con esta vía. */

                if(!pendingSub?.id){
                    throw new Error(
                        `Pago capturado (ref: ${details.id}) sin registro previo. Contacta a soporte con esa referencia.`
                    );
                }

                await activatePayment(
                    pendingSub.id,
                    details.id
                );

                escudoPago(false);

                onSuccess?.(details);

            }catch(error){

                /* Nunca dejar el escudo pegado si
                   algo falla: la pantalla vuelve y
                   PayPal reporta el error. */

                escudoPago(false);

                throw error;
            }

        },

        onError: (error) => {

            escudoPago(false);

            console.error(
                '[BVros Pay] Error PayPal:',
                error
            );

            onError?.(error);

        }

    }).render(`#${containerId}`);

}


/* =========================================================
   API PÚBLICA
========================================================= */

window.BVrosPay = {

    PRICING,

    PAYMENT_PROVIDER,

    /* La vista individual del nivel llama a esto.
       El precio lo decide el gate (overridePrice):
       Nivel 2 $3.99 · Nivel 3 $4.75 · promo $1.70.
       2B.7: tier viaja hasta custom_id para el
       webhook (nivel2 / nivel2_promo / nivel3). */

    async startSubscription(containerId, onSuccess, onError, overridePrice, tier){

        const auth =
            window.BVrosAuth;

        if(!auth?.user){
            throw new Error(
                'Debes crear tu cuenta gratuita antes de suscribirte.'
            );
        }

        if(PAYMENT_PROVIDER === 'paypal'){

            const price =
                overridePrice
                    ? Number(overridePrice)
                    : (
                        auth.profile?.profile_type === 'perfil2'
                            ? PRICING.mensual.perfil2
                            : PRICING.mensual.perfil1
                      );

            return mountPayPalButtons({
                containerId,
                billingType: 'mensual',
                amount: price,
                description:
                    `BVros Music Network — Suscripción mensual`,
                onSuccess,
                onError,
                tier: tier || null
            });

        }


        /* Stripe: se activa con entidad US (futuro) */

        throw new Error(
            'Stripe no está activo todavía.'
        );

    },

    /* Compra única — la usará 2B.3 (catálogo BVLUXPRO) */

    async buyOnce(containerId, billingType, onSuccess, onError, opts = {}){

        const amount =
            opts.amount
                ? Number(opts.amount)
                : (
                    billingType === 'album_unico'
                        ? PRICING.album_unico
                        : billingType === 'single'
                            ? PRICING.single
                            : PRICING.album_exclusivo
                  );

        return mountPayPalButtons({
            containerId,
            billingType,
            amount,
            description:
                opts.description || `BVros — ${billingType} (pago único)`,
            onSuccess,
            onError
        });

    },

    /* ¿El usuario actual tiene plan activo?
       CORRECCIÓN: si la suscripción expiró, degrada
       profiles.plan a 'free' (antes el badge decía
       premium para siempre).
       2B.9.4: las CANCELADAS no vencidas también
       cuentan como vigentes — quien cancela conserva
       los beneficios hasta expires_at; el cron de la
       base hace la degradación real al expirar. */

    async hasActivePlan(){

        const auth =
            window.BVrosAuth;

        if(!auth?.user){
            return false;
        }

        const { data } =
            await supabase
                .from('subscriptions')
                .select('expires_at, status')
                .eq('user_id', auth.user.id)
                .in('status', ['active', 'cancelled'])
                .order('expires_at', { ascending: false })
                .limit(1)
                .maybeSingle();

        const vigente =
            !!data &&
            new Date(data.expires_at) > new Date();

        if(!vigente && auth.profile?.plan === 'premium'){

            const { error } =
                await supabase
                    .from('profiles')
                    .update({ plan: 'free' })
                    .eq('id', auth.user.id);

            if(!error){
                await auth.refreshProfile();
            }

        }

        return vigente;

    },

    async recordPurchase(trackId, amount, reference, productType = 'single'){

        const auth =
            window.BVrosAuth;

        if(!auth?.user){
            throw new Error('Inicia sesión.');
        }

        const { error } =
            await supabase
                .from('purchases')
                .insert({
                    user_id:
                        auth.user.id,

                    track_id:
                        trackId,

                    product_type:
                        productType,

                    amount,

                    reference,

                    status:
                        'active'
                });

        if(error) throw error;

    },

    async hasPurchased(trackId){

        const auth =
            window.BVrosAuth;

        if(!auth?.user){
            return false;
        }

        const { data } =
            await supabase
                .from('purchases')
                .select('id')
                .eq('user_id', auth.user.id)
                .eq('track_id', trackId)
                .eq('status', 'active')
                .limit(1)
                .maybeSingle();

        return !!data;

    }

};

console.info(
    '[BVros Pay] Listo (2B.9.4) — proveedor:',
    PAYMENT_PROVIDER,
    '· webhook:',
    WEBHOOK_ACTIVO ? 'ACTIVO' : 'apagado'
);
