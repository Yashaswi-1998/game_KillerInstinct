const path = require('path')
const http = require('http')
const socketIo = require('socket.io')
const express = require('express')
const randomArray = require('unique-random')
const {
    addUser, removeUser, getUser, getUsersInRoom, existingRoom, setKiller, setReadyState, checkAllReady,
    setBooleanParameters, isKilled, addCoin, getKiller, adminStart,
} = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketIo(server)

const port = process.env.PORT || 3000

const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

const userInfoEmitter = 'userInfo'
const roomDataEmitter = 'roomData'
const readyStateEmitter = 'ready'
const isKilledEmitter = 'isKilled'
const winnerEmitter = 'winner'
const tokenRaisedEmitter = 'tokenRaised'
const tokenAcceptedEmitter = 'tokenAccepted'

const userInfoEnum = {
    admin: 1,
    iHaveJoined: 2,
    othersHaveJoined: 3,
    youAreKiller: 4,
    trueKiller: 5,
    gameOver: 6,
    falseKiller: 7,
    disconnect: 8
}

const isKilledEnum = {
    userIsKilled: 1,
    killerIsCaught: 2,
    falseAccuse: 3
}

const createListener = 'create'
const playListener = 'play'
const forceStartListener = 'forceStart'
const onKillingListener = 'onKilling'
const raiseTokenListener = 'raiseToken'
const acceptTokenListener = 'acceptToken'
const addCoinListener = 'addCoin'

