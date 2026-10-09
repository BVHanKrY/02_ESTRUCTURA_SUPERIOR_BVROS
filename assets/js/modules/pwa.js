export function registerBVrosServiceWorker(){ return navigator.serviceWorker?.register('/sw.js',{scope:'/'}); }
