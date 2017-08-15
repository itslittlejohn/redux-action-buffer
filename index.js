var BUFFERED_ACTION_RETURN = 'redux-action-buffer: buffered action'

var setImmediate = typeof global !== 'undefined' &&
  typeof global.setImmediate !== 'undefined'
  ? global.setImmediate
  : setTimeout

module.exports = function bufferActions(options, cb) {
  var active = true
  var queue = []
  var passthrough = (options && options.passthrough) || []
  var breaker = typeof options === 'object' ? options.breaker : options

  var breakerType = typeof breaker

  if (breakerType === 'string' || breakerType === 'symbol') {
    var actionType = breaker
    breaker = function(action) {
      if (action.type === actionType) return true
      else return false
    }
  }

  return function(store) {
    return function(next) {
      return function(action) {
        var result
        if (passthrough.includes(action.type)) {
          result = next(action)
        }

        if (!active) return result || next(action)
        if (breaker(action)) {
          active = false
          setImmediate(function() {
            var queueResults = []
            queue.forEach(function(queuedAction) {
              var queuedActionResult = next(queuedAction)
              queueResults.push(queuedActionResult)
            })
            cb &&
              cb(null, {
                results: queueResults,
                queue: queue
              })
          })
          return result || next(action)
        } else {
          // @TODO consider returning a dummy action, or maybe null for cleanliness
          if (result) {
            return result
          } else {
            queue.push(action)
            return BUFFERED_ACTION_RETURN
          }
        }
      }
    }
  }
}
