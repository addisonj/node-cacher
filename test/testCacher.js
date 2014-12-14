require('http').Agent.maxSockets = 50
var Cacher = require('../lib/Cacher')
var MemoryCache = require('../lib/MemoryClient')
var express = require('express')
var supertest = require('supertest')
var async = require('async')
var assert = require('assert')
var Client = null
var clientConfig = null

if (process.env.CACHER_CLIENT) {
  Client = require(process.env.CACHER_CLIENT)
} else {
  Client = MemoryCache
}

describe('Cacher', function() {
  describe('Instantation', function() {
    it('should instantiate with no parameters and have a proper client', function() {
      var c = new Cacher(new Client())
      assert(c.client instanceof Client)
    })

    it('should not instantiate when passed a client that doesnt adhere to the interface', function() {
      try {
        function BadClient() {}
        var bc = new BadClient()
        var c = new Cacher(bc)
      } catch(e) {
        assert(!!e)
      }
    })
  })

  describe('CalcTtl', function() {
    var c = new Cacher(new Client())

    it('should be able to compute proper ttls from cache values', function() {
      var MIN = 60
      var HOUR = MIN * 60
      var DAY = HOUR * 24
      assert.equal(1, c.calcTtl('second'))
      assert.equal(10, c.calcTtl('seconds', 10))
      assert.equal(MIN, c.calcTtl('minute'))
      assert.equal(MIN*2, c.calcTtl('minutes', 2))
      assert.equal(HOUR, c.calcTtl('hour'))
      assert.equal(HOUR*2, c.calcTtl('hours', 2))
      assert.equal(DAY, c.calcTtl('day'))
      assert.equal(DAY*2, c.calcTtl('days', 2))
      assert.equal(0, c.calcTtl(0))
      assert.equal(0, c.calcTtl(false))
      assert.equal(0, c.calcTtl('days', 0))
    })

  })

  describe('Override Caching', function() {
    var cacher = new Cacher(new Client())
    cacher.noCaching = true

    var app = express()
    app.get('/', cacher.cache('day'), function(req, res) {
      res.send('boop')
    })

    it('shouldnt cache when noCaching is set to true', function(done) {
      supertest(app)
        .get('/')
        .expect(200)
        .expect('Cache-Control', 'no-cache')
        .expect('boop')
        .end(function(err, res) {
          assert.ifError(err)

          supertest(app)
            .get('/')
            .expect(200)
            .expect('Cache-Control', 'no-cache')
            .expect('boop')
            .end(function(err, res) {
              assert.ifError(err)
              done()
            })

        })
    })
  })

  describe('Caching', function() {
    var cacher = new Cacher(new Client())
    var app = require("./fixtures/server")(cacher)

    it('should cache when there is a sufficent ttl', function(done) {
      supertest(app)
        .get('/long')
        .expect(cacher.cacheHeader, 'false')
        .expect(200)
        .expect('long')
        .expect('Content-Type', /text/)
        .end(function(err, res) {
          assert.ifError(err)

          supertest(app)
            .get('/long')
            .expect(cacher.cacheHeader, 'true')
            .expect(200)
            .expect('long')
            .expect('Content-Type', /text/)
            .end(function(err, res) {
              assert.ifError(err)
              done()
            })
        })
    })
    it('shouldnt cache when the ttl expires', function(done) {
      function secondReq() {
        supertest(app)
          .get('/short')
          .expect(cacher.cacheHeader, 'false')
          .expect(200)
          .expect('short')
          .expect('Content-Type', /text/)
          .end(function(err, res) {
            assert.ifError(err)
            done()
          })
      }
      supertest(app)
        .get('/short')
        .expect(cacher.cacheHeader, 'false')
        .expect(200)
        .expect('short')
        .expect('Content-Type', /text/)
        .end(function(err, res) {
          assert.ifError(err)
          setTimeout(secondReq, 1500)
        })
    })

    it('shouldnt cache after an invalidation', function(done) {
      cacher.invalidate('/long', function(err) {
        assert.ifError(err)
        supertest(app)
          .get('/long')
          .expect(cacher.cacheHeader, 'false')
          .expect(200)
          .expect('long')
          .expect('Content-Type', /text/)
          .end(function(err, res) {
            assert.ifError(err)
            supertest(app)
              .get('/long')
              .expect(cacher.cacheHeader, 'true')
              .expect(200)
              .expect('long')
              .expect('Content-Type', /text/)
              .end(function(err, res) {
                assert.ifError(err)
                done()
              })
          })
      })
    })

    it('should be able to dynamically disable ignoring of request headers', function(done) {
      cacher.ignoreClientNoCache = false
      supertest(app)
        .get('/long')
        .set('Cache-Control', 'no-cache')
        .expect(cacher.cacheHeader, 'false')
        .expect(200)
        .expect('long')
        .expect('Content-Type', /text/)
        .end(function(err, res) {
          cacher.ignoreClientNoCache = true
          assert.ifError(err)
          done()
        })
    })

    it('should work with other contentTypes', function(done) {
      supertest(app)
        .get('/json')
        .expect(cacher.cacheHeader, 'false')
        .expect(200)
        .expect({boop: true})
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          assert.ifError(err)

          supertest(app)
            .get('/json')
            .expect(cacher.cacheHeader, 'true')
            .expect(200)
            .expect({boop: true})
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              assert.ifError(err)
              done()
            })
        })

    })

    it('should preserve status codes', function(done) {
     supertest(app)
        .get('/201')
        .expect(cacher.cacheHeader, 'false')
        .expect(201)
        .expect('boop')
        .expect('Content-Type', /text/)
        .end(function(err, res) {
          assert.ifError(err)

          supertest(app)
            .get('/201')
            .expect(cacher.cacheHeader, 'true')
            .expect(201)
            .expect('boop')
            .expect('Content-Type', /text/)
            .end(function(err, res) {
              assert.ifError(err)
              done()
            })
        })
    })
    it('should preserve custom headers', function(done) {
     supertest(app)
        .get('/header')
        .expect(cacher.cacheHeader, 'false')
        .expect(200)
        .expect('header')
        .expect('Content-Type', /text/)
        .expect('X-Custom-Header', 'boop')
        .end(function(err, res) {
          assert.ifError(err)

          supertest(app)
            .get('/header')
            .expect(cacher.cacheHeader, 'true')
            .expect(200)
            .expect('header')
            .expect('Content-Type', /text/)
            .expect('X-Custom-Header', 'boop')
            .end(function(err, res) {
              assert.ifError(err)
              done()
            })
        })
    })
    it('shouldnt cache post request', function(done) {
      supertest(app)
        .post('/post')
        .expect(200)
        .expect('OK')
        .expect('Content-Type', /text/)
        .end(function(err, res) {
          assert(!res.header[cacher.cacheHeader])
          assert.ifError(err)

          supertest(app)
            .post('/post')
            .expect(200)
            .expect('OK')
            .expect('Content-Type', /text/)
            .end(function(err, res) {
              assert(!res.header[cacher.cacheHeader])
              assert.ifError(err)
              done()
            })
        })
    })

    it('should still work when res.write is used', function(done) {
      supertest(app)
        .get('/write')
        .expect(cacher.cacheHeader, 'false')
        .expect(200)
        .expect('beep|boop')
        .expect('Content-Type', /text/)
        .end(function(err, res) {
          assert.ifError(err)

          supertest(app)
            .get('/write')
            .expect(cacher.cacheHeader, 'true')
            .expect(200)
            .expect('beep|boop')
            .expect('Content-Type', /text/)
            .end(function(err, res) {
              assert.ifError(err)
              done()
            })
        })
    })
    it('should work with attachments', function(done) {
      supertest(app)
        .get('/pdf')
        .expect(cacher.cacheHeader, 'false')
        .expect(200)
        .expect('Content-Type', /pdf/)
        .expect('Content-Length', '7945')
        .end(function(err, res) {
          assert.ifError(err)
          var text = res.text

          supertest(app)
            .get('/pdf')
            .expect(cacher.cacheHeader, 'true')
            .expect(200)
            .expect('Content-Type', /pdf/)
            .expect('Content-Length', '7945')
            .end(function(err, res) {
              assert.ifError(err)
              assert.equal(text, res.text)
              done()
            })
        })
    })
    it('should work with files', function(done) {
      supertest(app)
        .get('/image')
        .expect(cacher.cacheHeader, 'false')
        .expect(200)
        .expect('Content-Type', /png/)
        .expect('Content-Length', '1504')
        .end(function(err, res) {
          assert.ifError(err)
          var text = res.text

          supertest(app)
            .get('/image')
            .expect(cacher.cacheHeader, 'true')
            .expect(200)
            .expect('Content-Type', /png/)
            .expect('Content-Length', '1504')
            .end(function(err, res) {
              assert.ifError(err)
              assert.equal(text, res.text)
              done()
            })
        })
    })
    it('should be able to dynamically disable caching', function(done) {
      cacher.noCaching = true
      supertest(app)
        .get('/long')
        .expect('Cache-Control', 'no-cache')
        .expect(200)
        .end(function(err, res) {
          assert.ifError(err)
          cacher.noCaching = false

          supertest(app)
            .get('/long')
            .expect(cacher.cacheHeader, 'true')
            .expect(200)
            .end(function(err, res) {
              assert.ifError(err)
              done()
            })
        })
    })
    it('should ignore request cache control headers by default', function(done) {
      supertest(app)
        .get('/long')
        .expect(200)
        .end(function(err, res) {
          assert.ifError(err)

          supertest(app)
            .get('/long')
            .set('Cache-Control', 'no-cache')
            .expect(cacher.cacheHeader, 'true')
            .expect(200)
            .end(function(err, res) {
              assert.ifError(err)
              done()
            })
        })
    })

    it('should avoid key collisions when same relative url is used on two different mount points', function(done) {

      var collisionTest = function(expectedCache, next) {
        supertest(app)
          .get('/fooMount/nodupe')
          .expect(cacher.cacheHeader, expectedCache)
          .expect(200, 'foo')
          .end(function(err, res) {
            assert.ifError(err);

            supertest(app)
              .get('/barMount/nodupe')
              .expect(cacher.cacheHeader, expectedCache)
              .expect(200, 'bar')
              .end(function(err, res) {
                assert.ifError(err);
                next();
              });
          });
      };

      async.series([
        function(next) { collisionTest('false', next) },
        function(next) { collisionTest('true', next) },
        function() { done(); }
      ]);
    });

  })
})
