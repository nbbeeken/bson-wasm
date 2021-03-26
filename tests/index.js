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

const baseDoc = Uint8Array.from([
	39,   0,   0,   0, // Size
	16, // Int32
	97,   0, // 'a'
	234,  29, 173, 11, // 0xBAD1DEA - starts at offset 7
	2, // string type
	110, 105,  99, 101,  75, 101, 121,   0, // 'niceKey'
	14,   0,   0,   0, // string size
	97,  32, 103, 111, 111, 100, 32, 115, 116, 114, 105, 110, 103, 0, // 'a good string' - offset 24
	0 // finishing null
])

// {a: 0xbad1dea, niceKey: 'a good string'}
// prettier-ignore
const testDocs = new Array(1_000_000)
globalThis.testDocs = testDocs

for (let i = 0; i < testDocs.length; i++) {
	testDocs[i] = baseDoc.slice() // create copy
	const view = new DataView(testDocs[i].buffer)
	view.setInt32(7, Math.random() * 0xFF_FF_FF_FF, true)
	var string = [...(Math.random().toFixed(15).substr(0, 13))].map(c => c.charCodeAt()) // spread and set
	testDocs[i].set(string, 24)
}

// If only nodejs supported importmaps
const imports =
	typeof window !== 'undefined' ? [import('mod')] : [import('../lib/mod.js'), import('perf_hooks')]

Promise.all(imports).then((mods) => {
	const { bsonToJson, bsonToJsonJS } = mods.shift()

	let performance
	if (typeof globalThis.performance === 'undefined') {
		if (mods.length !== 0) {
			performance = mods[0].performance
		}
		else throw new Error('cant fine performance api')
	} else {
		performance = globalThis.performance
	}


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
			wasmResults[i] = bsonToJson(testDocs[i])
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
			jsResults[i] = bsonToJsonJS(testDocs[i])
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
