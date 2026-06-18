import Store from 'electron-store'

interface Schema {
  apiKey: string
}

const store = new Store<Schema>({
  name: 'range-combos-config',
  defaults: { apiKey: '' }
})

export function getApiKey(): string {
  return store.get('apiKey', '')
}

export function setApiKey(key: string): void {
  store.set('apiKey', key.trim())
}

export function hasApiKey(): boolean {
  return getApiKey().length > 0
}
