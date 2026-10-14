const assert = require('assert')
const fs = require('fs')

const stagingWorkflow = fs.readFileSync('.github/workflows/deploy-staging.yml', 'utf8')
const productionWorkflow = fs.readFileSync('.github/workflows/deploy-prod.yml', 'utf8')
const compose = fs.readFileSync('compose.yml', 'utf8')
const productsStore = fs.readFileSync('store/products.js', 'utf8')

for (const variable of [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_BUCKET',
]) {
  for (const [environment, workflow, envFile] of [
    ['staging', stagingWorkflow, '.env.staging'],
    ['production', productionWorkflow, '.env.production'],
  ]) {
    assert.ok(
      workflow.includes(`${variable}=`),
      `${environment} deploy workflow must preserve ${variable} in ${envFile}`
    )
  }

  assert.ok(
    compose.includes(`${variable}:`),
    `compose service must expose ${variable} to npm run generate`
  )
}

assert.ok(
  productsStore.includes(".post('/baseurl/api/v1/product'"),
  'product creation must use the same absolute /baseurl API path as other authenticated calls'
)

// eslint-disable-next-line no-console
console.log('Supabase deploy env tests passed')
