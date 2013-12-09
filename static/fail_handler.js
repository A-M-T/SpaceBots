
// In the case something goes wrong (eventually it will) - server
// returns 'fail' message. It contains some basic information about
// error that have occured.  We'll simply print it in the console
// window.

socket.on('fail', function(report) {

  var msg = [
    'Error ',
    report.code,
    ' in "',
    report.source,
    '": ',
    report.message
  ].join('');

  console.error(msg);

});
