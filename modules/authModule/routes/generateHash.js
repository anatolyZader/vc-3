/* eslint-disable no-unused-vars */
/// generateHash.js
'use strict'

const crypto = require('node:crypto')
const util = require('node:util')

const pbkdf2 = util.promisify(crypto.pbkdf2)


module.exports = async function generateHash(password, salt) {
  if (!salt) {
    // Generate a random salt value
    salt = crypto.randomBytes(16).toString('hex')
  }


  const passwordString = String(password);  // the 'password' value was casted to string to prevent the following error: TypeError [ERR_INVALID_ARG_TYPE]: The "password" argument must be of type string or an instance of ArrayBuffer, Buffer, TypedArray, or DataView. Received an instance of Object
  console.log('typeof passwordString: ', typeof passwordString)
  console.log('passwordString: ', passwordString);

  if ( typeof salt !== 'string' ) {
    console.log('Salt must be a string')
    salt = String(salt)
  }


  

  // Hash the password using the salt value and SHA-256 algorithm
  const hash = (await pbkdf2(passwordString, salt, 1000, 64, 'sha256')).toString('hex')
  return { salt, hash }
}
