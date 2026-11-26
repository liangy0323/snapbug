import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

export default pinia;
export { useAuthStore } from './modules/auth';
export { useWorkspaceStore } from './modules/workspace';
