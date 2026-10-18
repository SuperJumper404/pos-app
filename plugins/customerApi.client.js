import axios from 'axios'
import xhrAdapter from 'axios/lib/adapters/xhr'

const messages = {
  CUSTOMER_SESSION_INVALID: 'Votre session client a expire. Reconnectez-vous.',
  CUSTOMER_IDENTITY_CONFLICT: 'Ce contact appartient deja a un autre compte de ce restaurant.',
  CUSTOMER_CODE_INVALID: 'Code incorrect ou expire. Verifiez le code ou demandez-en un autre.',
  CUSTOMER_CHALLENGE_INVALID: 'Code incorrect ou expire. Demandez-en un autre.',
  CUSTOMER_DESTINATION_INVALID: 'Verifiez votre adresse e-mail ou votre numero WhatsApp.',
  CUSTOMER_RATE_LIMITED: 'Trop de demandes. Patientez avant de reessayer.',
  CUSTOMER_CSRF_FORBIDDEN: 'La session doit etre actualisee. Reconnectez-vous.',
  CUSTOMER_ORIGIN_FORBIDDEN: 'La connexion client est indisponible depuis ce site.',
  DELIVERY_ADDRESS_INVALID: 'Selectionnez une adresse postale precise ou corrigez la saisie.',
  DELIVERY_GEOCODING_UNAVAILABLE: 'La recherche de l\'adresse est indisponible. Reessayez plus tard.',
  DELIVERY_GEOCODING_RATE_LIMITED: 'La recherche de l\'adresse est occupee. Patientez puis reessayez.',
}

export function buildCustomerApi({ baseURL, adapter = xhrAdapter }) {
  // Axios.create merges global defaults, including staff headers/auth. Start with none.
  const transport = new axios.Axios({
    baseURL,
    adapter,
    withCredentials: true,
    timeout: 15000,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    transformRequest: [(data) => data === undefined ? undefined : JSON.stringify(data)],
    transformResponse: [(data) => typeof data === 'string' ? JSON.parse(data) : data],
    validateStatus: (status) => status >= 200 && status < 300,
  })
  return {
    browserBinding() {
      const bytes = new Uint8Array(32)
      crypto.getRandomValues(bytes)
      return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
    },
    async request({ method = 'get', path, body, shopId, csrfToken }) {
      try {
        const response = await transport.request({
          method,
          url: `/baseurl/api/v1${path}`,
          params: shopId == null ? undefined : { shopId },
          data: body,
          headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
        })
        if (!response.data || response.data.success !== true) throw new Error('Invalid response')
        return response.data.data
      } catch (failure) {
        const response = failure.response
        const dto = response && response.data
        const code = dto && typeof dto.error === 'string' ? dto.error : 'CUSTOMER_UNAVAILABLE'
        const error = new Error(messages[code] || (response && response.status === 429
          ? 'Trop de demandes. Patientez avant de reessayer.'
          : 'Service client indisponible. Reessayez ou continuez en invite.'))
        error.code = code
        error.status = response ? response.status : 0
        error.candidates = dto && dto.data && Array.isArray(dto.data.candidates)
          ? dto.data.candidates.map(candidate => ({ providerId: candidate.providerId, providerLabel: candidate.providerLabel }))
          : []
        throw error
      }
    },
  }
}

export default function (context, inject) {
  inject('customerApi', buildCustomerApi({ baseURL: process.env.privateURL }))
}
