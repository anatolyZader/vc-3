// server_options.js

const fs = require('fs');

module.exports.options = {
  https: {
    key: fs.readFileSync('/etc/letsencrypt/live/tvice.net/privkey.pem'),  // The private key from the conf file.
    cert: fs.readFileSync('/etc/letsencrypt/live/tvice.net/fullchain.pem') // The full certificate chain from the conf file.
  },
};

// privkey.pem is your private key (used for decryption) and goes in the key option.
// fullchain.pem contains both your server's certificate and the intermediate certificates, and goes in the cert option to ensure a complete chain of trust for client verification.
// You should not use just cert.pem, as it lacks the necessary intermediate certificates, potentially leading to connection errors.