/* =========================================================
   BVROS AUTH SERVICE — FASE 2B.1
   Núcleo de cuentas: registro email+clave, acceso
   Google, perfiles 1/2 con roles, sesión persistente.
   Expone window.BVrosAuth y eventos 'bvros:authstate'.
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

/* Precios por perfil (los consume la pasarela 2B.2) */

export const PRICING = {

    perfil1: {
        mensual: 3.99,
        etiqueta: 'Suscripción estándar'
    },

    perfil2: {
        mensual: 3.00,
        etiqueta: 'Suscripción profesional'
    },

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

    async loadProfile(){

        if(!this.user) return;

        const { data } =
            await supabase
                .from('profiles')
                .select('*')
                .eq('id', this.user.id)
                .maybeSingle();


        /* AUTOCREACIÓN:
           si el usuario existe en Authentication pero
           su ficha no (ej: borrada a mano, o creada
           antes del trigger), se crea aquí mismo.
           Así nunca queda un usuario "huérfano". */

        if(!data){

            const autoName =
                'user_' +
                this.user.id.substr(0, 8);

            await supabase
                .from('profiles')
                .upsert({
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
                });


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
                '[BVros Auth] No se pudo verificar el nombre.',
                error
            );

        /* Si la verificación falla, NO bloqueamos:
        la restricción UNIQUE de la base decide
        l guardar. */

            return false;
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

            if(
                (error.message || '').toLowerCase().includes('already registered') ||
                (error.message || '').toLowerCase().includes('already exists')
            ){
                throw new Error(
                    'Ese correo ya tiene cuenta. Usa "Iniciar sesión".'
                );
            }

            throw error;

        }

        /* Si la confirmación de email está activa,
           no hay sesión inmediata */

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

        if(error) throw error;

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
           abría ninguna ventana. */

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


        /*
           Sin check previo: la restricción UNIQUE de
           la base de datos es el árbitro final.
           Si el nombre existe, el upsert falla con
           código 23505 y lo traducimos a mensaje claro.
        */

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
                        'free'
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

            throw new Error(
                error.message
            );

        }

        await this.loadProfile();

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