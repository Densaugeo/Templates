process.title = 'Template';

var http = require('http');
var repl = require('repl');
var express = require('express');
var ws = require('ws');

/////////////////
// HTTP server //
/////////////////

var FILE_PORT = process.env.OPENSHIFT_NODEJS_PORT || 8080;
var IP = process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';
var app = express();
var httpServer = http.createServer(app);
httpServer.listen(FILE_PORT, IP);


// Simple static page server
app.use('/http', express.static('./http'));
app.use(express.compress());
console.log((new Date()) + ': Static file server listening at http://' + IP + ':' + FILE_PORT + '/http');

///////////////
// WS server //
///////////////

var websocket = new ws.Server({server: httpServer, path: '/ws'});

websocket.on('connection', function(connection) {
  console.log((new Date()) + ': Received connection from: ' + '?');
});

/////////
// CLI //
/////////

var cli = repl.start({});
cli.context.app = app;
