/* =========================================================
   BVROS ANALYTICS
   Plays + Likes — ÚNICA FUENTE DE VERDAD
   ========================================================= */

/*
   CONFIGURACIÓN:
   Lee la MISMA configuración que usa el reproductor
   (window.BVROS_CONFIG_OVERRIDE, definida en cada página
   ANTES de importar este módulo). Así este archivo nunca
   apunta a un dominio distinto del que usa el audio.

   Además valida que el dominio contenga "supabase.co"
   (escrito completo: s-u-p-a-b-a-s-e). Si estuviera mal
   escrito, usa el respaldo verificado de abajo.
   El error anterior era "supbase.co" (sin una "a"),
   lo que producía ERR_NAME_NOT_RESOLVED.
*/

const FALLBACK_URL =
    'https://udbwjixdwoahonzezbqj.supabase.co';

const FALLBACK_KEY =
    'sb_publishable_CERYzMSJCTQkzIVjkn7c8g_C1QAo6Hc';

const override =
    window.BVROS_CONFIG_OVERRIDE || {};

const SUPABASE_URL =
    (
        typeof override.supabaseUrl === 'string' &&
        override.supabaseUrl.includes('supabase.co')
    )
        ? override.supabaseUrl
        : FALLBACK_URL;

const SUPABASE_KEY =
    (
        typeof override.supabaseAnonKey === 'string' &&
        override.supabaseAnonKey.length > 10
    )
        ? override.supabaseAnonKey
        : FALLBACK_KEY;

const SESSION_KEY =
    'bvros_session_id';

const LIKE_KEY =
    'bvros_likes_v2';


/*
   AVISO ÚNICO DE RED:
   si Supabase no responde, se avisa UNA sola vez y
   la app sigue operando con los datos locales.
*/

let networkWarned = false;


function warnNetworkOnce(context, error){

    if(networkWarned){
        return;
    }

    networkWarned = true;

    console.warn(
        `[BVros Analytics] Supabase no accesible (${context}). Plays y likes seguirán en modo local hasta recuperar conexión.`,
        error && error.message ? error.message : error
    );

}


function getSessionId() {

    let id =
        localStorage.getItem(
            SESSION_KEY
        );

    if (!id) {

        id =
            crypto.randomUUID();

        localStorage.setItem(
            SESSION_KEY,
            id
        );
    }

    return id;
}


function getLikes() {

    try {

        return JSON.parse(
            localStorage.getItem(
                LIKE_KEY
            ) || '{}'
        );

    } catch {

        return {};
    }
}


function saveLikes(likes) {

    localStorage.setItem(
        LIKE_KEY,
        JSON.stringify(likes)
    );
}


async function supabaseRequest(
    table,
    method,
    body = null,
    query = ''
) {

    const response =
        await fetch(
            `${SUPABASE_URL}/rest/v1/${table}${query}`,
            {
                method,

                headers: {
                    'apikey':
                        SUPABASE_KEY,

                    'Authorization':
                        `Bearer ${SUPABASE_KEY}`,

                    'Content-Type':
                        'application/json',

                    'Prefer':
                        'return=minimal'
                },

                body:
                    body
                        ? JSON.stringify(body)
                        : undefined
            }
        );

    if (!response.ok) {

        const text =
            await response.text();

        throw new Error(
            `Supabase ${response.status}: ${text}`
        );
    }

    return response;
}


/* =========================================================
   PLAYS
========================================================= */

export async function registerPlay(
    trackId,
    playedSeconds = 0
) {

    if (!trackId) return;

    try {

        await supabaseRequest(
            'play_events',
            'POST',
            {
                track_id:
                    trackId,

                session_id:
                    getSessionId(),

                played_seconds:
                    Math.round(
                        playedSeconds
                    )
            }
        );

    } catch (error) {

        warnNetworkOnce(
            'registerPlay',
            error
        );
    }
}


async function getCount(
    table,
    trackId
) {

    try {

        const response =
            await fetch(
                `${SUPABASE_URL}/rest/v1/${table}?select=id&track_id=eq.${encodeURIComponent(trackId)}`,
                {
                    headers: {
                        apikey:
                            SUPABASE_KEY,

                        Authorization:
                            `Bearer ${SUPABASE_KEY}`,

                        Prefer:
                            'count=exact'
                    }
                }
            );

        const count =
            response.headers.get(
                'content-range'
            );

        if (!count) return 0;

        const match =
            count.match(/\/(\d+)$/);

        return match
            ? Number(match[1])
            : 0;

    } catch (error) {

        warnNetworkOnce(
            table,
            error
        );

        return 0;
    }
}


export async function getPlayCount(
    trackId
) {

    return getCount(
        'play_events',
        trackId
    );
}


/* =========================================================
   LIKES
========================================================= */

export async function toggleLike(
    trackId
) {

    if (!trackId) return false;

    const likes =
        getLikes();

    const liked =
        !!likes[trackId];

    try {

        if (liked) {

            await supabaseRequest(
                'track_likes',
                'DELETE',
                null,
                `?track_id=eq.${encodeURIComponent(trackId)}&session_id=eq.${encodeURIComponent(getSessionId())}`
            );

            delete likes[trackId];

        } else {

            await supabaseRequest(
                'track_likes',
                'POST',
                {
                    track_id:
                        trackId,

                    session_id:
                        getSessionId()
                }
            );

            likes[trackId] = true;
        }

        saveLikes(likes);

        return !liked;

    } catch (error) {

        warnNetworkOnce(
            'toggleLike',
            error
        );

        return liked;
    }
}


export function isLiked(trackId) {

    const likes =
        getLikes();

    return !!likes[trackId];
}


export async function getLikeCount(
    trackId
) {

    return getCount(
        'track_likes',
        trackId
    );
}


window.BVrosAnalytics = {
    registerPlay,
    getPlayCount,
    toggleLike,
    isLiked,
    getLikeCount
};