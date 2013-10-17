var winston = require('winston');

var ts = function() {
	return (new Date).toJSON().substr(0,10) + ' ' +
		(new Date).toJSON().substr(11,8);
};

var logger = new (winston.Logger)({
	transports : [new winston.transports.File({
		filename : __dirname + '/debug.log',
		colorize: true,
		timestamp: ts,
		json : false
	})],
	exceptionHandlers : [new winston.transports.File({
		filename : __dirname + '/exceptions.log',
		json : true,
		stringify : function (obj) {
			return JSON.stringify(obj, null, 2);
		},
		timestamp: ts
	})],
	exitOnError : false
});

logger.cli();

module.exports = logger; 
