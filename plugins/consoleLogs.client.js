const LOG_STORAGE_KEY = 'pos:console-logs-enabled'
const MUTED_METHODS = ['log', 'debug', 'info', 'table']

export default () => {
  const originalConsole = MUTED_METHODS.reduce((methods, method) => {
    methods[method] = console[method].bind(console)
    return methods
  }, {})

  const noop = () => {}
  let isEnabled = localStorage.getItem(LOG_STORAGE_KEY) === 'true'

  const applyConsoleState = () => {
    MUTED_METHODS.forEach((method) => {
      console[method] = isEnabled ? originalConsole[method] : noop
    })
  }

  const setEnabled = (enabled) => {
    isEnabled = enabled === true
    localStorage.setItem(LOG_STORAGE_KEY, isEnabled ? 'true' : 'false')
    applyConsoleState()
    return isEnabled
  }

  window.POS_LOGS = {
    enable() {
      return setEnabled(true)
    },
    disable() {
      return setEnabled(false)
    },
    status() {
      return isEnabled
    },
  }

  setEnabled(isEnabled)
}
