'use strict'

const dc = require('../../../../diagnostics_channel')
const logCollector = require('./log-collector')
const { sendData } = require('../send-data')

const telemetryLog = dc.channel('datadog:telemetry:log')

let enabled = false

// TODO: set value when the env var is defined
const debug = false

/**
 * Telemetry logs api defines only ERROR, WARN and DEBUG levels:
 * - WARN level is enabled by default
 * - DEBUG level will be possible to activate with an env var or telemetry config property
 */
function isLevelEnabled (level) {
  return level && (level !== 'DEBUG' || debug)
}

function onLog (log) {
  if (isLevelEnabled(log?.level?.toUpperCase())) {
    logCollector.add(log)
  }
}

function start (config) {
  if (!config.telemetry.logCollection || enabled) return

  enabled = true

  telemetryLog.subscribe(onLog)
}

function stop () {
  enabled = false

  if (telemetryLog.hasSubscribers) {
    telemetryLog.unsubscribe(onLog)
  }
}

function send (config, application, host) {
  if (!enabled) return

  const logs = logCollector.drain()
  if (logs) {
    sendData(config, application, host, 'logs', logs)
  }
}

module.exports = {
  start,
  stop,
  send
}
