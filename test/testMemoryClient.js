var assert = require("assert")
var MemoryClient = require("../lib/MemoryClient")
var D_TTL = 1
describe("MemoryClient", function() {
  var cache = new MemoryClient()
  it("should be able to set a cache value by key and retrieve it", function(done) {
    cache.set("key1", {boop: true}, D_TTL, function(err) {
      assert.ifError(err)
      cache.get("key1", function(err, val) {
        assert.ifError(err)
        assert(val, {boop: true})
        done()
      })
    })
  })

  it("should remove values that expire", function(done) {
    cache.set("expiring", {boop: false}, D_TTL, function(err) {
      assert.ifError(err)
      function checkAfter() {
        cache.get("expiring", function(err, val) {
          assert.ifError(err)
          assert(!val)
          done()
        })
      }

      setTimeout(checkAfter, 1500)
    })
  })

  it("should be able to invalidate a value", function(done) {
    // set a long ttl just in case
    cache.set("invalidate", {boop: true}, 1000, function(err) {
      assert.ifError(err)
      cache.invalidate("invalidate", function(err) {
        assert.ifError(err)
        cache.get("invalidate", function(err, val) {
          assert.ifError(err)
          assert(!val)
          done()
        })
      })
    })
  })


})
