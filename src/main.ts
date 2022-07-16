import generatedRoutes from 'virtual:generated-pages'
import { setupLayouts } from 'virtual:generated-layouts'
import { createWebHistory } from 'vue-router'
import ViteSSR from 'vite-ssr'
import devalue from '@nuxt/devalue'
import App from './App.vue'

import '@unocss/reset/tailwind.css'
import './styles/main.css'
import 'uno.css'

const routes = setupLayouts(generatedRoutes)

const routerOptions: any = { routes }

if (!import.meta.env.SSR) {
  routerOptions.history = createWebHistory()

  // 打开新页面时将页面滚动到顶部
  routerOptions.scrollBehavior = (to: any, from: any, savedPosition: any) => {
    if (savedPosition)
      return savedPosition
    else return { left: 0, top: 0 }
  }
}

export default ViteSSR(
  App,
  {
    routes,
    routerOptions,
    transformState(state) {
      return import.meta.env.SSR ? devalue(state) : state
    },
    base: () => import.meta.env.BASE_URL,
  },
  (ctx) => {
    const results = Object.values(import.meta.globEager('./modules/*.ts')).map(i => i.install?.(ctx))
    return results.reduce((total, item) => ({ ...total, ...item }), {})
  },
)
