<script setup lang="ts">
import { useContext } from 'vite-ssr'
import { useFetch } from '~/composables/restful'

const { url } = useContext()

const { data, reload, pending, error } = useFetch(`${url.origin}/api/pageview`)

</script>

<template>
  <div text-gray:80>
    {{ pending ? 'pending' : '.' }}
    data text:
    <span font-500 text-gray>{{ data }}</span>
    error text:
    <span font-500 text-gray>{{ error }}</span>

    <button @click="reload">
      reload
    </button>
  </div>
</template>
