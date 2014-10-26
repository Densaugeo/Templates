process.title = 'Template';

var http    = require('http');
var repl    = require('repl');
var fs      = require('fs');
var express = require('express');
var ws      = require('ws');
var stdio   = require('stdio');
var iz      = require('iz');

/////////////////
// Get options //
/////////////////

var optionsAllowed = {
  'ip'    : {key: 'i', args: 1, description: 'IP address for both HTTP and WS servers. Defaults to OpenShift if available, or if not then 0.0.0.0'},
  'port'  : {key: 'p', args: 1, description: 'TCP port for both HTTP and WS servers. Defaults to OpenShift if available, or if not then 8080'},
  'config': {key: 'c', args: 1, description: 'Load settings from configurations file. Defaults to ./config.json'},
  'silent': {key: 's', args: 0, description: 'Silence stdout'},
  'nofile': {          args: 0, description: 'Run without a config file. "ip" and "port" options must be specified'}
};

var optionsCLI = stdio.getopt(optionsAllowed);

var optionsFile = {};

if(!optionsCLI.nofile) {
  try {
    var optionsFile = JSON.parse(fs.readFileSync(optionsCLI.config || 'config.json'));
  }
  catch(error) {
    console.error('Warning: Unable to read config file "' + (optionsCLI.config || 'config.json') + '". (' + error + ')');
  }
}

// Condense options sources into one options object, applying priority
var options = {};

for(var i in optionsAllowed) {
  options[i] = optionsCLI[i] || optionsFile[i];
}

if(!iz(options.ip).required().ip().valid) {
  if(iz(process.env[options.ip]).required().ip().valid) {
    options.ip = process.env[options.ip];
  }
  else {
    console.error('Error: IP must be a valid IP address or local url. Run with -i 0.0.0.0 to use all available IPs');
    process.exit(1);
  }
}

if(!iz(options.port).required().int().between(1, 65535).valid) {
  if(iz(process.env[options.port]).required().int().between(1, 65535).valid) {
    options.port = process.env[options.port];
  }
  else {
    console.error('Error: TCP port must be an integer between 1 and 65535. Run with -p 8080 to listen on port 8080');
    process.exit(1);
  }
}

if(iz(options.port).int().between(1, 1024).valid) {
  console.warn('Warning: TCP ports between 1 and 1024 may require root permission');
}

var log = options.silent ? function(){} : function(message){console.log(new Date().toUTCString() + ': ' + message)};

/////////////////
// HTTP server //
/////////////////

var app = express();
var httpServer = http.createServer(app);
httpServer.listen(options.port, options.ip);

// Simple static page server
app.use('/', express.static('./http'));
app.use(express.compress());
log('Static file server listening at http://' + options.ip + ':' + options.port + '/');

///////////////
// WS server //
///////////////

var wsServer = new ws.Server({server: httpServer, path: '/'});

wsServer.on('connection', function(connection) {
  log('Received WebSocket');
  
  connection.on('message', function(message) {
    log('Received message: ' + message);
  });
  
  connection.on('close', function() {
    log('Closed WebSocket');
  });
});

/////////
// CLI //
/////////

if(!options.silent) {
  var cli = repl.start({});
  cli.context.http           = http;
  cli.context.repl           = repl;
  cli.context.fs             = fs;
  cli.context.express        = express;
  cli.context.ws             = ws;
  cli.context.stdio          = stdio;
  cli.context.iz             = iz;
  cli.context.optionsCLI     = optionsCLI;
  cli.context.optionsFile    = optionsFile;
  cli.context.options        = options;
  cli.context.app            = app;
  cli.context.httpServer     = httpServer;
  cli.context.wsServer       = wsServer;
}
