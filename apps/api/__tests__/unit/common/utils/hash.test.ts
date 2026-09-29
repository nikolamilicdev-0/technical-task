import { describe, expect, it } from 'vitest'

import { sha256Hex } from '../../../../src/common/utils/hash.js'

describe('sha256Hex', () => {
  it('matches the published SHA-256 test vector', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    )
  })

  // Expected value from Postgres: encode(sha256(convert_to(E'é', 'UTF8')), 'hex').
  it("hashes UTF-8 bytes the way the documents trigger's SQL does", () => {
    expect(sha256Hex('é')).toBe('4a99557e4033c3539de2eb65472017cad5f9557f7a0625a09f1c3f6e2ba69c4c')
  })

  it('does not normalize Unicode: composed and decomposed text differ', () => {
    expect(sha256Hex('é')).not.toBe(sha256Hex('é'))
  })
})
