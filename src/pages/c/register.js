import React from 'react'
import axios from 'axios'
import Link from 'next/link'
import countries from '~/assets/countries'
import { redirect, setLoading, handleError } from '~/lib/utils'
import { Button, Form, Icon, Input, notification, Select, Switch } from 'antd'
import './c.scss'

// Country Options
const { Option } = Select
const countryOptions = countries.map(c => (
  <Option key={c.code} value={c.code}>
    {c.name}
  </Option>
))

class RegistrationForm extends React.Component {
  constructor(props) {
    super(props)

    this.handleSubmit = this.handleSubmit.bind(this)
    this.validatePassword = this.validatePassword.bind(this)
    this.validateConfirmationPassword = this.validateConfirmationPassword.bind(
      this
    )
    this.validateUsername = this.validateUsername.bind(this)
    this.setLoading = this.setLoading.bind(this)
  }

  setLoading(isLoading) {
    setLoading(isLoading, this.props.dispatch)
  }

  async handleSubmit(e) {
    e.preventDefault()
    const { dispatch, form, recaptcha } = this.props
    //async
    let data, captchaToken
    try {
      this.setLoading(true, dispatch)
      data = await form.validateFields()
      this.setLoading(true)
      captchaToken = await recaptcha.execute({ action: 'register' })
    } catch (err) {
      handleError(err)
      return
    }
    // send request
    let r = await axios({
      method: 'post',
      url: `/api/auth/register`,
      data: { ...data, recaptcha: captchaToken }
    })
      .then(r => {
        notification.open({
          message: 'Email Confirmation sent',
          description: `An email was sent to ${
            data.email
          }. Check your email to complete the registration process.`,
          duration: 0
        })
        redirect('/')
      })
      .catch(err => {
        const opts = {
          message: 'Error',
          description: 'Oops! Something went wrong.'
        }
        if (err && err.response && err.response.data)
          opts.description = err.response.data.msg
        notification.error(opts)
        form.resetFields()
      })
      .finally(() => this.setLoading(false, dispatch))
  } // end handleSubmit

  validatePassword(rule, value, cb) {
    if (!value || value.length < 8) cb('Password must be 8 characters')
    else cb()
  }

  validateConfirmationPassword(rule, value, cb) {
    const form = this.props.form
    const password = form.getFieldValue('password')
    if (!value || password !== value) cb('Passwords do not match')
    else cb()
  }
  validateUsername(rule, value, cb) {
    if (!value || value.length < 3) cb('Username is too short')
    // TODO: add condition that checks database for existing usernames
    else cb()
  }

  render() {
    const { getFieldDecorator } = this.props.form
    const formItemLayout = {
      labelCol: {
        xs: { span: 24 },
        sm: { span: 8 }
      },
      wrapperCol: {
        xs: { span: 24 },
        sm: { span: 16 }
      }
    }
    return (
      <div className="register page center">
        <h1>Register</h1>
        <Form className="form" {...formItemLayout} onSubmit={this.handleSubmit}>
          <Form.Item label="Email">
            {getFieldDecorator('email', {
              rules: [
                {
                  required: true,
                  type: 'email',
                  message: 'The input is not valid email.'
                }
              ]
            })(<Input />)}
          </Form.Item>
          <Form.Item label="Username" hasFeedback>
            {getFieldDecorator('username', {
              rules: [
                {
                  required: true,
                  message: 'Please input your username.'
                },
                {
                  validator: this.validateUsername
                }
              ]
            })(<Input />)}
          </Form.Item>
          <Form.Item label="Country">
            {getFieldDecorator('country ', {
              rules: [
                {
                  required: true,
                  message: 'Please select a country'
                }
              ]
            })(
              <Select
                showSearch
                placeholder="Select a Country"
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.props.children
                    .toLowerCase()
                    .indexOf(input.toLowerCase()) >= 0
                }
              >
                {countryOptions}
              </Select>
            )}
          </Form.Item>
          <Form.Item label="Password" hasFeedback>
            {getFieldDecorator('password', {
              rules: [
                {
                  required: true,
                  validator: this.validatePassword
                }
              ]
            })(<Input.Password />)}
          </Form.Item>
          <Form.Item label="Confirm Password" hasFeedback>
            {getFieldDecorator('confirm', {
              rules: [
                {
                  required: true,
                  validator: this.validateConfirmationPassword,
                  message: 'Passwords do not match'
                }
              ]
            })(<Input.Password />)}
          </Form.Item>
          <Form.Item label="Agreements">
            {getFieldDecorator('agreement', {
              required: true,
              valuePropName: 'checked',
              initialValue: false
            })(
              <Switch
                checkedChildren={<Icon type="check" />}
                unCheckedChildren={<Icon type="close" />}
              />
            )}
            <p className="small">
              By checking the box above you agree to the{' '}
              <Link href="/legal/terms">Terms and Conditions</Link> as well as
              the policies outlined in our{' '}
              <Link href="/legal/privacy">Privacy Policy</Link>
            </p>
          </Form.Item>
          <Button type="primary" htmlType="submit">
            Submit
          </Button>
        </Form>
        <hr />
        <ul>
          <li>
            <Button type="link" href="/api/auth/facebook">
              <Icon type="facebook" />
              Login with Facebook
            </Button>
          </li>
          <li>
            <Button type="link" href="/api/auth/instagram">
              <Icon type="instagram" />
              Login with Instagram
            </Button>
          </li>
        </ul>
        <Link href="/c/login">
          <a className="small italic link">Already a member? Login here.</a>
        </Link>
      </div>
    )
  }
}

const WrappedRegistrationForm = Form.create({ name: 'register' })(
  RegistrationForm
)
export default WrappedRegistrationForm
