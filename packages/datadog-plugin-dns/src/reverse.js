'use strict'

const ClientPlugin = require('../../dd-trace/src/plugins/client')

class DNSReversePlugin extends ClientPlugin {
  static get id () { return 'dns' }
  static get operation () { return 'reverse' }

  start ([ip]) {
    this.startSpan('dns.reverse', {
      service: this.config.service,
      resource: ip,
      kind: 'internal',
      meta: {
        'dns.ip': ip
      }
    })
  }
}

module.exports = DNSReversePlugin
