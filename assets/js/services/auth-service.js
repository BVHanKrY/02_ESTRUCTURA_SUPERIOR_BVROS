/* =========================================================
   BVROS AUTH SERVICE — FASE 2B.1 (CORREGIDO · BVLUX)
   Correcciones aplicadas sobre la versión anterior:

   1. usernameAvailable: si el RPC falla devuelve true
      (no bloquea el registro — la UNIQUE de la base
      decide al guardar, tal como decía el comentario
      original pero la función hacía lo contrario).
   2. Autocreación de perfil: usa el username guardado
      en user_metadata (el que eligió el usuario en el
      formulario) y registra errores de RLS.
   3. saveProfileChoice:
      · Pre-check EXACTO con .maybeSingle() — el falso
        "Ese nombre de usuario ya existe" venía de
        confiar en verificaciones que fallaban en silencio.
      · onConflict explícito en el upsert.
      · ⚠️ YA NO RESETEA plan a 'free': la versión anterior
        escribía plan:'free' en CADA guardado, así que un
        usuario premium perdía su etiqueta al editar su
        perfil. Ahora se conserva 'premium'.
      · Traducción clara de errores RLS (42501).
   4. signInWithEmail: mensajes claros en español
      ("Invalid login credentials", correo sin confirmar).
   5. PRICING alineado a BVLUXpasarela 1.1.1:
      Nivel 2 $3.99 · Nivel 3 $4.75 · promo $1.70.
      (El precio 3.00 antiguo queda eliminado.)

   Requisito en Supabase (SQL Editor) — políticas RLS:
      alter table public.profiles enable row level security;
      create policy if not exists "perfil select propio"
        on public.profiles for select using (auth.uid() = id);
      create policy if not exists "perfil insert propio"
        on public.profiles for insert with check (auth.uid() = id);
      create policy if not exists "perfil update propio"
        on public.profiles for update using (auth.uid() = id)
        with check (auth.uid() = id);
   ========================================================= */

import { createClient }
    from 'https://esm.sh/@supabase/supabase-js@2';

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

const supabase =
    createClient(SUPABASE_URL, SUPABASE_KEY);


/* Roles por perfil (según clasificación BVros) */

export const PROFILE_ROLES = {

    perfil1: [
        'Aficionado',
        'Melómano',
        'Influencer',
        'Radio escucha',
        'Entretenimiento',
        'Hobby'
    ],

    perfil2: [
        'Músico profesional',
        'Académico',
        'Profesor',
        'Compositor',
        'Productor',
        'Beat maker',
        'Sonidista',
        'Gestor cultural'
    ]

};

/* Precios BVLUXpasarela 1.1.1.
   El gate SIEMPRE pasa overridePrice; estos valores
   son el respaldo coherente con la nueva estructura
   (ya no existe el cobro de $3.00). */

export const PRICING = {

    mensual: {
        perfil1: 3.99,
        perfil2: 3.99
    },

    nivel3: 4.75,

    promoNivel2: 1.70,

    albumUnico: 5.00,
    singleExclusivo: 2.99,
    albumExclusivo: 4.99

};


class BVrosAuthClass {

    constructor(){
        this.user = null;
        this.profile = null;
        this.ready = false;
    }

    /* ---------- Sesión ---------- */

    async init(){

        const { data } =
            await supabase.auth.getSession();

        this.user =
            data?.session?.user || null;

        if(this.user){
            await this.loadProfile();
        }

        supabase.auth.onAuthStateChange(
            async (event, session) => {

                this.user =
                    session?.user || null;

                if(this.user){
                    await this.loadProfile();
                }else{
                    this.profile = null;
                }

                this.emit();

            }
        );

        this.ready = true;

        this.emit();

    }

    isAuthenticated(){
        return !!this.user;
    }

    /* NOMBRE POR DEFECTO INTELIGENTE (adiós user_xxxxxxxx):
       · Cuenta de Google → primer nombre de la cuenta
         (full_name / name de user_metadata).
       · Registro por correo → primera parte del correo
         (lo que va antes del @).
       Limpieza: sin acentos, minúsculas, sin espacios
       ni símbolos, máximo 20 caracteres. */

    deriveDefaultUsername(){

        const m =
            this.user?.user_metadata || {};

        const fuenteNombre =
            m.full_name ||
            m.name ||
            m.user_name ||
            '';

        const fuenteCorreo =
            (m.email || this.user?.email || '')
                .split('@')[0];

        const limpiar = (texto) =>
            String(texto || '')
                .normalize('NFD')
                .replace(/[^a-zA-Z0-9_]/g, '')
                .toLowerCase()
                .slice(0, 20);

        const delNombre =
            limpiar(fuenteNombre.split(/\s+/)[0]);

        const delCorreo =
            limpiar(fuenteCorreo);

        return delNombre || delCorreo ||
            'user_' +
            String(this.user?.id || '')
                .replace(/[^a-z0-9]/gi, '')
                .slice(0, 8);

    }

    /* ¿El username es el autogenerado viejo
       (patrón user_xxxxxxxx)? */

