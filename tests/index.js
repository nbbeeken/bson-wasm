import * as mod from 'mod'

const { bsonToJson } = mod

const LOG_SECTION = document.getElementById('log')
function log(...args) {
	const li = document.createElement('li')
	const code = document.createElement('code')
	li.appendChild(code)
	code.innerText = args.map(v => v.toString() === '[object Object]' ? JSON.stringify(v) : v.toString()).join(' ')
	LOG_SECTION.appendChild(li)
	console.log(...args)
}

const decoder = new TextDecoder('utf-8')

//prettier-ignore
const testDoc = Uint8Array.from([0x0c, 0x00, 0x00, 0x00, 0x10, 0x61, 0x00, 0xea, 0x1d, 0xad, 0x0b, 0x00])

const bytes = bsonToJson(testDoc)
log('bytes', bytes)
const string = decoder.decode(bytes)
log('string', string)
const parsed = JSON.parse(string)
log('parsed', parsed)

// 0xbad1dea = 195894762

// {a: 0xbad1dea, niceKey: 'a good string'}
// prettier-ignore
const testDoc2 = [
	39,   0,   0,   0,  16,  97,   0, 234,  29, 173,
	11,   2, 110, 105,  99, 101,  75, 101, 121,   0,
	14,   0,   0,   0,  97,  32, 103, 111, 111, 100,
	32, 115, 116, 114, 105, 110, 103,   0,   0
]

const bytes2 = bsonToJson(testDoc2)
log('bytes2', bytes2)
const string2 = decoder.decode(bytes2)
log('string2', string2)
const parsed2 = JSON.parse(string2)
log('parsed2', parsed2)
