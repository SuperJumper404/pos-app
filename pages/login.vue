<template>
  <div style="height: 100%">
    <v-row justify="center" align="center" style="height: 100%">
      <v-col md="5" sm="6" cols="12">
        <Forms :formprops="setForm" />
      </v-col>
    </v-row>
  </div>
</template>
<script>
import Forms from '@/components/forms.vue'
export default {
  components: { Forms },
  data() {
    return {
      setForm: {
        title: 'Login',
        access: 1,
      },
    }
  },
}
</script>
