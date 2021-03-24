function log(...args) {
	if (typeof window !== 'undefined') {
		const logSection = document.getElementById('log')
		const li = document.createElement('li')
		const code = document.createElement('code')
		li.appendChild(code)
		code.innerText = args
			.map((v) =>
				v.toString() === '[object Object]' ? JSON.stringify(v) : v.toString()
			)
			.join(' ')
		logSection.appendChild(li)
	}
	console.log(...args)
}

const decoder = new TextDecoder('utf-8')

//prettier-ignore
const testDoc = Uint8Array.from([0x0c, 0x00, 0x00, 0x00, 0x10, 0x61, 0x00, 0xea, 0x1d, 0xad, 0x0b, 0x00])

// 0xbad1dea = 195894762

// {a: 0xbad1dea, niceKey: 'a good string'}
// prettier-ignore
const testDoc2 = Uint8Array.from([
	39,   0,   0,   0,  16,  97,   0, 234,  29, 173,
	11,   2, 110, 105,  99, 101,  75, 101, 121,   0,
	14,   0,   0,   0,  97,  32, 103, 111, 111, 100,
	32, 115, 116, 114, 105, 110, 103,   0,   0
])

// If only nodejs supported importmaps
const moduleImport =
	typeof window !== 'undefined' ? import('mod') : import('../lib/mod.js')

moduleImport.then((mod) => {
	const { bsonToJson, bsonToJsonJS } = mod
	// const bytes = bsonToJson(testDoc)
	// log('bytes', bytes)
	// const string = decoder.decode(bytes)
	// log('string', string)
	// const parsed = JSON.parse(string)
	// log('parsed', parsed)

	// const bytes2 = bsonToJson(testDoc2)
	// log('bytes2', bytes2)
	// const string2 = decoder.decode(bytes2)
	// log('string2', string2)
	// const parsed2 = JSON.parse(string2)
	// log('parsed2', parsed2)

	globalThis.results = []

	const iterationsToTry = [100, 1000, 10_000, 100_000, 600_000, 1_000_000]
	for (const ITERATIONS of iterationsToTry) {
		log('ITERATIONS =', ITERATIONS)

		const wasmResults = new Array(ITERATIONS)
		const jsResults = new Array(ITERATIONS)

		performance.mark('wasmStart')
		for (let i = 0; i < ITERATIONS; i++) {
			wasmResults[i] = bsonToJson(testDoc2)
		}
		performance.mark('wasmEnd')
		const wasmMeasure = performance.measure(
			'time took to do wasm',
			'wasmStart',
			'wasmEnd'
		)
		log(
			'WASM took',
			wasmMeasure.duration.toFixed(6),
			'ms',
			'or',
			(wasmMeasure.duration / ITERATIONS).toFixed(6),
			'ops/ms'
		)

		performance.mark('JSStart')
		for (let i = 0; i < ITERATIONS; i++) {
			jsResults[i] = bsonToJsonJS(testDoc2)
		}
		performance.mark('JSEnd')
		const jsMeasure = performance.measure(
			'time took to do JS',
			'JSStart',
			'JSEnd'
		)
		log(
			'JS took',
			jsMeasure.duration.toFixed(6),
			'ms',
			'or',
			(jsMeasure.duration / ITERATIONS).toFixed(6),
			'ops/ms'
		)

		performance.clearMarks()
		performance.clearMeasures()

		globalThis.results.push({ ITERATIONS, wasmResults, jsResults })
	}
})
