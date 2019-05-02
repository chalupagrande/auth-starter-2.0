const jwt = require('jsonwebtoken')
const ErrorCodes = require('./errorCodes')
const secret = process.env.SECRET
const tokenExpiryTime = process.env.TOKEN_EXPIRATION_TIME
const tempTokenExpiryTime = process.env.TEMP_TOKEN_EXPIRATION_TIME
const cookieName = process.env.COOKIE_NAME
// const User = require('../services/user')

/**
 * @param {Object} payload - make cookie
 */
function createToken(profile, isTemp = false) {
  // let payload = User.determinePayloadFromSource(profile.source, profile)
  return jwt.sign(profile, secret, {
    expiresIn: isTemp ? tempTokenExpiryTime : tokenExpiryTime
  })
}

function setCookie(res, token, overwrite = false) {
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    overwrite
  })
}
/**
  Error handling. Only to be used when the SERVER is experiencing an error. Not
  to be used when sending back incorrect credential errors and so forth.

  @param {object} err : The error object generated.
  @param {object} res : The response object to send back to the user.
  @param {string} msg : A message that will help identify the origin of the error.
*/
function handleError(err, res, code) {
  if (code) console.log(ErrorCodes[code])
  if (err) console.log(err)
  if (res) {
    return res
      .status(500)
      .send({ error: err, message: ErrorCodes[code], code: code })
  }
}

/**
 * Sends response to client
 * @param {Object} res - express response object
 * @param {Int} status - response status
 * @param {string} message - message to respond with
 * @param {object} data - data to respond with
 */
function respond(res, status = 200, message = 'ok', data) {
  res.status(status).send({
    msg: message,
    data: data
  })
}

module.exports = {
  respond,
  createToken,
  handleError,
  setCookie
}
