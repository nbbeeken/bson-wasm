//@ts-check
import { readFile } from 'fs/promises'
import http from 'http'
import { on } from 'events'

const server = http.createServer()
server.listen(8080, 'localhost', 128, () =>
	console.log('Listening on http://localhost:8080')
)

async function main() {
	for await (const [request, response] of on(server, 'request')) {
		const url = new URL(request.url, `http://${request.headers.host}`)

		console.log(request.method, url.pathname)

		if (url.pathname === '/') {
			response.setHeader('Content-Type', 'text/html')
			response.end(await readFile('./index.html'), 'utf8')
			continue
		} else {
			const fileData = await readFile(url.pathname.slice(1))

			// Get the extension
			const fileParts = url.pathname.split('.')
			const fileExtension = fileParts[fileParts.length - 1]

			if (fileExtension === 'js') {
				response.setHeader('Content-Type', 'application/javascript')
			}
			if (fileExtension === 'wasm') {
				response.setHeader('Content-Type', 'application/wasm')
			}
			if (fileExtension === 'map' || fileExtension === 'json') {
				response.setHeader('Content-Type', 'application/json')
			}

			response.end(fileData, 'utf8')
		}
	}
}

main()
	.then(() => console.log('end'))
	.catch((e) => console.log(e))
	.finally(() => server.close())
