export class BaseProvider {
  constructor(name) {
    this.name = name
  }

  async complete() {
    throw new Error('complete() not implemented')
  }

  async healthCheck() {
    return { online: false, reason: 'Not implemented' }
  }

  async listModels() {
    return []
  }
}
