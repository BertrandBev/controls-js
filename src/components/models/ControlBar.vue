<template lang="pug">
div(v-if='plotSheet'
    style='display: flex; align-items: center; overflow: hide')
  v-select(v-model='plotSheet.plot'
            style='max-width: 120px'
            :items="plotSheet.plots"
            label='plot'
            filled dark dense solo
            hide-details)
</template>

<script>
export default {
  props: {
    plotSheet: Object
  }
};
</script>