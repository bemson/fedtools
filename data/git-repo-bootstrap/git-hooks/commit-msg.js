/*jshint node:true*/

var fs = require('fs'),
  commentFile, message;

if (process.argv && process.argv.length === 3) {
  commentFile = process.argv[2];
  message = fs.readFileSync(commentFile, 'utf8');
  if (!message || (message.indexOf('PN-') === -1 && message.indexOf('NO TICKET') === -1)) {
    console.error();
    console.error('No commit message or commit message does not reference a JIRA ticket.');
    console.error();
    setTimeout(function () {
      process.exit(1);
    }, 100);
  } else {
    process.exit(0);
  }
}
