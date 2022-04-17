<script setup lang="ts">
import axios from 'axios'
import type pageview from 'server/api/pageview'
import { useContext } from 'vite-ssr'
import { useAsyncData } from '~/composables/restful'

type PageView = ReturnType<typeof pageview>

const { url } = useContext()

const { data } = await useAsyncData<PageView>(
  'pageview',
  async() => {
    const { data } = await axios.get<PageView>(`${url.origin}/api/pageview`)
    return data
  },
)

const time = useTimeAgo(computed(() => data.value.startAt))
</script>

<template>
  <div text-gray:80>
    <span font-500 text-gray>{{ data.pageview }}</span>
    page views since
    <span text-gray>{{ time }}</span>
  </div>
</template>
