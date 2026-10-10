/* =========================================================
   BVROS PAYMENTS SERVICE — FASE 2B.2
   PayPal Smart Buttons (incluye pago con tarjeta
   dentro del flujo de PayPal).
   Precios: Perfil 1 $3.99 · Perfil 2 $3.00.
   Compras únicas: $5.00 / $2.99 / $4.99 (2B.3).
   Al confirmar pago: profiles.plan = 'premium'
   + fila active en subscriptions (30 días).
   Stripe: preparado como interruptor para cuando
   exista entidad US (no opera como merchant EC).
   ========================================================= */

import { supabase } from './auth-service.js';

/*
   ⚠️ PEGA AQUÍ TU CLIENT ID:
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
        perfil2: 3.00
    },

    album_unico: 5.00,
    single: 2.99,
    album_exclusivo: 4.99

};

let paypalReady = null;


/* Carga del SDK de PayPal (una sola vez) */

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
                `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD`;

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


/* Registro pendiente en la base */

async function createPendingPayment({
    billingType,
    amount
}){

    const auth =
        window.BVrosAuth;


    /*
       USUARIO INVITADO (BVLUX):
       la compra sin sesión se registra con
       user_id NULL. La RLS lo permite porque
       la política de insert usa with check.
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
            .single();

    if(error) throw error;

    return data;

}


/* Confirmación: activa premium 30 días */

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

    if(subError) throw subError;


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

        if(profError) throw profError;

        await window.BVrosAuth.refreshProfile();

    }

}


/* Montar botones PayPal en un contenedor */

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


    window.paypal.Buttons({

        style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal',
            height: 40
        },

        createOrder: (data, actions) => {

            return actions.order.create({
                purchase_units: [{
                    amount: {
                        value:
                            amount.toFixed(2)
                    },
                    description:
                        description || `BVros — ${billingType}`
                }]
            });

        },

        onApprove: async (data, actions) => {

            const details =
                await actions.order.capture();

            const sub =
                await createPendingPayment({
                    billingType,
                    amount
                });

            await activatePayment(
                sub.id,
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

    /* La pestaña SUSCRIBIRSE llama a esto.
       El precio lo decide el perfil del usuario. */

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
                onSuccess,
                onError
            });

        }


        /* Stripe: se activa con entidad US (futuro) */

        throw new Error(
            'Stripe no está activo todavía.'
        );

    },

    /* Compra única — la usará 2B.3 (catálogo cassett) */

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
                opts.description || billingType,
            onSuccess,
            onError
        });

    },

    /* ¿El usuario actual tiene plan activo? */

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

        if(!data){
            return false;
        }

        return new Date(data.expires_at) > new Date();

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