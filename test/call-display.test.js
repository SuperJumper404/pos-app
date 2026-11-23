const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { parseComponent, compile } = require('vue-template-compiler')

const page = parseComponent(fs.readFileSync(path.join(__dirname, '../pages/borne-appel.vue'), 'utf8'))
assert.deepEqual(compile(page.template.content).errors, [])
const timers = new Map()
const schedule = (fn, ms) => {
  const id = Symbol()
  timers.set(id, { fn, ms })
  return id
}
const cancel = id => timers.delete(id)
const options = new Function('setTimeout', 'setInterval', 'clearInterval', 'clearTimeout',
  page.script.content.replace('export default', 'return'))(schedule, schedule, cancel, cancel)
const vm = { ...options.data(), ...options.methods, $set: (array, index, value) => { array[index] = value },
  rotation: {}, queue: [] }
const rows = Array.from({ length: 24 }, (_, i) => ({ id: i + 1, status: 3, ordernumber: String(i + 1), entered: 'first' }))
vm.accept(rows)
assert.equal(vm.visible(3).length, 10)
assert.equal(vm.announcement, null)
const rotation = timers.get(vm.rotation[3])
assert.equal(rotation.ms, 30000)
rotation.fn()
assert.equal(vm.visible(3)[0].id, 11)
rotation.fn()
assert.equal(vm.visible(3).length, 4)
rotation.fn()
assert.equal(vm.visible(3)[0].id, 1)
const next = [...rows, { id: 40, status: 3, entered: 'later' }, { id: 41, status: 3, entered: 'last' }]
vm.accept(next)
assert.equal(vm.announcement.id, 40)
assert.equal(timers.get(vm.announcementTimer).ms, 5000)
vm.accept(next)
assert.equal(vm.queue.length, 1)
timers.get(vm.announcementTimer).fn()
assert.equal(vm.announcement.id, 41)
vm.accept(rows.slice(0, 4))
assert.equal(vm.announcement, null)
assert.equal(vm.rotation[3], undefined)
vm.baseline = false
vm.accept(next)
assert.equal(vm.announcement, null)
console.log('Call display: silent initial sync and reconnect, independent pages, sequential alerts and closure passed')
