const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const pluginSource = fs.readFileSync(
  path.join(root, 'plugins', 'consoleLogs.client.js'),
  'utf8'
)
const configSource = fs.readFileSync(path.join(root, 'nuxt.config.js'), 'utf8')
const packageJson = require('../package.json')

assert.match(
  pluginSource,
  /const LOG_STORAGE_KEY = 'pos:console-logs-enabled'/,
  'console log toggle must persist its state with a stable localStorage key'
)
assert.match(
  pluginSource,
  /window\.POS_LOGS =/,
  'console log toggle must expose window.POS_LOGS for DevTools'
)
assert.match(
  pluginSource,
  /enable\(\)[\s\S]*?setEnabled\(true\)/,
  'POS_LOGS.enable() must reactivate console output'
)
assert.match(
  pluginSource,
  /disable\(\)[\s\S]*?setEnabled\(false\)/,
  'POS_LOGS.disable() must silence console output'
)
assert.match(
  pluginSource,
  /status\(\)[\s\S]*?return isEnabled/,
  'POS_LOGS.status() must report whether logs are enabled'
)
assert.match(
  pluginSource,
  /setEnabled\(false\)/,
  'console logs must be disabled by default'
)
assert.match(
  configSource,
  /~\/plugins\/consoleLogs\.client\.js/,
  'Nuxt must load the console log toggle client plugin'
)
assert.match(packageJson.scripts.test, /test\/console-log-toggle\.test\.js/)

console.log('console log toggle tests passed')
