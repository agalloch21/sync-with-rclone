import EventEmitter from 'node:events'

const configEventEmitter = new EventEmitter()

export function registerConfigUpdateListener(listener) {
  configEventEmitter.on('update', listener)
}

export function unregisterConfigUpdateListener(listener) {
  configEventEmitter.off('update', listener)
}

export function notifyConfigUpdate() {
  configEventEmitter.emit('update')
}
