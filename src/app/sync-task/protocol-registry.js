export const REMOTE_PROTOCOLS = [
  {
    type: 'sftp',
    label: 'SFTP',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'host', label: 'Host', type: 'text', required: true },
      { name: 'port', label: 'Port', type: 'number', required: true, defaultValue: 22 },
      { name: 'user', label: 'Username', type: 'text', required: true },
      { name: 'pass', label: 'Password', type: 'password', required: true },
    ],
  },
  {
    type: 'ftp',
    label: 'FTP',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'host', label: 'Host', type: 'text', required: true },
      { name: 'port', label: 'Port', type: 'number', required: true, defaultValue: 21 },
      { name: 'user', label: 'Username', type: 'text', required: true },
      { name: 'pass', label: 'Password', type: 'password', required: true },
    ],
  },
]

const PROTOCOL_BY_TYPE = new Map(REMOTE_PROTOCOLS.map(protocol => [protocol.type, protocol]))

export function getProtocolDefinition(type) {
  return PROTOCOL_BY_TYPE.get(type) || null
}

export function getDefaultProtocolType() {
  return REMOTE_PROTOCOLS[0].type
}

export function createDefaultProtocolForm(type = getDefaultProtocolType()) {
  const protocol = getProtocolDefinition(type)
  if (!protocol)
    return {}

  return Object.fromEntries(protocol.fields.map((field) => {
    const value = Object.hasOwn(field, 'defaultValue') ? field.defaultValue : ''
    return [field.name, value]
  }))
}

export function createProtocolFormFromRemote(type = getDefaultProtocolType(), remote = {}) {
  const defaults = createDefaultProtocolForm(type)

  return Object.fromEntries(Object.entries(defaults).map(([fieldName, defaultValue]) => {
    if (fieldName === 'name')
      return [fieldName, remote.name || defaultValue]
    if (fieldName === 'pass')
      return [fieldName, '']

    return [fieldName, Object.hasOwn(remote, fieldName) ? remote[fieldName] : defaultValue]
  }))
}

export function createProtocolFormForSwitch(type = getDefaultProtocolType(), currentForm = {}) {
  const protocol = getProtocolDefinition(type)
  if (!protocol)
    return {}

  return Object.fromEntries(protocol.fields.map((field) => {
    if (Object.hasOwn(field, 'defaultValue'))
      return [field.name, field.defaultValue]

    const currentValue = currentForm?.[field.name]
    return [field.name, currentValue ?? '']
  }))
}

export function validateProtocolForm(type, form) {
  const protocol = getProtocolDefinition(type)
  if (!protocol)
    return { type: 'Unsupported protocol.' }

  const errors = {}

  for (const field of protocol.fields) {
    const rawValue = form?.[field.name]
    const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue

    if (field.required && (value === '' || value === null || value === undefined)) {
      errors[field.name] = `${field.label} is required.`
      continue
    }

    if (field.type === 'number') {
      const parsed = Number(value)
      if (!Number.isInteger(parsed) || parsed <= 0)
        errors[field.name] = `${field.label} must be a positive number.`
    }
  }

  return errors
}
