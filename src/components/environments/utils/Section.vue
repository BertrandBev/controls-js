<template lang="pug">
  div.pa-2(style='display: flex; flex-direction: column')
    div.mb-2(style='display: flex; align-items: center')
      v-divider.mr-2
      span {{ title }}
      v-divider.ml-2
    slot
</template>

<script>
export default {
  props: {
    title: String
  }
};
</script>