// memory cache is global, ideally it wouldn't be...
var cache = require('memory-cache')

// A minimal in memory implemenation of the interface needed for cacher
// note: we present an async interface, but it is in fact sync
function MemoryCache() {
}

MemoryCache.prototype.get = function(key, cb) {
  cb(null, cache.get(key))
}

MemoryCache.prototype.set = function(key, cacheObj, ttl, cb) {
  // this expects milliseconds
  cache.put(key, cacheObj, ttl*1000)
  if (cb) return cb()
}

MemoryCache.prototype.invalidate = function(key, cb) {
  cache.del(key)
  if (cb) return cb()
}


module.exports = MemoryCache
