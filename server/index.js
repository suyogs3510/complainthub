import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://10.169.48.59:5173'],
    methods: ['GET', 'POST']
  }
})

io.on('connection', socket => {
  socket.on('complaint_created', payload => {
    io.emit('complaint_created', payload)
  })
  socket.on('complaint_updated', payload => {
    io.emit('complaint_updated', payload)
  })
})

const port = process.env.PORT || 3006
httpServer.listen(port, () => {
  console.log(`Socket.IO server running on port ${port}`)
})
