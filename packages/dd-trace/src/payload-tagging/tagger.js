const { PAYLOAD_TAGGING_PREFIX, PAYLOAD_TAGGING_DEPTH, PAYLOAD_TAGGING_MAX_TAGS } = require('../constants')

const redactedKeys = [
  'authorization', 'x-authorization', 'password', 'token'
]
const truncated = 'truncated'
const redacted = 'redacted'

function escapeKey (key) {
  return key.replaceAll('.', '\\.')
}

function isJSONContentType (contentType) {
  return contentType && typeof contentType === 'string' && contentType.slice(-4) === 'json'
}

function tagsFromObject (object, filter) {
  let tagCount = 0
  const result = {}

  function tagRec (prefix, object, filterObj = filter.filterObj, depth = 0, indent) {
    if (tagCount >= PAYLOAD_TAGGING_MAX_TAGS) {
      result['_dd.payload_tags_trimmed'] = true
      return
    }

    if (depth >= PAYLOAD_TAGGING_DEPTH && typeof object === 'object') {
      result[prefix] = truncated
      tagCount += 1
      return
    } else {
      depth += 1
    }

    if (object === null) {
      // TODO check which tracers strip null/None/... values
      // Probably all of them
      // Limitation to document for users
      result[prefix] = 'null'
      tagCount += 1
      return
    }

    if (typeof object === 'number' || typeof object === 'boolean') {
      result[prefix] = object.toString()
      tagCount += 1
      return
    }

    if (typeof object === 'string') {
      const lastKey = prefix.split('.').pop()
      result[prefix] = redactedKeys.includes(lastKey) ? redacted : object.substring(0, 5000)
      tagCount += 1
      return
    }

    if (typeof object === 'object') {
      for (const [key, value] of Object.entries(object)) {
        if (!filter.canTag(key, filterObj)) continue
        const nextFilter = filterObj === undefined ? filterObj : filterObj[key]
        tagRec(`${prefix}.${escapeKey(key)}`, value, nextFilter, depth)
      }
    }
  }
  tagRec(PAYLOAD_TAGGING_PREFIX, object)
  return result
}

function toTags (jsonString, contentType, filter) {
  console.log(`computing tags for ${contentType} with filter ${filter}`)
  console.log(`json ctype: ${isJSONContentType(contentType)}`)
  if (!isJSONContentType(contentType)) {
    return {}
  }
  let object
  try {
    object = JSON.parse(jsonString)
  } catch (err) {
    return {}
  }

  return tagsFromObject(object, filter)
}

module.exports = toTags
