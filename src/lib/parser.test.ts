import { describe, expect, it } from 'vitest'
import { annotateRows, enKey, hasJapanese, parseCards, splitInline, stripBullet } from './parser'

const pairs = (text: string) => parseCards(text).map(({ en, ja }) => ({ en, ja }))

describe('hasJapanese', () => {
  it('英文のみなら false', () => {
    expect(hasJapanese('I have been waiting for you.')).toBe(false)
  })

  it('かな・漢字・カタカナを検出する', () => {
    expect(hasJapanese('待っていました')).toBe(true)
    expect(hasJapanese('コーヒー')).toBe(true)
    expect(hasJapanese('東京')).toBe(true)
  })

  it('箇条書きの中黒だけでは日本語とみなさない', () => {
    expect(hasJapanese('・')).toBe(false)
  })
})

describe('stripBullet', () => {
  it.each([
    ['- I am fine.', 'I am fine.'],
    ['・私は元気です。', '私は元気です。'],
    ['* Take it easy.', 'Take it easy.'],
    ['1. Take it easy.', 'Take it easy.'],
    ['12) Take it easy.', 'Take it easy.'],
    ['（3）Take it easy.', 'Take it easy.'],
    ['① Take it easy.', 'Take it easy.'],
    ['１．気楽にいこう。', '気楽にいこう。'],
    ['  >  Take it easy.', 'Take it easy.'],
  ])('%s から記号を落とす', (input, expected) => {
    expect(stripBullet(input)).toBe(expected)
  })

  it('英文中のピリオドは壊さない', () => {
    expect(stripBullet('I. Robot is a book.')).toBe('I. Robot is a book.')
  })
})

describe('splitInline', () => {
  it('タブ区切りを分ける', () => {
    expect(splitInline('I am hungry.\tお腹が空いた。')).toEqual({
      en: 'I am hungry.',
      ja: 'お腹が空いた。',
    })
  })

  it.each(['|', '｜', '=', '＝', '：', '→', '⇒', '／'])('%s 区切りを分ける', (sep) => {
    expect(splitInline(`I am hungry.${sep}お腹が空いた。`)).toEqual({
      en: 'I am hungry.',
      ja: 'お腹が空いた。',
    })
  })

  it('日本語が先でも英日を正しく割り当てる', () => {
    expect(splitInline('お腹が空いた。 | I am hungry.')).toEqual({
      en: 'I am hungry.',
      ja: 'お腹が空いた。',
    })
  })

  it('全角スペース区切りを分ける', () => {
    expect(splitInline('I am hungry.　お腹が空いた。')).toEqual({
      en: 'I am hungry.',
      ja: 'お腹が空いた。',
    })
  })

  it('区切り記号がなくても文字種の境目で分ける', () => {
    expect(splitInline('I am hungry. お腹が空いた。')).toEqual({
      en: 'I am hungry.',
      ja: 'お腹が空いた。',
    })
  })

  it('半角コロンの名残を英文側に残さない', () => {
    expect(splitInline('I am hungry.: お腹が空いた。')).toEqual({
      en: 'I am hungry.',
      ja: 'お腹が空いた。',
    })
  })

  it('日本語訳に英単語が混ざっていても分けられる', () => {
    expect(splitInline('I took the TOEIC. 私はTOEICを受けた。')).toEqual({
      en: 'I took the TOEIC.',
      ja: '私はTOEICを受けた。',
    })
  })

  it('英文だけの行は分けない', () => {
    expect(splitInline('It is a piece of cake.')).toBeNull()
  })

  it('日本語だけの行は分けない', () => {
    expect(splitInline('彼は言った：「行くよ」')).toBeNull()
  })
})

