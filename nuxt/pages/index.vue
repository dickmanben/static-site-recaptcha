<template>
  <div class="container">
    <div class="recaptcha">
      <p class="token">
        {{ token }}
      </p>
      <button @click="getToken">
        Refresh Token
      </button>
      <button @click="submit">
        Submit
      </button>
      <p>Status: {{ status }}</p>
      <p>Score: {{ score }}</p>
      <p>Errors: {{ errors }}</p>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
export default {
  data () {
    return {
      token: '',
      status: null,
      errors: '',
      score: ''
    }
  },
  mounted () {
    this.getToken()
  },
  methods: {
    async getToken () {
      this.token = await this.$recaptcha.execute('homepage')
    },
    async submit () {
      const result = await axios.post(process.env.LAMBDA_URL, { token: this.token })
      if (result.data) {
        this.status = result.data.success ? 'Success' : 'Failed'
        this.errors = result.data['error-codes'] && result.data['error-codes'].join(',')
        this.score = result.data.score || ''
      }
    }
  }
}
</script>

<style>
.container {
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  flex-direction: column;
}

.recaptcha {
  display: flex;
  flex-direction: column;
  max-width: 1200px;
  width: 90vw;
  justify-content: center;
  align-items: center;
}

.token {
  width: 100%;
  word-break:break-all;
}

.recaptcha button {
  margin: 20px;
}
</style>
