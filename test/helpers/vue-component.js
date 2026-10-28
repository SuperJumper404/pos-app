const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { createRequire } = require('module')
const compiler = require('vue-template-compiler')
const root = path.resolve(__dirname, '../..')

module.exports = (file, injections = {}) => {
  const filename = path.join(root, file)
  const parsed = compiler.parseComponent(fs.readFileSync(filename, 'utf8'))
  const localRequire = createRequire(filename)
  const resolve = name => localRequire(name.startsWith('@/') ? path.join(root, name.slice(2)) : name)
  const script = parsed.script.content.replace(/^import .*$/gm, '').replace('export default', 'return')
  const component = vm.compileFunction(script, ['require', ...Object.keys(injections)])(resolve, ...Object.values(injections))
  const compiled = compiler.compile(parsed.template.content)
  if (compiled.errors.length) throw new Error(compiled.errors.join('\n'))
  return { component, template: compiler.compileToFunctions(parsed.template.content), ast: compiled.ast }
}
