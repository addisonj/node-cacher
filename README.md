## Cacher
It does the hard work so you don't have too!

## What is it?
A distibuted HTTP caching that utilzies memcached and is implented using an express middleware!

## Features
- Set expiriry times per-app or per-route. It sets headers and sets the ttl
- Avoids the thundering heard by smartly refreshing the cache
- emits hit or miss events so you can track your hitrate

## What does it look like?
``` JavaScript
var Cacher = require("cacher")
var cacher = new Cacher("myhost:11211")
// or
var cacher = new Cacher({hosts: ["host1:11211", "host2:11211"], memcached_opts: {poolSize: 25})

// as a global middleware
app.use(cacher.cacheHourly())
// or per route
app.get("/long-cache", cacher.cacheDaily(), ...)
app.get("/short-cache", cacher.cacheOneMinute(), ...)
app.get("/no-cache", ...)

// listen for events
cacher.on("hit", function(url) {
  console.log("woohoo!")
})

cacher.on("miss", function(url) {
  console.log("doh!")
})

cacher.on("error", function(err) {
  console.log(err)
})
```


## TODO
Uses 3rd-Eden/node-memcached as a memcached client, but atm its connection pooling is broken...

