
var file = new (require('node-static').Server)('./static');
var logger = require('./logger');
var argv = require('optimist').argv;

var port = 8000;
var redirect_port = 0;
var certpath, keypath;

if( process.getuid() === 0 ) {
	port = 443;
	redirect_port = 80;
}

if(typeof argv.keypath === 'undefined' || typeof argv.certpath === 'undefined') {
	require('findit').sync(__dirname, {},  function(file, stat) {
		if(file.indexOf('.pem') == file.length - 4) {
			if(file.indexOf('cert') >= 0) {
				if(typeof certpath === 'undefined' || (file.length < certpath.length)) {
					certpath = file;
				}
			}
			if(file.indexOf('key') >= 0) {
				if(typeof keypath === 'undefined' || (file.length < keypath.length)) {
					keypath = file;
				}
			}
		}
	});
}

if(argv.certpath) certpath = argv.certpath;
if(argv.keypath) keypath = argv.keypath;

if(typeof argv.redirect === 'number') redirect_port = argv.redirect;
if(typeof argv.port === 'number') port = argv.port;

if(redirect_port) {
	redirector = require('http').createServer(function (req, res) {
		res.writeHead(302, {
			'Location': 'https://' + req.headers['host'] + 
				(port == 443 ? '' : ':' + port) + '/'
		});
		res.end();
	});
	try {
		redirector.listen(redirect_port);
	} catch(e) {
		logger.warn("Couldn't create connection redirector on " +
			"port " + redirect_port + ". Skipping...");
	}
}

var app = require('https').createServer(
	{
		key: fs.readFileSync(keypath).toString(),
		cert: fs.readFileSync(certpath).toString()
	}, 
	function (req, res) {
		file.serve(req, res);
	}
);

var io = require('socket.io').listen(app, { logger: logger });
//io.set('log level', 1);
io.set('heartbeat timeout', 60 * 60 * 24 );
io.set('close timeout', 60 * 60 * 24 );

app.listen(port);

exports.app = app;
exports.io = io;
exports.port = port;
exports.redirect_port = redirect_port;