io.on('connection', (socket) => {
    console.log('New WebSocket connection')

    socket.on(createListener, (callback) => {

        const random = randomArray(10000000, 99999999)
        const room = random()
        if (existingRoom(room)) {
            return callback({error: "Try Again"})
        }
        console.log('working')
        socket.emit(userInfoEmitter, {userInfoEnum: userInfoEnum.admin, room})
    })

    socket.on('join', ({username, room}, callback) => {

        if (username == null || room == null) {
            return callback({error: "missing data"})
        }

        let readyState = false
        let killer = false
        let playing = false
        let coin = 0
        const {error, user} = addUser({id: socket.id, username, room, readyState, killer, playing, coin})
        if (error) {
            return callback({error})
        }
        socket.join(room)
        console.log("working")

        socket.broadcast.to(user.room).emit(userInfoEmitter, {userInfoEnum: userInfoEnum.iHaveJoined, user})
        socket.emit(userInfoEmitter, {userInfoEnum: userInfoEnum.othersHaveJoined, user})

        io.to(user.room).emit(roomDataEmitter, {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        return callback({user})
    })

    socket.on(playListener, ({username, room}, callback) => {

        console.log(username)
        const user = setReadyState(username, room)

        const {ready, notReadyUsers} = checkAllReady(user.room)
        if (ready) {
            setBooleanParameters(user.room)
            const killer = setKiller(user.room)
            io.to(killer.id).emit(userInfoEmitter, {userInfoEnum: userInfoEnum.youAreKiller, killer})
        }

        io.to(room).emit(readyStateEmitter, {ready, notReadyUsers})

        return callback({ready})
    })

    socket.on(forceStartListener, ({room}) => {

        const {notReadyUsers} = adminStart(room)

        const killer = setKiller(room)
        io.to(killer.id).emit(userInfoEmitter, {userInfoEnum: userInfoEnum.youAreKiller, killer})
        io.to(room).emit(readyStateEmitter, {ready: true, notReadyUsers})
    })

    socket.on(onKillingListener, ({username, room}) => {

        const {user, activePlayers, falseKiller} = isKilled(username, room)
        const killer = getKiller(user.room)

        socket.emit(userInfoEmitter, {userInfoEnum: userInfoEnum.trueKiller, killer})
        io.to(user.id).emit(userInfoEmitter, {userInfoEnum: userInfoEnum.gameOver, user})
        io.to(falseKiller.id).emit(userInfoEmitter, {userInfoEnum: userInfoEnum.falseKiller, falseKiller})

        if (activePlayers.length === 2) {
            io.to(room).emit(isKilledEmitter, {isKilledEnum: isKilledEnum.userIsKilled, user, activePlayers})
            setTimeout(() => {

                io.to(room).emit(winnerEmitter, {activePlayers})
                console.log('.5 seconds latter')
            }, 500)
        } else {

            setTimeout(() => {
                io.to(room).emit(isKilledEmitter, {isKilledEnum: isKilledEnum.userIsKilled, user, activePlayers})
                console.log('5 seconds latter')
            }, 5000)
        }
    })

    socket.on(raiseTokenListener, ({user1, killer1}) => {
        socket.broadcast.to(user1.room).emit(tokenRaisedEmitter, {user1, killer1})
    })

    socket.on(acceptTokenListener, ({user1, user2, killer1, killer2}) => {

        const killer = getKiller(user1.room)
        if (killer1.id === killer2.id && killer2.id === killer.id) {
            const {user, activePlayers, falseKiller} = isKilled(killer.username, killer.room)

            io.to(user.room).emit(tokenAcceptedEmitter, {activePlayers})
            io.to(user.id).emit(userInfoEmitter, {userInfoEnum: userInfoEnum.gameOver, user})

            if (activePlayers.length === 2 || activePlayers.length === 3) {
                io.to(user.room).emit(isKilledEmitter, {isKilledEnum: isKilledEnum.killerIsCaught, user, activePlayers})
                setTimeout(() => {
                    io.to(user.room).emit(winnerEmitter, {activePlayers})
                }, 500)
            } else {
                const killer = setKiller(user.room)
                io.to(killer.id).emit(userInfoEmitter, {userInfoEnum: userInfoEnum.youAreKiller, killer})
                io.to(user.room).emit(isKilledEmitter, {isKilledEnum: isKilledEnum.killerIsCaught, user, activePlayers})

            }
        } else {
            const obj1 = isKilled(user1.username, user1.room)
            const {user, activePlayers, falseKiller} = isKilled(user2.username, user2.room)

            io.to(user.room).emit(tokenAcceptedEmitter, {activePlayers})
            io.to(user1.id).emit(userInfoEmitter, {userInfoEnum: userInfoEnum.gameOver, user1})
            io.to(user2.id).emit(userInfoEmitter, {userInfoEnum: userInfoEnum.gameOver, user2})

            if (activePlayers.length === 2 || activePlayers.length === 3) {
                io.to(user.room).emit(isKilledEmitter, {
                    isKilledEnum: isKilledEnum.falseAccuse,
                    user1,
                    user2,
                    activePlayers
                })
                setTimeout(() => {
                    io.to(user.room).emit(winnerEmitter, {activePlayers})
                }, 500)
            } else {
                const killer = setKiller(user.room)
                io.to(killer.id).emit(userInfoEmitter, {userInfoEnum: userInfoEnum.youAreKiller, killer})
                io.to(user.room).emit(isKilledEmitter, {
                    isKilledEnum: isKilledEnum.falseAccuse,
                    user1,
                    user2,
                    activePlayers
                })
            }
        }
    })

    socket.on(addCoinListener, ({username, room, value},callback) => {
        const {user, error} = addCoin(username, room, value)
        if (user) {
            callback({user})
        } else {
            callback({error})
        }
    })

    socket.on('disconnect', () => {
        console.log(socket.id)
        const user = getUser(socket.id)
        if (user) {
            io.to(user.room).emit(roomDataEmitter, {
                room: user.room,
                users: getUsersInRoom(user.room)
            })

            io.to(user.room).emit(userInfoEmitter, {userInfoEnum: userInfoEnum.disconnect, user})
            if (user) {
                setTimeout(() => {
                    removeUser(user.id)
                }, 30000)
            }
        }
    })
})


server.listen(port.toString(), () => {
    console.log(`Server is up on port ${port}!`)
})