describe('parseCards', () => {
  it('2 行 1 組（英語が先）を組にする', () => {
    const text = `I have been thinking about it.
そのことをずっと考えていました。
Let me get back to you.
折り返しご連絡します。`
    expect(pairs(text)).toEqual([
      { en: 'I have been thinking about it.', ja: 'そのことをずっと考えていました。' },
      { en: 'Let me get back to you.', ja: '折り返しご連絡します。' },
    ])
  })

  it('2 行 1 組（日本語が先）でも組にする', () => {
    const text = `そのことをずっと考えていました。
I have been thinking about it.`
    expect(pairs(text)).toEqual([
      { en: 'I have been thinking about it.', ja: 'そのことをずっと考えていました。' },
    ])
  })

  it('空行が挟まっていても組にできる', () => {
    const text = `I am hungry.

お腹が空いた。


I am tired.

疲れました。`
    expect(pairs(text)).toEqual([
      { en: 'I am hungry.', ja: 'お腹が空いた。' },
      { en: 'I am tired.', ja: '疲れました。' },
    ])
  })

  it('箇条書き記号付きの 1 行 1 組を処理する', () => {
    const text = `- I am hungry. | お腹が空いた。
- I am tired. | 疲れました。`
    expect(pairs(text)).toEqual([
      { en: 'I am hungry.', ja: 'お腹が空いた。' },
      { en: 'I am tired.', ja: '疲れました。' },
    ])
  })

  it('1 行完結と 2 行 1 組が混在しても処理する', () => {
    const text = `I am hungry.\tお腹が空いた。
Could you help me?
手伝っていただけますか。
It's up to you = あなた次第です。`
    expect(pairs(text)).toEqual([
      { en: 'I am hungry.', ja: 'お腹が空いた。' },
      { en: 'Could you help me?', ja: '手伝っていただけますか。' },
      { en: "It's up to you", ja: 'あなた次第です。' },
    ])
  })

  it('相方のない行は捨てずに片側だけ埋める', () => {
    const text = `I am hungry.
I am tired.
疲れました。`
    expect(pairs(text)).toEqual([
      { en: 'I am hungry.', ja: '' },
      { en: 'I am tired.', ja: '疲れました。' },
    ])
  })

  it('日本語だけの行も残す', () => {
    expect(pairs('お腹が空いた。')).toEqual([{ en: '', ja: 'お腹が空いた。' }])
  })

  it('空文字は 0 件', () => {
    expect(pairs('   \n\n  ')).toEqual([])
  })

  it('行ごとに一意な ID を振る', () => {
    const rows = parseCards('I am hungry.\tお腹が空いた。\nI am tired.\t疲れました。')
    expect(new Set(rows.map((row) => row.id)).size).toBe(2)
  })
})

describe('enKey', () => {
  it('大文字小文字・空白・末尾記号の差を吸収する', () => {
    expect(enKey('I am Hungry!')).toBe(enKey('i  am hungry'))
  })

  it('別の文は別のキーになる', () => {
    expect(enKey('I am hungry')).not.toBe(enKey('I am tired'))
  })
})

describe('annotateRows', () => {
  const row = (id: string, en: string, ja: string) => ({ id, en, ja })

  it('片側が空なら incomplete', () => {
    const result = annotateRows([row('1', 'I am hungry.', '')])
    expect(result[0]?.issue).toBe('incomplete')
  })

  it('入力内での重複を検出する', () => {
    const result = annotateRows([
      row('1', 'I am hungry.', 'お腹が空いた。'),
      row('2', 'i am hungry', 'お腹すいた'),
    ])
    expect(result.map((r) => r.issue)).toEqual([null, 'duplicate'])
  })

  it('既存デッキとの重複を検出する', () => {
    const result = annotateRows([row('1', 'I am hungry.', 'お腹が空いた。')], new Set(['i am hungry']))
    expect(result[0]?.issue).toBe('duplicate')
  })

  it('問題がなければ issue は null', () => {
    const result = annotateRows([row('1', 'I am hungry.', 'お腹が空いた。')])
    expect(result[0]?.issue).toBeNull()
  })
})
