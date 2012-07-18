
/**
 * Module dependencies.
 */

var express = require('express'),
  http = require('http'),
  fs = require('fs'),
  flash = require('connect-flash'),
  MongoStore = require('connect-mongodb'),
  app = express(),
  middleware = require(__dirname + '/lib/middleware');

utils = require(__dirname + '/lib/utils');
auth = require(__dirname + '/lib/authentication');
_ = require('underscore');

// Load configurations
var config_file = require('yaml-config')
exports = module.exports = config = config_file.readConfig('./config.yaml')

// Load environment-specific config
app.configure('development', function(){
  app.use(express.errorHandler());
});

app.configure('production', function(){
  // TODO: Figure out a way to load config.yaml through EJS,
  // so this can be added there for production environment,
  // instead of just overriding it like this.
  config.db.uri = process.env.MONGOHQ_URL;
  config.app_secret = process.env.APP_SECRET;
});

// Connect to db and load models
require(__dirname + '/lib/db-connect');

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/app/views');
  app.set('view engine', 'jade');
  app.set('view options', { layout: __dirname + '/app/views/layouts/application' });
  app.use(middleware.setLocals);
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser()); 
  app.use(express.session({
    secret: config.app_secret,
    maxAge: new Date(Date.now() + 3600000),
    store: new MongoStore(
      {db:mongoose.connection.db},
      function(err){
        if (err) { console.log(err); };
      })
  }));
  app.use(express.static(__dirname + '/public'));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(flash());
  app.use(app.router);
});

var server = app.listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'));
});

io = require('socket.io').listen(server);

// Needed for Heroku, which does not yet support websockets,
// must use long polling.
io.configure(function() {
  io.set("transports", ["xhr-polling"]);
  io.set("polling duration", 10);
});

// Load models
var models = require(__dirname + '/app/models');
// Load controllers, passing `app` context
var controllers = require(__dirname + '/app/controllers')(app);
