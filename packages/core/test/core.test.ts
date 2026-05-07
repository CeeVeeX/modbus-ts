import { describe, expect, it } from 'vitest'
import { ConnectionClosedError, ProtocolError, TimeoutError, TransportError } from '../src/index'

describe('core errors', () => {
  it('constructs timeout error', () => {
    const err = new TimeoutError('t')
    expect(err.name).toBe('TimeoutError')
    expect(err.message).toBe('t')
  })

  it('constructs connection closed error', () => {
    const err = new ConnectionClosedError('c')
    expect(err.name).toBe('ConnectionClosedError')
    expect(err.message).toBe('c')
  })

  it('constructs protocol error', () => {
    const err = new ProtocolError('p')
    expect(err.name).toBe('ProtocolError')
    expect(err.message).toBe('p')
  })

  it('constructs transport error', () => {
    const err = new TransportError('x')
    expect(err.name).toBe('TransportError')
    expect(err.message).toBe('x')
  })
})
