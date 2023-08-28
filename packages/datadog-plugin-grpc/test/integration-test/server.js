require('dd-trace/init.js')
const grpc = require('@grpc/grpc-js')
const protoLoader = require('@grpc/proto-loader')
const path = require('path')
const getPort = require('get-port')

let port

// getPort().then(newPort => {
//   port = newPort
// })


port = await getPort()
console.log(1312312, 'commonJS')
console.log(1312312, 'port ', port);

(async () => {
  const parentDirectoryPath = path.resolve(__dirname, '..')

  console.log('Parent Directory Path:', parentDirectoryPath)

  let server

  function buildClient (service, callback) {
    service = Object.assign(
      {
        getBidi: () => {},
        getServerStream: () => {},
        getClientStream: () => {},
        getUnary: () => {}
      },
      service
    )

    // Logging the path to the loaded proto file
    console.log('Proto File Path:', `${parentDirectoryPath}/test.proto`)

    const definition = protoLoader.loadSync(`${parentDirectoryPath}/test.proto`)
    const TestService = grpc.loadPackageDefinition(definition).test.TestService

    server = new grpc.Server()

    return new Promise((resolve, reject) => {
      if (server.bindAsync) {
        server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err) => {
          if (err) return reject(err)

          server.addService(TestService.service, service)
          server.start()

          // Logging that the server has started
          console.log('Server started on port:', port)

          resolve(new TestService(`localhost:${port}`, grpc.credentials.createInsecure()))
        })
      } else {
        server.bind(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure())
        server.addService(TestService.service, service)
        server.start()

        // Logging that the server has started
        console.log('Server started on port:', port)

        resolve(new TestService(`localhost:${port}`, grpc.credentials.createInsecure()))
      }
    })
  }

  const client = await buildClient({
    getUnary: (_, callback) => callback()
  })

  client.getUnary({ first: 'foobar' }, () => {})
  console.log(123123, 'sent getUnary')

  server.forceShutdown()

  console.log(123123, 'shutoff')
})()
