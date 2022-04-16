import { createHead } from '@vueuse/head'
import { type UserModule } from '~/types'

const hand = createHead()

// https://github.com/antfu/vite-plugin-pwa#automatic-reload-when-new-content-available
export const install: UserModule = ({ app }) => {
  app.use(hand)
}