    esUsernameAutomatico(username){

        return /^user_[a-z0-9]{4,12}$/i
            .test(String(username || ''));

    }

    async loadProfile(){

        if(!this.user) return;

        const { data, error } =
            await supabase
                .from('profiles')
                .select('*')
                .eq('id', this.user.id)
                .maybeSingle();

        if(error){
            console.error(
                '[BVros Auth] Error leyendo perfil (revisa políticas RLS de SELECT):',
                error
            );
        }

        /* AUTOCREACIÓN:
           si el usuario existe en Authentication pero
           su ficha no (ej: borrada a mano, o creada
           antes del trigger), se crea aquí mismo.
           Así nunca queda un usuario "huérfano".
           CORRECCIÓN: se conserva el username que el
           usuario escribió en el formulario (queda en
           user_metadata) en lugar de forzar user_xxxx. */

        if(!data){

            const autoName =
                this.user.user_metadata?.username ||
                this.deriveDefaultUsername();

            const fichaBase = {

                id:
                    this.user.id,

                username:
                    autoName,

                profile_type:
                    'perfil1',

                profile_chosen:
                    false,

                plan:
                    'free'
            };

            let { error: autoError } =
                await supabase
                    .from('profiles')
                    .upsert(fichaBase);

            /* Si el nombre derivado ya está cogido
               (23505), se reintenta con un sufijo
               corto del id del usuario. */

            if(
                autoError && (
                    autoError.code === '23505' ||
                    (autoError.message || '')
                        .includes('duplicate')
                )
            ){

                const alt =
                    autoName + '_' +
                    String(this.user.id)
                        .replace(/[^a-z0-9]/gi, '')
                        .slice(0, 4);

                const retry =
                    await supabase
                        .from('profiles')
                        .upsert({
                            ...fichaBase,

                            username: alt
                        });

                autoError = retry.error;

            }

            if(autoError){
                console.error(
                    '[BVros Auth] Autocreación de perfil falló (revisa la política RLS de INSERT en profiles):',
                    autoError
                );
            }

            const recheck =
                await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', this.user.id)
                    .maybeSingle();

            this.profile =
                recheck.data || null;

            return;

        }

        this.profile =
            data;

        /* MIGRACIÓN DEL NOMBRE VIEJO: si la ficha se
           creó con el patrón user_xxxxxxxx (por una
           versión anterior o por un trigger) y el
           usuario AÚN no eligió su perfil, se renombra
           al nombre amable derivado de Google/correo.
           Si el nombre ya está en uso, se añade un
           sufijo corto del id. */

        if(
            data &&
            !data.profile_chosen &&
            this.esUsernameAutomatico(data.username)
        ){

            const base =
                this.deriveDefaultUsername();

            if(base && base !== data.username){

                let finalName = base;

                const { error: renError } =
                    await supabase
                        .from('profiles')
                        .update({ username: finalName })
                        .eq('id', this.user.id);

                if(
                    renError && (
                        renError.code === '23505' ||
                        (renError.message || '')
                            .includes('duplicate')
                    )
                ){

                    finalName =
                        base + '_' +
                        String(this.user.id)
                            .replace(/[^a-z0-9]/gi, '')
                            .slice(0, 4);

                    await supabase
                        .from('profiles')
                        .update({ username: finalName })
                        .eq('id', this.user.id);

                }

                data.username = finalName;

            }

        }

    }

    async refreshProfile(){
        await this.loadProfile();
        this.emit();
    }


    /* ---------- Registro / acceso ---------- */

    async usernameAvailable(username){

        const { data, error } =
            await supabase.rpc(
                'username_taken',
                { p_username: username }
            );

        if(error){
            console.warn(
                '[BVros Auth] No se pudo verificar el nombre — la restricción UNIQUE decidirá al guardar.',
                error
            );

        /* CORRECCIÓN: antes devolvía false (= "ocupado")
           cuando el RPC fallaba y BLOQUEABA el registro.
           Devuelve true: no bloqueamos; la UNIQUE de la
           base es el árbitro final. */

            return true;
        }

        return !data;

    }

