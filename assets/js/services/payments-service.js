/* =========================================================
   BVROS PAYMENTS SERVICE — FASE 2B.2 (CORREGIDO · BVLUX)
   PayPal Smart Buttons (incluye pago con tarjeta dentro
   del flujo de PayPal: enable-funding=card).
   Precios BVLUXpasarela 1.1.1:
     Nivel 2 $3.99 · Nivel 3 $4.75 · promo Nivel 2 $1.70.
   Compras únicas: $5.00 / $2.99 / $4.99 (2B.3).
   Al confirmar pago: subscriptions active 30 días
   + profiles.plan = 'premium'.

   CORRECCIONES aplicadas:
   1. El intento de pago se registra en la base ANTES de
      abrir PayPal (createOrder). Antes se registraba solo
      DESPUÉS de capturar: si el INSERT fallaba, el usuario
      pagaba y no quedaba registrado nada.
   2. .single() → .maybeSingle() con mensaje claro si la
      política RLS bloquea el registro.
   3. activatePayment avisa con mensaje claro si el pago se
      capturó pero la activación falla (con referencia para
      soporte).
   4. PRICING alineado: ya no existe el cobro $3.00; el
      respaldo por perfil es $3.99 (Nivel 2) y se exponen
      nivel3 ($4.75) y promoNivel2 ($1.70).
   5. hasActivePlan degrada el perfil a 'free' si la
      suscripción expiró (antes el badge decía premium
      para siempre).

   ⚠️ SEGURIDAD (fase de prueba): la activación ocurre en
   el cliente. Un usuario técnico podría marcar
   profiles.plan='premium' a mano. Antes de cobrar en
   real, migra la confirmación a un webhook de PayPal →
   Edge Function que active el plan server-side.
   ========================================================= */

import { supabase } from './auth-service.js';

/*
   ⚠️ VERIFICA TU CLIENT ID:
   developer.paypal.com → Apps & Credentials
   → Create App → copia el Client ID.
   Empieza en SANDBOX (dinero de prueba);
   para cobros reales crea la app en Live
   y reemplaza el Client ID por el de Live.
*/

const PAYPAL_CLIENT_ID =
    'BAAXFla6aVvDXePLDzOCwkUagGflIi-b5xuiNIHO8k20heffKL0w2nqzyGwOxwZCpgXYRcxLpU-5fP8PKc';

/* Único punto de intercambio de pasarela:
   cuando actives Stripe, cambia a 'stripe'. */

const PAYMENT_PROVIDER =
    'paypal';   // 'paypal' | 'stripe'

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


/* Montar botones PayPal en un contenedor.
   CORRECCIÓN: el intento se registra en createOrder
   (antes de abrir PayPal) y se reutiliza en
   onApprove; si no existiera, se crea ahí. */

async function mountPayPalButtons({
    containerId, billingType, amount, description, onSuccess, onError
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
                        pendingSub?.id || ''
                }]
            });

        },

        onApprove: async (data, actions) => {

            const details =
                await actions.order.capture();

            if(!pendingSub?.id){
                pendingSub =
                    await createPendingPayment({
                        billingType,
                        amount
                    });
            }

            if(!pendingSub?.id){
                throw new Error(
                    `Pago capturado (ref: ${details.id}) sin registro previo. Contacta a soporte con esa referencia.`
                );
            }

            await activatePayment(
                pendingSub.id,
                details.id
            );

            onSuccess?.(details);

        },

        onError: (error) => {

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
       Nivel 2 $3.99 · Nivel 3 $4.75 · promo $1.70. */

    async startSubscription(containerId, onSuccess, onError, overridePrice){

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
                onError
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
       premium para siempre). */

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
                .eq('status', 'active')
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
    '[BVros Pay] Listo — proveedor:',
    PAYMENT_PROVIDER
);