const express = require('express')
const PaymentRouter = express.Router()
const config = require('../config')
const User = require('../services/user')
const { respond, handleError } = require('../lib/utils')
const {
  verifyAuthenticationToken,
  verifyCaptcha
} = require('../lib/middleware')
const stripe = require('stripe')(config.stripe.secretKey)

PaymentRouter.post('/payment', verifyAuthenticationToken, (req, res) => {
  const { profile } = req.locals.decodedToken
  // TODO: FINISH THE ABILITY TO ADD PAYMENTS
  respond(res, 400, 'there is no resource here yet')
})

// Charge card
PaymentRouter.post(
  '/charge',
  verifyAuthenticationToken,
  verifyCaptcha,
  async (req, res) => {
    const { amount, stripeToken } = req.body
    const { profile } = req.locals.decodedToken
    console.log('TOKEN', stripeToken)
    try {
      // create charge
      const charge = await stripe.charges.create({
        amount: amount,
        currency: 'usd',
        description: 'Leaderboard',
        source: stripeToken.id
      })
      console.log('CHARGE', charge)

      // TODO: add charge to user history
      respond(res, 200, 'Card Charged', charge)
    } catch (err) {
      handleError(err)
      respond(res, 400, 'Error charging card', err)
    }
  }
)

module.exports = PaymentRouter