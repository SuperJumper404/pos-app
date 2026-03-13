<template>
  <div class="pa-4 mt-6">
    <div>
      <!-- error -->
      <v-alert v-model="alertError" outlined text type="error">
        <v-row align="center" no-gutters>
          <v-col class="grow">
            {{ message }}
          </v-col>
          <v-spacer></v-spacer>
          <v-col class="shrink">
            <v-btn icon small @click="$store.set('users/alertError', false)">
              <v-icon>mdi-close-circle-outline</v-icon>
            </v-btn>
          </v-col>
        </v-row>
      </v-alert>
      <!-- success -->
      <v-alert v-model="alertSuccess" outlined text type="success">
        <v-row align="center" no-gutters>
          <v-col class="grow">
            {{ message }}
          </v-col>
          <v-spacer></v-spacer>
          <v-col class="shrink">
            <v-btn icon small @click="$store.set('users/alertSuccess', false)">
              <v-icon>mdi-close-circle-outline</v-icon>
            </v-btn>
          </v-col>
        </v-row>
      </v-alert>
    </div>
    <div class="f-secondary">
      <div class="d-flex flex-column align-center justify-center">
        <v-img src="/logo.png" contain height="100" width="190"></v-img>
        <h1 class="">Smart<span style="color: #7e22ce">Eat</span></h1>
      </div>

      <h3 class="mt-10">
        {{
          formprops.title === 'Register' ? 'Inscrivez-vous' : 'Connectez-vous'
        }}
      </h3>
    </div>
    <v-form
      v-model="isValue"
      :class="formprops.access !== 1 ? 'mt-5 mb-5' : 'mt-5 mb-5'"
      @submit.prevent="sumitforms"
    >
      <v-text-field
        v-if="formprops.access !== 1"
        v-model="formsdata.username"
        type="text"
        label="Username"
        :counter="15"
        :rules="usernameRules"
        placeholder="Input username"
        required
        :autofocus="formprops.access !== 1 ? true : false"
      >
      </v-text-field>
      <v-text-field
        v-if="formprops.access !== 1"
        v-model="formsdata.phone"
        type="text"
        label="Phone"
        :maxlength="15"
        :counter="15"
        :rules="phoneRules"
        palceholder="Input your phone number"
        required
      >
      </v-text-field>
      <v-text-field
        v-model="formsdata.email"
        label="E-mail de connexion"
        type="email"
        :rules="emailRules"
        placeholder="Saisir votre e-mail"
        required
        :autofocus="formprops.access !== 2 ? true : false"
      ></v-text-field>
      <v-text-field
        v-model="formsdata.password"
        label="Mot de passe"
        :type="statePass ? 'text' : 'password'"
        :append-icon="statePass ? 'mdi-eye-off' : 'mdi-eye'"
        :rules="passRules"
        placeholder="Saisir votre mot de passe"
        required
        class="mb-4"
        @click:append="statePass = !statePass"
      >
      </v-text-field>
      <div v-if="formprops.access === 1" class="mb-8 float-end f-secondary">
        <nuxt-link to="/forgotpassword">Mot de passe oublié ?</nuxt-link>
      </div>
      <v-hover v-slot="{ hover }">
        <v-btn
          :disabled="!isValue"
          :loading="loadingBtn"
          type="submit"
          :class="
            hover
              ? 'primaryPurple--text text-none'
              : 'primaryWhite--text text-none'
          "
          color="primaryPurple"
          block
          :text="hover"
          x-large
          rounded
          >{{
            formprops.access !== 1 ? 'Créer un compte' : 'Se connecter'
          }}</v-btn
        >
      </v-hover>
    </v-form>
    <div class="text-center f-secondary">
      <p v-if="formprops.access === 1">
        Vous n'avez pas de compte ?
        <nuxt-link to="/register">Creer un compte</nuxt-link>
      </p>
      <p v-else>
        Vous n'avez pas de compte ?
        <nuxt-link to="/login">Connectez-vous.</nuxt-link>
      </p>
    </div>
  </div>
</template>
<script>
export default {
  name: 'Forms',
  props: {
    formprops: {
      type: Object,
      default: Object,
    },
  },
  data() {
    return {
      isValue: false,
      statePass: false,
      stsMsg: false,
      loadingBtn: false,
      formsdata: {
        username: '',
        phone: '',
        email: '',
        password: '',
      },
      usernameRules: [
        (v) => !!v || "Nom d'utilisateur requis",
        (v) =>
          (v && v.length <= 15) ||
          "Nom d'utilisateur doit être inférieur à 15 caractères",
      ],
      phoneRules: [
        (v) => !!v || 'Numéro de téléphone requis',
        (v) => (v && v.length <= 10) || 'Numéro de téléphone invalide!',
      ],
      emailRules: [
        (v) => !!v || 'E-mail requis',
        (v) => /.+@.+\..+/.test(v) || "Le format de l'e-mail est incorrect",
      ],
      passRules: [
        (v) => !!v || 'Mot de passe requis',
        (v) =>
          /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@,#,_])[0-9a-zA-Z@#_]{8,}$/.test(
            v
          ) ||
          'Utiliser au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial (@,#,_)',
      ],
    }
  },
  computed: {
    message() {
      return this.$store.get('users/message')
    },
    alertSuccess() {
      return this.$store.get('users/alertSuccess')
    },
    alertError() {
      return this.$store.get('users/alertError')
    },
  },
  async mounted() {
    if (this.$route.query.username && this.$route.query.password) {
      this.formsdata.email = this.$route.query.username
      this.formsdata.password = this.$route.query.password
      await this.sumitforms()
    }
  },
  methods: {
    async sumitforms() {
      this.loadingBtn = true
      if (this.formprops.access === 1) {
        const res = await this.$store.dispatch(
          'users/postLogin',
          this.formsdata
        )
        if (res) {
          this.loadingBtn = false
          console.log('STore', this.$store)

          this.$store.set('authenticated', true)
          console.log('SToree', this.$store)
          console.log('Connected')
          this.$router.push('/')
        } else {
          const msg = `Your account isn't activated yet! Check your email!`
          if (this.$store.get('users/message') === msg) {
            this.loadingBtn = false
            this.$store.set('users/message', 'Check email!')
            console.log('Je passe dans cette condition ? ')
            this.$store.set('users/alertError', true)
            this.stsMsg = !this.stsMsg
          } else {
            this.loadingBtn = false
            this.$store.set('users/message', 'Email or pass wrong!')
            console.log('Je passe dans cette condition ? ')
            this.$store.set('users/alertError', true)
            this.stsMsg = !this.stsMsg
          }
        }
      } else {
        const res = await this.$store.dispatch(
          'users/postRegister',
          this.formsdata
        )
        if (res) {
          this.loadingBtn = false
          console.log('Je passe dans cette condition ? ')

          this.$store.set('users/alertSuccess', true)
          this.$store.set('users/message', 'Check email!')
          this.$router.push('/login')
        } else {
          this.loadingBtn = false
          console.log('Je passe dans cette condition ? ')
          this.$store.set('users/alertError', true)
          this.stsMsg = !this.stsMsg
        }
      }
    },
  },
}
</script>
