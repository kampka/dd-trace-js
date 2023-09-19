'use strict'

const telemetryMetrics = require('../../../telemetry/metrics')
const { Verbosity, getVerbosity } = require('./verbosity')
const { initRequestNamespace, finalizeRequestNamespace, globalNamespace } = require('./namespaces')

function isIastMetricsEnabled (metrics) {
  // TODO: let DD_TELEMETRY_METRICS_ENABLED as undefined in config.js to avoid read here the env property
  return process.env.DD_TELEMETRY_METRICS_ENABLED !== undefined ? metrics : true
}

class Telemetry {
  configure (config, verbosity) {
    const telemetryAndMetricsEnabled = config?.telemetry?.enabled &&
      isIastMetricsEnabled(config.telemetry.metrics)

    this.verbosity = telemetryAndMetricsEnabled ? getVerbosity(verbosity) : Verbosity.OFF
    this.enabled = this.verbosity !== Verbosity.OFF

    if (this.enabled) {
      telemetryMetrics.manager.set('iast', globalNamespace)
    }
  }

  stop () {
    this.enabled = false
    telemetryMetrics.manager.delete('iast')
  }

  isEnabled () {
    return this.enabled
  }

  onRequestStart (context) {
    if (this.isEnabled()) {
      initRequestNamespace(context)
    }
  }

  onRequestEnd (context, rootSpan) {
    if (this.isEnabled()) {
      finalizeRequestNamespace(context, rootSpan)
    }
  }
}

module.exports = new Telemetry()
