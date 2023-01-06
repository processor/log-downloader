const jwt = require('jsonwebtoken');
const fs = require('fs');

class LogDownloader {
  constructor(environmentId, keyId, keySecret) {
    this.environmentId = environmentId;
    this.keyId = keyId;
    
    if (typeof keySecret === 'string') {
      // decode the secet if it sas provided as a base64 string
      this.keySecret = Buffer.from(keySecret, 'base64');
    }
    else {
      this.keySecret = keySecret;
    }
  }

  async download(path, options) {
    let continuationToken; 
    let errorCount = 0;

    do {
      var params = new URLSearchParams();

      if (options.start) {
        params.append('start', options.start);
      }

      if (options.end) {
        params.append('end', options.end);
      }

      if (continuationToken) {
        params.append('continuationToken', continuationToken);
      }

      let url = `https://api.accelerator.net/environments/${this.environmentId}/log?${params}`;

      let payload = { url, method: 'GET'  };
      let header = { type: 'JWT', alg: 'HS256', kid: this.keyId }

      let token = jwt.sign(payload, this.keySecret, { header: header, expiresIn: 60 * 5 });

      let response = await fetch(url, { 
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Accept-Encoding': 'gzip'
          }
      });
      
      if (response.headers.get('x-start')) {
        console.log('cursor @', response.headers.get('x-start'));
      }

      if (!response.ok) {
        if (response.headers.get('Content-Type') === 'application/problem+json') {
          let problem = await response.json(); // { type, detail, status }

          console.log('error', problem);
        }
        else {
          console.log('error', response.status);
          
          errorCount++;

          if (errorCount < 10) {
            console.log('retrying');

            await new Promise((resolve, reject) => {
              setTimeout(resolve, 3000);
            });

            continue;
          }
        }
        
        return;
      }

      const fileStream = fs.createWriteStream(path, { flags: 'a' }); // append to the log

      var reader = response.body.getReader();
     
      while (true) {
        let { done, value } = await reader.read();

        if (done) {
          break;
        }
        
        fileStream.write(value);
      }

      continuationToken = response.headers.get('continuation-token');
      
      // each batch returns 100,000 records
    }
    while (!!continuationToken);
  }
}

module.exports = { LogDownloader };