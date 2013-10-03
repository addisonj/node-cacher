## Cacher
It does the hard work so you don't have too!

## What is it?
HTTP Caching implemented as express middleware, with pluggable backends for support for a variety of caching servers (memcached, redis, etc)

## Features
- Set expiriry times per-app or per-route. It sets proper headers for client caching
- Avoids the thundering heard by smartly refreshing the cache
- Emits hit or miss events so you can track your hitrate
- Simple invadlidations
- Overrides for custom cache keys and dev mode support
- Obeys (some) client Cache-Control headers

## What does it look like?
``` JavaScript
var Cacher = require("cacher")
// use the default in memory cache
var cacher = new Cacher()
// or pass in a different cache client (in this cached memcached) for different backend support
CacherMemcached = require('cacher-memcached')
var cacher = new Cacher(new CacherMemcached('host1:12345'))

// as a global middleware
app.use(cacher.cache('seconds', 30))
// or per route
app.get("/long-cache", cacher.cache('days'), ...)
app.get("/short-cache", cacher.cache('minute'), ...)
// will set no-cache headers for routes that we explicitly want to ignore caching on
app.get("/no-cache", cacher.cache(false), ...)

// Backwards compatible with old cache definitions
app.use(cacher.cacheHourly())
app.get("/long-cache", cacher.cacheDays(2), ...)

// invalidation support
cacher.invalidate('/home')

// don't cache xhr requests
cacher.xhr = false

// if you don't want browser caching
cacher.browserCache = false

// listen for events to track cache rate and errors
cacher.on("hit", function(key) {
  console.log("woohoo!")
})
cacher.on("miss", function(key) {
  console.log("doh!")
})
cacher.on("error", function(key) {
  console.log(err)
})

// Dev mode, quickly turn off caching when it gets in the way
app.configure('development', function() {
  cacher.noCaching = true
})

// override cache key generation for finer grain control
cacher.genCacheKey = function(req) {
  return req.path + req.header('user-agent')
}
```

## Backends
Currently, Cacher comes bundled with an in-memory cache

Backends are distributed as seperated modules:
- cacher-memcached (https://github.com/addisonj/cacher-memcached)
- cacher-redis (https://github.com/addisonj/cacher-redis)


## Backend Client Api
If you want to implement your own backend, the API is really simple:

```JavaScript
// pass whatever options are needed for connection/options
// provide defaults so a client can be fully instantiated with no parameters
function MyBackend(...) {
}

// cb is required, cb(err, cacheObject)
MyBackend.prototype.get = function(key, cb) {}

MyBackend.prototype.set = function(key, cacheObject, ttlInSeconds, [cb]) {}

MyBackend.prototype.invaldaite = function(key, [cb]) {}
```

## Testing your backend
Run unit tests using your backend by doing the following:
```Shell
cd Cacher
npm link ../myBackend
CACHER_CLIENT=myBackend npm test
```
