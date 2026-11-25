import { createApp } from 'vue';
import App from './App.vue';
import { setupAppUpdate } from './bootstrap/app-update';
import router from './router';

const app = createApp(App);
app.use(router);
setupAppUpdate(app);
app.mount('#root');
