import { createApp } from 'vue';

import '@/assets/styles/index.scss';
import App from './App.vue';
import { setupAppUpdate } from './bootstrap/app-update';
import router from './router';
import pinia from './stores';

const app = createApp(App);
app.use(pinia);
app.use(router);
setupAppUpdate(app);
app.mount('#root');
