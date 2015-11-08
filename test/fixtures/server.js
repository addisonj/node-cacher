
var express = require("express")
var path = require("path")
module.exports = function(cacher) {
  var app = express()
  app.get('/long', cacher.cache('day'), function(req, res) {
    res.send('long')
  })
  app.get('/short', cacher.cache('second'), function(req, res) {
    res.send('short')
  })
  app.get('/json', cacher.cache('day'), function(req, res) {
    res.json({boop: true})
  })
  app.get('/201', cacher.cache('day'), function(req, res) {
    res.send("boop", 201)
  })
  app.get('/header', cacher.cache('day'), function(req, res) {
    res.set('X-Custom-Header', 'boop')
    res.send('header')
  })
  app.post('/post',  function(req, res) {
    res.send('OK')
  })
  app.get('/write', cacher.cache('day'), function(req, res) {
    res.type('text')
    res.write('beep|')
    res.end('boop')
  })
  app.get('/pdf', cacher.cache('day'), function(req, res) {
    res.download(path.join(__dirname, 'test.pdf'))
  })
  app.get('/image', cacher.cache('day'), function(req, res) {
    res.sendfile(path.join(__dirname, 'test.png'))
  })
  app.get('/head', cacher.cache('day'), function(req, res) {
    res.send('HEAD request')
  })
  app.get('/dont-cache-onthefly', cacher.cache('day'), function(req, res) {
    req.noCaching = true;
    res.send('this is not cached')
  })


  var fooRouter = express.Router();
  var barRouter = express.Router();
  app.use('/fooMount', fooRouter);
  app.use('/barMount', barRouter);
  fooRouter.get('/nodupe', cacher.cache('second', 10), function(req, res) {
    res.send('foo');
  });
  barRouter.get('/nodupe', cacher.cache('second', 10), function(req, res) {
    res.send('bar');
  });

  return app
}


if (module === require.main) {
  var Cacher = require("../../lib/Cacher")
  var MemoryCache = require('../../lib/MemoryClient')
  if (process.env.CACHER_CLIENT) {
    Client = require(process.env.CACHER_CLIENT)
  } else {
    Client = MemoryCache
  }
  var port = process.env.PORT || 3000
  var app = module.exports(new Cacher(new Client()))
  app.listen(port, function() {
    console.log("listening on " + port)
  })
}
