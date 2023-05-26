'use strict'

const ProducerPlugin = require('../../dd-trace/src/plugins/producer')
const Hash = require('./hash')

const ENTRY_PARENT_HASH = Buffer.from('0000000000000000', 'hex')

class KafkajsProducerPlugin extends ProducerPlugin {
  static get id () { return 'kafkajs' }
  static get operation () { return 'produce' }

  start ({ topic, messages }) {
    const env = this.tracer._env
    const service = this.tracer._service

    let pathwayCtx
    if (this.config.dsmEnabled) {
      let active
      if (this.activeSpan.name == 'kafka.consume') {
        active = this.activeSpan.name
      }
      let parentHash
      let originTimestamp
      let prevTimestamp
      const currentTimestamp = Date.now()
      const checkpointString = getCheckpointString(service, env, topic)
      if (active) {
        console.log('ACTIVE SPAN', active)
        const rootSpan = active.context()._trace.started[0];
        [ parentHash, originTimestamp, prevTimestamp ] =
        Hash.decodePathwayContext(rootSpan._spanContext._tags.metrics['dd-pathway-ctx'])
      } else {
        parentHash = ENTRY_PARENT_HASH
        originTimestamp = currentTimestamp
        prevTimestamp = currentTimestamp
      }

      const pathwayHash = Hash.getPathwayHash(checkpointString, parentHash)

      const edgeLatency = currentTimestamp - prevTimestamp
      const pathwayLatency = currentTimestamp - originTimestamp
      pathwayCtx = Hash.encodePathwayContext(pathwayHash, originTimestamp, currentTimestamp)

      const checkpoint = {
        currentTimestamp: currentTimestamp,
        metrics: {
          'parent_hash': parentHash,
          'edge_tags': ['direction:out', `topic:${topic}`, 'type:kafka'],
          'dd-pathway-ctx': pathwayCtx,
          'edge_latency': edgeLatency,
          'pathway_latency': pathwayLatency
        }
      }

      this.config.latencyStatsProcessor.recordCheckpoint(checkpoint)
    }

    const span = this.startSpan('kafka.produce', {
      service: this.config.service || `${this.tracer._service}-kafka`,
      resource: topic,
      kind: 'producer',
      meta: {
        'component': 'kafkajs',
        'kafka.topic': topic
      },
      metrics: {
        'kafka.batch_size': messages.length
      }
    })

    for (const message of messages) {
      if (typeof message === 'object') {
        if (this.config.dsmEnabled) message.headers['dd-pathway-ctx'] = pathwayCtx
        this.tracer.inject(span, 'text_map', message.headers)
      }
    }
  }
}

function getCheckpointString (service, env, topic) {
  return `${service}${env}direction:outtopic:${topic}type:kafka`
}

module.exports = KafkajsProducerPlugin
