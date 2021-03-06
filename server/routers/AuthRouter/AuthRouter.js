const express = require('express')
const { passport } = require('../../lib/middleware')
const User = require('../../services/user')
const Mailer = require('../../services/mail')
const FacebookRouter = require('./FacebookRouter')
const {
  verifyAuthenticationToken,
  verifyCaptcha
} = require('../../lib/middleware')
const {
  handleError,
  respond,
  createToken,
  setCookie
} = require('../../lib/utils')

const { cookieName } = require('../../config').utils

const AuthRouter = express.Router()

AuthRouter.use(passport.initialize())
AuthRouter.use('/facebook', FacebookRouter)

/**
 * Verifies the users token is valid, and that the route
 * they are trying to access is allowed.
 */
AuthRouter.get('/', verifyAuthenticationToken, (req, res) => {
  // if the user makes it here.... they are authenticated
  return res.send('OK')
})

/**
 * Signs up user. Posts user data from form submission to database,
 * and triggers an email confirmation message to be sent to the users
 * email.
 */
AuthRouter.post('/register', verifyCaptcha, async (req, res) => {
  try {
    //check if user exists
    let u = await User.findUser('email', req.body)
    // if not respond with NO USER
    if (u) respond(res, 409, 'User already exists')
    else {
      // otherwise create user
      let nu = await User.createUser('email', req.body)
      // create JWT token to pass back to FE
      let token = createToken(nu.toObject(), true)
      //send confirmation email
      await Mailer.sendEmailConfirmation(nu.email, token)
      // respond with success message
      respond(res, 200, 'email confirmation sent')
    }
  } catch (err) {
    handleError(err, res, 1003)
  }
})

AuthRouter.post('/login', verifyCaptcha, async (req, res) => {
  try {
    // see if user exists
    const { email, password } = req.body
    let u = await User.findUser('email', { email, username: email })
    // if there is not a user, respond accordingly
    if (!u) respond(res, 404, 'No user found')
    else {
      if (!u.password) {
        return respond(res, 300, `User signed using ${u.source}`, u)
      } else if (!u.confirmed)
        return respond(res, 409, `Email has not been confirmed`)
      let isMatch = await u.comparePassword(password)
      if (!isMatch) respond(res, 403, 'Incorrect credentials')
      else {
        let user = u.toObject()
        let token = createToken(user)
        setCookie(res, token, true)
        respond(res, 200, 'logged in', { user, token })
      }
    }
  } catch (err) {
    handleError(err, res, 1004)
  }
})

AuthRouter.post(
  '/complete-profile',
  verifyCaptcha,
  verifyAuthenticationToken,
  async (req, res) => {
    try {
      //create user
      const { source, email } = req.body
      let u = await User.findOrCreateUser(
        source,
        { ...req.body },
        { new: true }
      )
      //create new temporary token
      let token = createToken(u.toObject(), true)
      setCookie(res, token, true)
      let mailResponse = await Mailer.sendEmailConfirmation(email, token)
      respond(res, 200, 'email confirmation sent', mailResponse)
    } catch (err) {
      if (err.errors) {
        let kind = Object.keys(err.errors)[0]
        return respond(res, 409, `${kind} already exists.`)
      } else handleError(err, res, 1005)
    }
  }
)

/**
 * LOGOUT
 */
AuthRouter.get('/logout', (req, res) => {
  res.clearCookie(cookieName)
  respond(res, 200, 'Successfully logged out')
})

AuthRouter.post(
  '/email-confirmation',
  verifyAuthenticationToken,
  async (req, res) => {
    const { userInfo } = req.locals
    const { source, email } = userInfo
    let u = await User.findOrCreateUser(source, userInfo, { new: true })
    //create new temporary token
    let token = createToken(u.toObject(), true)
    setCookie(res, token, true)
    let mailResponse = await Mailer.sendEmailConfirmation(email, token)
    respond(res, 200, 'email confirmation sent', mailResponse)
  }
)

/**
 * Confirms users email, once they have been re-routed back using the
 * confirmation email link sent to their email.
 */
AuthRouter.get(
  '/email-confirmation/:token',
  verifyAuthenticationToken,
  async (req, res) => {
    try {
      let { userInfo } = req.locals
      let u = await User.findOneAndUpdate(
        userInfo.source,
        userInfo,
        { $set: { confirmed: true, permissions: ['view_profile'] } },
        { new: true }
      )
      let newToken = createToken(u.toObject())
      setCookie(res, newToken, true, false)
      res.redirect(`/u/profile`)
    } catch (err) {
      handleError(err, res, 1006)
    }
  }
)

/**
 * SENDS Password reset email
 * sends 200 response regardless if user is found, OR if email is unconfirmed
 */
AuthRouter.post('/reset-password', async (req, res) => {
  try {
    let { email } = req.body
    // find user
    let u = await User.findUser('email', { email })
    if (!u || !u.confirmed) {
      // if no user found, send NOT FOUND EMAIL
      let nur = await Mailer.sendNoUserFoundEmail(email)
      respond(res, 200, 'Email sent', nur)
    } else if (u && u.source !== 'email') {
      respond(res, 200, 'User used different login service', {
        source: u.source
      })
    } else {
      // if user and email confirmed .... create token
      let token = createToken({ email }, true)
      let nvmur = await Mailer.sendPasswordChangeEmail(email, token)
      respond(res, 200, 'Email sent', nvmur)
    }
  } catch (err) {
    handleError(err, res, 1007)
  }
})

/**
 * Verify Token and redirect to reset password page
 */
AuthRouter.get(
  '/reset-password/:token',
  verifyAuthenticationToken,
  (req, res) => {
    const { token } = req.params
    setCookie(res, token, true, false)
    res.redirect(`/c/reset-password?token=${token}`)
  }
)

/**
 * Actually does the resetting of the password
 */
AuthRouter.put(
  '/reset-password',
  verifyAuthenticationToken,
  async (req, res) => {
    try {
      const { userInfo } = req.locals
      const { password } = req.body
      let u = await User.findUser('email', { email: userInfo.email })
      if (!u) respond(res, 401, 'No user found')
      else {
        u.password = password
        let nu = await u.save()
        res.clearCookie(cookieName)
        respond(res, 200, 'Password reset')
      }
    } catch (err) {
      handleError(err, res, 1008)
    }
  }
)

module.exports = AuthRouter