    async signUpWithEmail({
        email,
        password,
        username,
        profileType,
        profileRole
    }){

        const { data, error } =
            await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { username }
                }
            });

        if(error){

            const msg =
                (error.message || '').toLowerCase();

            if(
                msg.includes('already registered') ||
                msg.includes('already exists')
            ){
                throw new Error(
                    'Ese correo ya tiene cuenta. Usa "Iniciar sesión".'
                );
            }

            if(msg.includes('password')){
                throw new Error(
                    'La contraseña debe tener al menos 6 caracteres.'
                );
            }

            throw error;

        }

        /* Si la confirmación de email está activa,
           no hay sesión inmediata. El username elegido
           queda en user_metadata y loadProfile lo
           recuperará en el primer ingreso. */

        if(!data.session){
            return {
                needsConfirmation: true
            };
        }

        this.user =
            data.user;

        /* Completar el perfil con la elección
           del formulario */

        await this.saveProfileChoice(
            username,
            profileType,
            profileRole
        );

        return {
            needsConfirmation: false
        };

    }

    async signInWithEmail(email, password){

        const { data, error } =
            await supabase.auth.signInWithPassword({
                email,
                password
            });

        if(error){

            const msg =
                (error.message || '').toLowerCase();

            if(msg.includes('invalid login credentials')){
                throw new Error(
                    'Credenciales incorrectas. Verifica tu correo y contraseña, o crea tu cuenta gratis.'
                );
            }

            if(msg.includes('not confirmed')){
                throw new Error(
                    'Debes confirmar tu correo antes de ingresar. Revisa tu bandeja de entrada.'
                );
            }

            if(msg.includes('too many') || msg.includes('rate limit')){
                throw new Error(
                    'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
                );
            }

            throw error;

        }

        this.user =
            data.user;

        await this.loadProfile();

        return this.user;

    }

    async signInWithGoogle(){

        /* SIN redirectTo: Supabase redirige al
           Site URL configurado en el dashboard
           (bvros-music-network.onrender.com).
           El redirectTo manual apuntaba a
           127.0.0.1 y era rechazado en
           producción — por eso Google no
           abría ninguna ventana.

           ⚠️ Verifica en Supabase Dashboard →
           Authentication → URL Configuration:
           Site URL = https://bvros-music-network.onrender.com
           Redirect URLs debe incluir ese dominio. */

        const { error } =
            await supabase.auth.signInWithOAuth({
                provider: 'google'
            });

        if(error) throw error;

    }

    async saveProfileChoice(
        username,
        profileType,
        profileRole
    ){

        if(!this.user){
            throw new Error(
                'No hay sesión activa.'
            );
        }

        /* CORRECCIÓN CLAVE (falso "nombre ya existe"):
           verificación EXACTA con maybeSingle —
           no lanza error cuando no hay filas.
           Solo bloquea si el nombre pertenece a
           OTRO usuario (id distinto). */

        const { data: taken } =
            await supabase
                .from('profiles')
                .select('id')
                .ilike('username', username)
                .maybeSingle();

        if(taken && taken.id !== this.user.id){
            throw new Error(
                'Ese nombre de usuario ya existe. Elige otro.'
            );
        }

        /* CORRECCIÓN CLAVE (pérdida de premium):
           la versión anterior escribía plan:'free'
           SIEMPRE. Un usuario premium que re-guardaba
           su perfil volvía a "MIEMBRO GRATUITO".
           Ahora se conserva el plan actual. */

        const planActual =
            this.profile?.plan === 'premium'
                ? 'premium'
                : 'free';

        const { error } =
            await supabase
                .from('profiles')
                .upsert({
                    id:
                        this.user.id,

                    username,

                    profile_type:
                        profileType,

                    profile_role:
                        profileRole,

                    profile_chosen:
                        true,

                    plan:
                        planActual
                }, {
                    onConflict: 'id'
                });

        if(error){

            console.error(
                '[BVros Auth] Error guardando perfil:',
                error
            );

            if(
                error.code === '23505' ||
                (error.message || '').includes('username_key') ||
                (error.message || '').includes('duplicate key')
            ){
                throw new Error(
                    'Ese nombre de usuario ya existe. Elige otro.'
                );
            }

            if(
                error.code === '42501' ||
                (error.message || '').includes('row-level security')
            ){
                throw new Error(
                    'Permisos de base insuficientes (RLS). Ejecuta las políticas SQL de profiles indicadas en la documentación.'
                );
            }

            throw new Error(
                error.message
            );

        }

        await this.loadProfile();

        /* AVISO INMEDIATO A LA INTERFAZ: sin esto la
           pastilla y el nombre de la cabecera seguían
           viejos hasta que el usuario recargaba. */

        this.emit();

    }

    async logout(){

        /* Cerrar sesión en el servidor. Si falla
           (sesión fantasma, red), no interrumpe:
           la limpieza local es obligatoria. */

        try{

            await supabase.auth.signOut(
                { scope: 'local' }
            );

        }catch(error){

            console.warn(
                '[BVros Auth] signOut del servidor falló — se limpia la sesión local.',
                error
            );

        }

        /* LIMPIEZA LOCAL OBLIGATORIA:
           se ejecuta SIEMPRE */

        this.user =
            null;

        this.profile =
            null;

        /* Red de seguridad: purgar cualquier
           residuo de sesión de Supabase en
           este navegador */

        try{

            Object.keys(localStorage)
                .filter(
                    k => k.startsWith('sb-')
                )
                .forEach(k =>
                    localStorage.removeItem(k)
                );

        }catch(error){

            /* localStorage bloqueado: ignorar */

        }

        this.emit();

    }


    /* ---------- Eventos ---------- */

    emit(){

        window.dispatchEvent(
            new CustomEvent(
                'bvros:authstate',
                {
                    detail: {
                        user:
                            this.user,

                        profile:
                            this.profile,

                        authenticated:
                            this.isAuthenticated()
                    }
                }
            )
        );

    }

}

const BVrosAuth =
    new BVrosAuthClass();

await BVrosAuth.init();

export { BVrosAuth, supabase };

window.BVrosAuth =
    BVrosAuth;
