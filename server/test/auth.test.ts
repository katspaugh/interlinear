import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isAdminToken } from '../src/auth.js'

test('isAdminToken is open when no token is configured', () => {
  delete process.env.ADMIN_TOKEN
  assert.equal(isAdminToken(undefined), true)
  assert.equal(isAdminToken('anything'), true)
})

test('isAdminToken requires an exact match when configured', () => {
  process.env.ADMIN_TOKEN = 'secret-passphrase'
  assert.equal(isAdminToken(undefined), false)
  assert.equal(isAdminToken(''), false)
  assert.equal(isAdminToken('wrong'), false)
  assert.equal(isAdminToken('secret-passphrase '), false)
  assert.equal(isAdminToken('secret-passphrase'), true)
  delete process.env.ADMIN_TOKEN
})
