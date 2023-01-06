const f = require('./log-downloader');

let environmentId = 1;
let accessKeyId = 'x';
let accessKeySecret = 'x';

let downloader = new f.LogDownloader(environmentId, accessKeyId, accessKeySecret);
  
downloader.download('log.txt', { 
  start : '2022-12-01',
  end   : '2022-12-02' // optional
});
  