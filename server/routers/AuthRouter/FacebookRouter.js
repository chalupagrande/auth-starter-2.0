const express = require('express')
const FacebookRouter = express.Router()
const { passport } = require('../../lib/middleware')
const FacebookStrategy = require('passport-facebook')
const um = require('../../database/userManagement')
const { handleError, respondWithToken } = require('../../lib/utils')
const serverURL = process.env.SERVER_URL
const clientURL = process.env.CLIENT_URL

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: `${serverURL}/api/auth/facebook/callback`
    },
    (accessToken, refreshToken, profile, done) => {
      //gets user from spotify and passes it to /spotify/callback
      let obj = { accessToken, refreshToken, profile }
      return done(null, obj)
    }
  )
)

FacebookRouter.get(
  '/',
  passport.authenticate('facebook', {
    failureRedirect: `${clientURL}/404`
  })
)

FacebookRouter.get(
  '/callback',
  passport.authenticate('facebook', {
    failureRedirect: '/c',
    session: false,
    scope: ['email', 'user_birthday']
  }),
  (req, res) => {
    const { profile } = req.user
    um.findOrCreateUser('facebook', profile, res)
      .then(user => respondWithToken(user, res, true))
      .catch(err => handleError(err, res, 1003))
  }
)

module.exports = FacebookRouter