const buildAddressDisplayQueue = loader => {
  let generation = 0
  let active = 0
  const entries = new Map()
  const waiting = []
  const pump = () => {
    while (active < 2 && waiting.length) {
      const job = waiting.shift()
      active++
      const finish = (error, value) => {
        active--
        if (entries.get(job.key) === job) entries.delete(job.key)
        pump()
        if (job.generation !== generation) job.resolve(null)
        else if (error) job.reject(error)
        else job.resolve(value)
      }
      try { Promise.resolve(loader(job.key)).then(value => finish(null, value), error => finish(error)) }
      catch (error) { finish(error) }
    }
  }
  return {
    load(key) {
      if (entries.has(key)) return entries.get(key).promise
      if (waiting.length >= 100) return Promise.resolve(null)
      const job = { key, generation }
      job.promise = new Promise((resolve, reject) => { job.resolve = resolve; job.reject = reject })
      entries.set(key, job); waiting.push(job); pump()
      return job.promise
    },
    clear() {
      generation++
      for (const job of waiting.splice(0)) job.resolve(null)
      entries.clear()
    },
  }
}
module.exports = { buildAddressDisplayQueue }
