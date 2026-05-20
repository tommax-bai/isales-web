import "@/styles/design-tokens.css";
import "element-plus/dist/index.css";
import "@/assets/reset.css";

import { createPinia } from "pinia";
import piniaPersistedState from "pinia-plugin-persistedstate";
import { createApp } from "vue";

import App from "./App.vue";
import router from "./router";

const app = createApp(App);
const pinia = createPinia();
pinia.use(piniaPersistedState);

app.use(pinia);
app.use(router);
app.mount("#app");
