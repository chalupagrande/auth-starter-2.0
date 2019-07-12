const express = require('express')
const MeRouter = express.Router()
const User = require('../services/user')
const Mailer = require('../services/mail')
const { cookieName } = require('../config').utils

const {
  verifyAuthenticationToken,
  makePermissionsMiddleware
} = require('../lib/middleware')
const { handleError, respond, createToken, setCookie } = require('../lib/utils')

/**
 * Get profile information
 */
MeRouter.get(
  '/',
  verifyAuthenticationToken,
  makePermissionsMiddleware(['view_profile']),
  (req, res) => {
    const { source } = req.locals.decodedToken
    User.findUser(source, req.locals.decodedToken)
      .then(user => {
        if (!user) respond(res, 403, 'Not authorized')
        else respond(res, 200, 'User Found', user)
      })
      .catch(err => handleError(err, res, 1001))
  }
)

/**
 * Add profile information
 */
MeRouter.post('/', verifyAuthenticationToken, (req, res) => {
  const { toAdd } = req.body
  const { source } = req.locals.decodedToken
  User.findOneAndUpdate(
    source,
    req.locals.decodedToken,
    { $inc: { value: toAdd } },
    { new: true }
  )
    .then(user => {
      if (!user) respond(res, 403, 'Not authorized')
      else {
        const { value } = user
        respond(res, 200, 'Value updated.', { value })
      }
    })
    .catch(err => handleError(err, res, 1001))
})

/**
 * Delete Profile
 */
MeRouter.delete('/', verifyAuthenticationToken, async (req, res) => {
  const profile = req.locals.decodedToken
  try {
    let deleteResponse = await User.deleteUser(profile)
    res.clearCookie(cookieName)
    respond(res, 200, 'user deleted', deleteResponse)
  } catch (err) {
    handleError(err)
  }
})

/**
 * Changes email
 */
MeRouter.post('/email', verifyAuthenticationToken, async (req, res) => {
  const {
    decodedToken,
    decodedToken: { source }
  } = req.locals
  const { email, password } = req.body
  // update email
  try {
    if (source === 'email') {
      let isValid = await User.checkPassword(password, decodedToken)
      if (!isValid) return respond(res, 400, 'Incorrect password')
    }
    let user = await User.findOneAndUpdate(
      source,
      req.locals.decodedToken,
      { $set: { email: email, confirmed: false } },
      { new: true }
    )
    let token = createToken(user.toObject(), true)
    setCookie(res, token, true)
    let mailResponse = await Mailer.sendEmailConfirmation(user.email, token)
    respond(res, 200, 'email confirmation sent', mailResponse)
  } catch (err) {
    if (err.errors) {
      let kind = Object.keys(err.errors)[0]
      return respond(res, 409, `${kind} already exists.`)
    } else handleError(err, res, 1005)
  }
})

module.exports = MeRouter
