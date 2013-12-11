/*jshint node:true */

var exec = require('child_process').exec,
  shifterFlag = false,
  yogiFlag = false;

exec('shifter -v', {}, function (err1) {
  if (err1) {
    shifterFlag = true;
    console.log('*************************************************************');
    console.log('*                                                           *');
    console.log('* Oops, Shifter needs to be installed globaly for fedtools: *');
    console.log('* npm install -g shifter                                    *');
    console.log('*                                                           *');
    console.log('*************************************************************');
    console.log();
  }
  exec('yogi -v', {}, function (err2) {
    if (err2) {
      yogiFlag = true;
      console.log('*************************************************************');
      console.log('*                                                           *');
      console.log('* Oops, Yogi needs to be installed globaly for fedtools:    *');
      console.log('* npm install -g yogi                                       *');
      console.log('*                                                           *');
      console.log('*************************************************************');
      console.log();
    }

    if (yogiFlag || shifterFlag) {
      process.exit(1);
    } else {
      process.exit(0);
    }

  });
});
