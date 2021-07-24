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

class PerfShim {
	marks = new Map()
	mark(token) {
		this.marks.set(token, process.hrtime.bigint())
	}
	measure(description, tokenStart, tokenEnd) {
		const duration =
			Number(this.marks.get(tokenEnd) - this.marks.get(tokenStart)) / 1_000_000
		this.marks.delete(tokenEnd)
		this.marks.delete(tokenStart)
		return { description, duration }
	}
	clearMarks() {
		this.marks.clear()
	}
	clearMeasures() {
		this.marks.clear()
	}
}

const decoder = new TextDecoder('utf-8')

// 0xbad1dea = 195894762

//prettier-ignore
const baseDoc = Uint8Array.from([
	39, 0, 0, 0, // Size
	16, // Int32
	97, 0, // 'a'
	234, 29, 173, 11, // 0xBAD1DEA - starts at offset 7
	2, // string type
	110, 105, 99, 101, 75, 101, 121, 0, // 'niceKey'
	14, 0, 0, 0, // string size
	97, 32, 103, 111, 111, 100, 32, 115, 116, 114, 105, 110, 103, 0, // 'a good string' - offset 24
	0 // finishing null
])

// {a: 0xbad1dea, niceKey: 'a good string'}
// prettier-ignore
const testDocs = new Array(1_000_000)
globalThis.testDocs = testDocs

for (let i = 0; i < testDocs.length; i++) {
	testDocs[i] = baseDoc.slice() // create copy
	const view = new DataView(testDocs[i].buffer)
	view.setInt32(7, Math.random() * 0xff_ff_ff_ff, true)
	var string = [...Math.random().toFixed(15).substr(0, 13)].map((c) =>
		c.charCodeAt(0)
	) // spread and set
	testDocs[i].set(string, 24)
}

const isNodeJS = typeof window === 'undefined'
const isWeb = typeof window !== 'undefined'

const kName = Symbol('module.name')

const MODULES = [
	['mod', { web: 'mod', node: '../lib/mod.js' }],
	['bson-ext', { node: 'bson-ext' }],
	['js-bson', { web: 'bson', node: 'bson' }],
].map(([name, { web, node }]) =>
	isWeb && web === undefined
		? Promise.resolve()
		: import(isWeb ? web : node).then((mod) => ({ ...mod, [kName]: name }))
)

Promise.all(MODULES).then(([mod, bsonExt, jsBSON]) => {
	const { bsonToJson, bsonToJsonJS } = mod

	let performance
	if (isNodeJS) {
		// nodejs needs a performance shim
		performance = new PerfShim()
	} else {
		performance = globalThis.performance
	}

	globalThis.results = []

	const iterationsToTry = [100, 1000, 10_000, 100_000, 600_000, 1_000_000]
	for (const ITERATIONS of iterationsToTry) {
		log('ITERATIONS =', ITERATIONS)

		const wasmResults = new Array(ITERATIONS)
		const jsResults = new Array(ITERATIONS)
		const jsBSONResults = new Array(ITERATIONS)

		///////////////////////////////////////////////////////////
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
			'\tWASM took',
			wasmMeasure.duration.toFixed(6),
			'ms',
			'or',
			(wasmMeasure.duration / ITERATIONS).toFixed(6),
			'ops/ms'
		)

		///////////////////////////////////////////////////////////
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
			'\tJS took',
			jsMeasure.duration.toFixed(6),
			'ms',
			'or',
			(jsMeasure.duration / ITERATIONS).toFixed(6),
			'ops/ms'
		)

		///////////////////////////////////////////////////////////
		performance.mark('jsBSONStart')
		for (let i = 0; i < ITERATIONS; i++) {
			wasmResults[i] = JSON.stringify(jsBSON.deserialize(testDocs[i]))
		}
		performance.mark('jsBSONEnd')
		const jsBSONMeasure = performance.measure(
			'time took to do js-bson',
			'jsBSONStart',
			'jsBSONEnd'
		)
		log(
			'\tJS BSON took',
			jsBSONMeasure.duration.toFixed(6),
			'ms',
			'or',
			(jsBSONMeasure.duration / ITERATIONS).toFixed(6),
			'ops/ms'
		)

		///////////////////////////////////////////////////////////
		let bsonExtResults
		if (isNodeJS && bsonExt) {
			bsonExtResults = new Array(ITERATIONS)

			performance.mark('CPPStart')
			for (let i = 0; i < ITERATIONS; i++) {
				bsonExtResults[i] = JSON.stringify(bsonExt.deserialize(testDocs[i]))
			}
			performance.mark('CPPEnd')
			const cppMeasure = performance.measure(
				'time took to do CPP',
				'CPPStart',
				'CPPEnd'
			)
			log(
				'\tCPP took',
				cppMeasure.duration.toFixed(6),
				'ms',
				'or',
				(cppMeasure.duration / ITERATIONS).toFixed(6),
				'ops/ms'
			)

		}

		// END /////////////////////////////////////////////////////////
		performance.clearMarks()
		performance.clearMeasures()

		globalThis.results.push({
			ITERATIONS,
			wasmResults,
			jsResults,
			bsonExtResults,
			jsBSONResults,
		})
	}
})
