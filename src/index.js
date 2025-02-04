const path = require('path')
const http = require('http')
const socketio = require('socket.io')
const express = require('express')
const Filter = require('bad-words')
const { generatedMessage, generatedLocationMessage } = require('./utils/messages.js')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users.js')


const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000;
const publicDirectory = path.join(__dirname, '../public')

app.use(express.static(publicDirectory))

// server (emit) -> client (receive) - countUpdated
// client (emit) -> server (receive) - increment

io.on('connection', (socket) => {
    console.log('New WebSocket connection')



    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options })

        if (error) {
            callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generatedMessage('Admin', 'Welcome!'))
        socket.broadcast.to(user.room).emit('message', generatedMessage('Admin', `${user.username} has joined`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on('sendMessage', (message, callback) => {
        const filter = new Filter()
        const user = getUser(socket.id)

        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed!')
        }

        io.to(user.room).emit('message', generatedMessage(user.username, message))
        callback()
    })



    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generatedLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generatedMessage('Admin', `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})

server.listen(port, () => {
    console.log(`Server is up on port ${port}`)
})