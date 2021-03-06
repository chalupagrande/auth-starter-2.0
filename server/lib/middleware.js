require('dotenv').config()
const jwt = require('jsonwebtoken')
const axios = require('axios')
const passport = require('passport')
const mongoDB = require('../connections/mongoDB')
const { RateLimiterMongo } = require('rate-limiter-flexible')
const { handleError, respond, setCookie } = require('./utils')
// config
const config = require('../config')
const { clientURL, env } = config.global
const { secret, cookieName, captchaSecretKey, captchaThreshold } = config.utils

passport.serializeUser(function(user, done) {
  done(null, user)
})

passport.deserializeUser(function(user, done) {
  done(null, user)
})

function verifyOrigin(req, res, next) {
  if (env !== 'production') next()
  else if (req.headers.origin !== clientURL)
    respond(res, 403, 'You are not authorized')
  else next()
}

// middleware to protect routes from unAuthorized tokens
function verifyAuthenticationToken(req, res, next) {
  try {
    const { headers } = req
    // ensure request comes from correct origin and referer
    // protects against csrf (cross site request forgery)
    if (headers.origin || headers.referer) {
      if (
        (headers.origin && !headers.origin.includes(clientURL)) ||
        (headers.referer && !headers.referer.includes(clientURL))
      )
        return respond(res, 403, 'Unrecognized referer or origin')
    }

    // check if the token is in the cookies or the
    // req.params or in the Authorization header
    let token
    if (req.params.token) {
      token = req.params.token
    } else if (req.cookies && req.cookies[cookieName]) {
      token = req.cookies[cookieName]
      setCookie(res, token, true) // resets cookie to keep them logged in.
    } else if (req.headers.authorization) {
      token = req.headers.authorization.split(' ')[1]
    }

    // verify token
    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        if (
          err.name === 'TokenExpiredError' ||
          err.message === 'jwt malformed' ||
          err.message === 'jwt must be provided'
        ) {
          return respond(res, 403, 'Your session has expired')
        } else return handleError(err, res, 4000)
      }
      req.locals = { userInfo: decoded, token }
      next()
    })
  } catch (err) {
    return respond(res, 400, 'No token present')
  }
}

/**
 * Creates a middleware function with the specific permissions to check for
 * User must have all permissions to continue
 * @param {Array} permissions - Array of permission strings
 */
function makePermissionsMiddleware(permissions) {
  return function(req, res, next) {
    const userPermissions = req.locals.userInfo.permissions
    let isAllowed = permissions.reduce((allowed, p) => {
      return userPermissions ? userPermissions.includes(p) && allowed : false
    }, true)
    if (isAllowed) next()
    else respond(res, 403, 'You are not authorized')
  }
}

function verifyCaptcha(req, res, next) {
  const { recaptcha } = req.body
  try {
    axios({
      method: 'post',
      url: `https://www.google.com/recaptcha/api/siteverify`,
      params: {
        secret: captchaSecretKey,
        response: recaptcha,
        remoteip: req.connection.remoteAddress
      }
    })
      .then(({ status, data }) => {
        if (status === 200 && data.score >= captchaThreshold && data.success)
          next()
        else {
          console.log('recaptcha VALUE: ', data)
          respond(res, 403, 'Invalid recaptcha', { recaptcha: data })
        }
      })
      .catch(err => handleError(err, res, 4001))
  } catch (err) {
    respond(res, 403, 'Invalid captcha. No captcha info present.')
  }
}

//  ___    _ _____ ___   _    ___ __  __ ___ _____ ___ ___
// | _ \  /_\_   _| __| | |  |_ _|  \/  |_ _|_   _| __| _ \
// |   / / _ \| | | _|  | |__ | || |\/| || |  | | | _||   /
// |_|_\/_/ \_\_| |___| |____|___|_|  |_|___| |_| |___|_|_\
//
const rateLimiter = new RateLimiterMongo({
  storeClient: mongoDB.connection,
  points: 100, // Number of points
  duration: 1 // Per second(s)
})

function rateLimiterMiddleware(req, res, next) {
  rateLimiter
    .consume(req.ip, 1)
    .then(() => {
      next()
    })
    .catch(() => {
      respond(res, 429, 'Too many requests')
    })
}

module.exports = {
  verifyOrigin,
  verifyCaptcha,
  verifyAuthenticationToken,
  makePermissionsMiddleware,
  passport,
  rateLimiterMiddleware
}
