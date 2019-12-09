import React, { useContext } from 'react'
import { RecaptchaContext } from '~/store'
import axios from 'axios'
import Link from 'next/link'
import { connect } from 'react-redux'
import { redirect, handleToken, setLoading } from '~/lib/utils'
import { Button, Form, Icon, Input, Modal, notification } from 'antd'
import { defaultFormItemLayout } from '~/components/Layout/antLayouts'
import './c.scss'

function EmailLogin(props) {
  /**
   * @param {Array} inputs : Array of inputs to clear. The first of which will receive focus.
   */
  const recaptcha = useContext(RecaptchaContext)
  const {
    dispatch,
    query,
    form,
    form: { getFieldDecorator }
  } = props

  let loginAttemptSource = query['login-attempt']
  let loginAttemptUsername = query['username']

  async function handleSubmit(e) {
    e.preventDefault()

    //async
    try {
      let data, captchaToken
      setLoading(true, dispatch)
      data = await form.validateFields()
      captchaToken = await recaptcha.execute({ action: 'login' })
      let r = await axios({
        method: 'post',
        url: `/api/auth/login`,
        data: { ...data, recaptcha: captchaToken }
      })

      if (r.data && r.data.data && r.data.data.token)
        handleToken(r.data.data.token, dispatch)

      redirect('/u/profile')
    } catch (err) {
      console.log(err)
      // if user already has an account with a different provider, redirect
      if (err && err.response && err.response.status === 300) {
        redirect(`/api/auth/${err.response.data.data.source}/login`)
        // otherwise raise error message
      } else {
        const opts = {
          message: 'Error',
          description: 'Oops! Something went wrong.'
        }
        if (err && err.response && err.response.data) {
          opts.description = err.response.data.msg
          notification.error(opts)
        }
      }
    } finally {
      setLoading(false, dispatch)
    }
  }

  return (
    <div className="login page">
      <h1>Login</h1>
      <Modal
        visible={!!loginAttemptSource}
        title="No account found"
        onOk={() => redirect(`/api/auth/${loginAttemptSource}/register`)}
        onCancel={() => redirect('/c/login')}
      >
        <p>
          Looks like you don't have an account yet. We found an{' '}
          <strong>{loginAttemptSource}</strong> account with the username{' '}
          <strong>{loginAttemptUsername}</strong>. Would you like to use this to
          create an account?
        </p>
      </Modal>
      <Form className="form" {...defaultFormItemLayout} onSubmit={handleSubmit}>
        <Form.Item label="Email/Username">
          {getFieldDecorator('email', {
            rules: [
              {
                required: true,
                message: 'Please input username or email'
              }
            ]
          })(<Input />)}
        </Form.Item>
        <Form.Item label="Password">
          {getFieldDecorator('password', {
            rules: [
              {
                required: true,
                message: 'Please input your password!'
              }
            ]
          })(<Input.Password />)}
        </Form.Item>
        <Form.Item>
          <Link href="/c/reset-password">
            <a className="small italic link">Forgot your password?</a>
          </Link>
        </Form.Item>
        <Button type="primary" htmlType="submit">
          Submit
        </Button>
      </Form>
      <Link href="/c/register">
        <a className="small italic link">Need an account? Register here.</a>
      </Link>
      <hr />
      <ul>
        <li>
          <Button
            type="link"
            onClick={() => setLoading(true, dispatch)}
            href="/api/auth/facebook/login"
          >
            <Icon type="facebook" />
            Login with Facebook
          </Button>
        </li>
        <li>
          <Button
            type="link"
            onClick={() => setLoading(true, dispatch)}
            href="/api/auth/instagram/login"
          >
            <Icon type="instagram" />
            Login with Instagram
          </Button>
        </li>
      </ul>
    </div>
  )
}

EmailLogin.getInitialProps = async ({ query }) => ({ query })

const mapStateToProps = (state, ownProps) => ({
  profile: state.profile,
  query: ownProps.query
})

const WrappedLoginForm = Form.create({ name: 'login' })(EmailLogin)
export default connect(mapStateToProps)(WrappedLoginForm)
