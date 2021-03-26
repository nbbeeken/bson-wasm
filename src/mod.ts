import { readFile } from 'fs/promises'
import { instantiate } from '@assemblyscript/loader'
import { javascript_bson_to_json } from './bson.js'

// const WASM_IMPORTS = {}

interface Mod {
	InputArrayId: number
	wasm_bson_to_json(ptr: number): number
	wasm_json_to_bson(ptr: number): number
	[other: string]: unknown
}

// const PATH_TO_WASM = './build/untouched.wasm' // DEBUG
const PATH_TO_WASM = './build/optimized.wasm' // PROD

const WASM_MODULE = await instantiate<Mod>(readFile(PATH_TO_WASM))

const {
	// run time
	__newArray: newArray,
	__getUint8Array: getUint8Array,
	// lib functions
	InputArrayId,
	wasm_bson_to_json,
} = WASM_MODULE.exports

export function bsonToJson(buffer: Uint8Array) {
	const inputPtr = newArray(InputArrayId, buffer)
	const resultPtr = wasm_bson_to_json(inputPtr)
	const jsonBytes = getUint8Array(resultPtr)
	const size = new DataView(jsonBytes.buffer).getBigUint64(0, true)
	return jsonBytes.subarray(8, 8 + Number(size - 8n))
}

export function bsonToJsonJS(buffer: Uint8Array) {
	const jsonBytes = javascript_bson_to_json(buffer)
	const size = new DataView(jsonBytes.buffer).getBigUint64(0, true)
	return jsonBytes.subarray(8, 8 + Number(size - 8n))
}

export function bsonToJsonCPP(buffer: Uint8Array) {
	if (typeof window !== 'undefined')
		return Uint8Array.from(['{'.charCodeAt(0), '}'.charCodeAt(0)]) // web env, cannot test

	// NODEJS Env
}

export function JsonToBson(json: string) {}
