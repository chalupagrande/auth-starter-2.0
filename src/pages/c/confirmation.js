import React, { useState } from 'react'
import Link from 'next/link'
import { toast } from 'react-toastify'
import { connect } from 'react-redux'
import { setLoading, handleError } from '~/lib/utils'
import axios from 'axios'

function Confirmation(props) {
  const [sent, setSent] = useState(false)
  async function handleClick() {
    const { dispatch } = props
    setSent(true)

    try {
      setLoading(true, dispatch)
      let r = await axios({
        method: 'post',
        url: '/api/auth/email-confirmation'
      })
      if (r) toast.success('Email resent.')
    } catch (err) {
      if (err && err.response && err.response.data) {
        toast.error(err.response.data.msg)
      } else {
        toast.error('Oops. Something went wrong')
        handleError(err)
      }
    } finally {
      setLoading(false, dispatch)
    }
  }

  let date = new Date()
  return (
    <div className="page confirmation">
      <h1>Confirmation Email Sent</h1>
      <p>
        A confirmation email was sent to <strong>{props.email}</strong>. In
        order to complete the registration process, please check your email and
        click the provided link. You have approximately{' '}
        <strong>10 minutes from now</strong> ({date.toLocaleTimeString()} on{' '}
        {date.toLocaleDateString()}) to complete this action. Should you fail to
        confirm your email, you will have to start the registration process
        over. We recommend not closing this tab until you have successfully
        confirmed your email.
      </p>
      <Link href="/">
        <button>Return Home</button>
      </Link>
      <h2>Didn't receive an email?</h2>
      <p>
        First, check your spam folder, occasionally it will get caught in a spam
        filter. If that doesn't work, confirm that{' '}
        <strong>{props.email}</strong> is the correct email. If neither of those
        seem to be the problem, click the link below to request another email.
      </p>
      <button onClick={handleClick} disabled={sent}>
        Request Confirmation Email
      </button>
      <hr />
      <h3>Why do you need my email?</h3>
      <p>
        Providing us with your email allows us to confirm account management
        actions such as changing passwords, making payments or linking social
        media profiles. It ensures your account will not be compromised and that
        you maintain full control of your account.
      </p>
    </div>
  )
}

Confirmation.getInitialProps = ({ query }) => {
  return { email: query.email }
}

const mapStateToProps = (state, ownProps) => ({
  email: ownProps.email || state.email
})

export default connect(mapStateToProps)(Confirmation)
