export const InputArrayId = idof<Uint8Array>()

const BSON_DOUBLE = 0x01
const BSON_STRING = 0x02
const BSON_DOCUMENT = 0x03
const BSON_ARRAY = 0x04
const BSON_BINARY = 0x05
const BSON_UNDEFINED = 0x06
const BSON_OBJECTID = 0x07
const BSON_BOOLEAN = 0x08
const BSON_UTC_DATE = 0x09
const BSON_NULL = 0x0a
const BSON_REGEX = 0x0b
const BSON_DB_POINTER = 0x0c
const BSON_CODE = 0x0d
const BSON_SYMBOL = 0x0e
const BSON_CODE_WITH_SCOPE = 0x0f
const BSON_INT32 = 0x10
const BSON_TIMESTAMP = 0x11
const BSON_INT64 = 0x12
const BSON_DECIMAL128 = 0x13
const BSON_MIN_KEY = 0xff
const BSON_MAX_KEY = 0x7f

// {  0x7B
const OPEN_BRACE = 0x7b
// }  0x7D
const CLOSE_BRACE = 0x7d
// ,  0x2C
const COMMA = 0x2c
// "  0x22
const QUOTE = 0x22
// : 0x3A
const COLON = 0x3a
// \n 0x10
const NEW_LINE = 0x10

// '0' 0x30
const ASCII_ZERO = 0x30
// '-' 0x2D
const ASCII_MINUS = 0x2d

export function wasm_bson_to_json(bsonBytes: Uint8Array): Uint8Array {
	// Need to calculate how much space needed for JSON
	// Maybe start with an upper end allocation and can grow and copy if needed
	// start jsonBytes with {
	// for each key value pair in the bson document append:
	// " <key string> " : <translated value> ,
	// end with: }

	const jsonBytes = new Uint8Array(500) // random number for now
	const bsonView = new DataView(bsonBytes.buffer)
	const jsonView = new DataView(jsonBytes.buffer)

	let readerIdx = 0

	const documentSize = bsonView.getInt32(readerIdx, true)
	// trace('docSize', 1, documentSize)
	readerIdx += 4

	let writerIdx = 8
	jsonView.setUint64(0, writerIdx, true)

	jsonBytes[writerIdx++] = OPEN_BRACE

	let readable = true
	while (readable && readerIdx < documentSize) {
		// trace('bson loop', 2, writerIdx - 8, readerIdx)
		const type = bsonView.getInt8(readerIdx)
		// trace('found type', 1, type)
		readerIdx += 1

		if (readerIdx === documentSize) {
			if (type !== 0) {
				throw new Error('No Document null terminator')
			}
			break
		}

		// trace('reading Key', 1, readerIdx)
		let keyStart = readerIdx
		let keyEnd = keyStart
		for (; keyEnd < 256; keyEnd++) {
			const val = bsonBytes[keyEnd]
			if (val === 0) break
		}
		let keySize = keyEnd - keyStart
		readerIdx += keySize + 1

		jsonBytes[writerIdx++] = QUOTE
		copy(jsonBytes.subarray(writerIdx), bsonBytes.subarray(keyStart), keySize)
		writerIdx += keySize
		jsonBytes[writerIdx++] = QUOTE
		jsonBytes[writerIdx++] = COLON

		switch (type) {
			case 0x00:
				readable = false
				break
			case BSON_INT32: {
				let int32AsArray = intToAscii(bsonView.getInt32(readerIdx, true))
				// trace(int32AsArray.toString())
				copy(
					jsonBytes.subarray(writerIdx),
					int32AsArray,
					int32AsArray.byteLength
				)
				writerIdx += int32AsArray.byteLength
				readerIdx += 4
				break
			}
			case BSON_STRING: {
				let stringLength = bsonView.getInt32(readerIdx, true)
				readerIdx += 4
				jsonBytes[writerIdx++] = QUOTE
				copy(
					jsonBytes.subarray(writerIdx),
					bsonBytes.subarray(readerIdx),
					stringLength - 1
				)
				writerIdx += stringLength - 1 // bson put null at the end of strings
				readerIdx += stringLength
				jsonBytes[writerIdx++] = QUOTE
				break
			}
			default:
				// trace('AHH')
		}

		jsonBytes[writerIdx++] = COMMA
	}

	// trace('end', 2, writerIdx - 8, readerIdx)
	if (jsonBytes[writerIdx - 1] === COMMA) {
		jsonBytes[writerIdx - 1] = CLOSE_BRACE
	} else {
		jsonBytes[writerIdx++] = CLOSE_BRACE
	}

	jsonView.setUint64(0, writerIdx, true)

	return jsonBytes
}

export function wasm_json_to_bson(a: Uint8Array): ArrayBuffer {
	const newThing = new Uint8Array(a.byteLength)
	newThing.set(a)
	const view = new DataView(newThing.buffer)
	view.setUint8(0, 65)
	return newThing.buffer
}

// helpers

function copy(
	destination: Uint8Array,
	source: Uint8Array,
	length: number
): void {
	// trace('Copy', 3, destination.length, source.length, length)
	for (let i = 0; i < length; i++) {
		destination[i] = source[i]
	}
}

function intToAscii(number: i32): Uint8Array {
	let sign = number

	let spaceForMinus = 0
	if (sign < 0) {
		/* record sign */
		number = -number /* make n positive */
		spaceForMinus = 1
	}

	const len: i32 = (Math.floor(Math.log10(Math.abs(number))) + 1) as i32
	const s = new Uint8Array(len + spaceForMinus)

	// trace('itoa', 2, number, len)

	/* generate digits in reverse order */
	let i = 0

	while (number > 0) {
		const nextDigit = number % 10 /* get next digit */
		const asciiDigit = nextDigit + ASCII_ZERO
		s[i++] = asciiDigit
		number /= 10
	}

	if (sign < 0) {
		s[i++] = ASCII_MINUS
	}

	s.reverse()
	return s
}
