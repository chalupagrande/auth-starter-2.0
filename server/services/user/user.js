const UserModel = require('./UserModel')
const ObjectID = require('mongoose').Types.ObjectId
/**
 * Returns a user or null if not user is found
 * @param {string} source - source of login
 * @param {object} profile - profile
 * @param {object} res - express response object
 */

async function findUser(source, profile) {
  let query = determineQueryFromSource(source, profile)
  return await UserModel.findOne(query)
}

/**
 * Returns all users
 * @param {string} source - source of login
 * @param {object} profile - profile
 * @param {object} res - express response object
 */
async function getUsers() {
  return await UserModel.find({}).sort({ value: -1 })
}
/**
 * Finds or creates user.
 * @param {string} source - source of profile
 * @param {object} profile - user profile object to create *MUST HAVE SOURCE*
 * @param {object} res - express response object
 */
async function findOrCreateUser(source, profile) {
  let user = await findUser(source, { ...profile, source })
  if (user) return user
  else {
    let newProf = createDatabasePayload(source, profile)
    return await UserModel.create(newProf)
  }
}

/**
 *
 * @param {string} source - source of profule
 * @param {object} profile - user profile object
 */
async function createUser(source, profile) {
  let newProf = createDatabasePayload(source, profile)
  return await UserModel.create(newProf)
}

/**
 *
 * @param {string} source - source of user account
 * @param {object} profile - profile data to search for
 * @param {object} update - object to update user with
 * @param {object} opts - options object to pass query
 * @param {object} res - express response object
 */
async function findOneAndUpdate(source, profile, update, opts) {
  let query = determineQueryFromSource(source, profile)
  return await UserModel.findOneAndUpdate(query, update, opts)
}

/**
 * Determines the correct Database query based on the login strategy
 * @param {string} source - source string (instagram, facebook, email)
 * @param {object} p - know attributes about the user
 */
function determineQueryFromSource(source, p) {
  let query = {}
  try {
    query = { _id: new ObjectID(p.id.toString()) }
  } catch (err) {
    if (p.id) query[`${source}.id`] = p.id
    else query.email = p.email
  }
  return query
}

/**
 * Determines the correct Database payload to be sent based on user login strategy
 * @param {string} source - source string (instagram, facebook, email)
 * @param {object} user - know attributes about the user
 */
function determinePayloadFromSource(source, user) {
  let { value, username, permissions, email, _id } = user
  let payload = { value, username, source, permissions, email, id: _id }
  return payload
}

function createDatabasePayload(source, p) {
  let r = loginMapper(source, p)
  return { ...r, password: p.password }
}
/**
 * Maps disperate responses from login sources to unified object model for database.
 * @param {string} source - source string (instagram, facebook, email)
 * @param {object} p - known attributes about a user
 */
function loginMapper(source, p) {
  let result = {
    id: p.id,
    source: source,
    email: p.email,
    name: p.name,
    username: p.username || p.displayName || p.name,
    photo: p.photo || (p.photos && p.photos[0].value)
  }
  if (source === 'instagram') {
    result.instagram = {
      id: p.id,
      bio: p.bio,
      website: p.website,
      username: p.username || p.displayName,
      displayName: p.displayName
    }
  }
  if (source === 'facebook') {
    result.email = p.email || p.emails[0].value
    result.name = p.name || `${p.name.givenName} ${p.name.familyName}`
    result.facebook = {
      id: p.id,
      photo: p.photo || (p.photos && p.photos[0].value)
    }
  }
  return result
}

module.exports = {
  findUser,
  createUser,
  getUsers,
  findOrCreateUser,
  findOneAndUpdate,
  determinePayloadFromSource,
  determineQueryFromSource,
  loginMapper
}
