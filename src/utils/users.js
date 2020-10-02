const randomArray = require('unique-random')
let users = new Map()

const addUser = ({id, username, room, readyState, killer, playing, coin}) => {
    username = username.trim().toLowerCase()
    room = room.trim().toLowerCase()

    if (!username || !room) {
        return {
            error: 'Username and room are required!'
        }
    }

    let currentUsers = users.get(room)
    if (currentUsers === undefined) {
        currentUsers = []
    }

    const existingUser = currentUsers.find((user) => {
        return user.room === room && user.username === username
    })

    if (existingUser) {
        return {
            error: 'Username is in use!'
        }
    }

    const user = {id, username, room, readyState, killer, playing, coin}
    currentUsers.push(user)
    users.set(room, currentUsers)
    return {user}
}

const removeUser = (id) => {
    for (let userArray of users.values()) {
        const index = userArray.findIndex((user) => {
            return user.id === id
        })

        if (index !== -1) {
            const removeUser = userArray.splice(index, 1)[0]
            users.set(removeUser.room, userArray)
            return removeUser
        }
    }
}

const getUser = (id) => {
    for (let userArray of users.values()) {
        const user = userArray.find((user) => user.id === id)
        if (user !== undefined) {
            return user
        }
    }
}

const getUsersInRoom = (room) => {
    return users.get(room)
}

const existingRoom = (room) => {
    return users.has(room)
}

const setKiller = (room) => {
    let currentUsers = users.get(room)
    const playingUsers = currentUsers.filter(user => {
        return user.playing === true
    })
    const random = randomArray(0, playingUsers.length - 1)
    const randomIndex = random()
    currentUsers[randomIndex].killer = true
    users.set(room, currentUsers)
    return currentUsers[randomIndex]
}

const setReadyState = (username, room) => {
    let currentUsers = users.get(room)

    const index = currentUsers.findIndex((user) => {
        return user.username === username
    })

    if (index !== -1) {
        currentUsers[index].readyState = true
        users.set(room, currentUsers)
        return currentUsers[index]
    }
}

const checkAllReady = (room) => {
    let currentUsers = users.get(room)
    const notReadyUsers = currentUsers.filter(user => {
        return user.readyState === false
    })

    if (notReadyUsers.length === 0) {
        const ready = true
        return {ready, notReadyUsers}
    } else {
        const ready = false
        return {ready, notReadyUsers}
    }
}

const setBooleanParameters = (room) => {
    let currentUsers = users.get(room)
    currentUsers.forEach((user) => {
        user.readyState = false
        user.killer = false
        user.playing = true
    });
    users.set(room, currentUsers)
}

const isKilled = (username, room) => {
    let currentUsers = users.get(room)

    const index = currentUsers.findIndex((user) => {
        return user.username === username

    })

    currentUsers[index].playing = false
    currentUsers[index].killer = false

    const activePlayers = currentUsers.filter((user) => {
        return user.playing === true && user.killer === false
    })
    const killer = currentUsers.find((user) => {
        return user.killer === true
    })
    users.set(room, currentUsers)
    const random = randomArray(0, activePlayers.length - 1)
    const randomIndex = random()
    let falseKiller = activePlayers[randomIndex]
    let user = currentUsers[index]
    if(killer!==undefined) {
        activePlayers.push(killer)
    }

    return {user, activePlayers, falseKiller}
}

const addCoin = (username, room, value) => {
    let currentUsers = users.get(room)
    const index = currentUsers.findIndex((user) => {
        return user.username === username

    })

    if (index !== -1) {
        currentUsers[index].coin += value

        users.set(room, currentUsers)

        return {
            user: currentUsers[index]
        }
    }
    return {
        error: 'unable to add coin'
    }
}

const getKiller=(room)=>{
    let currentUsers = users.get(room)
    const killer = currentUsers.find((user) => {
        return user.killer === true
    })
    return {killer}
}

const adminStart=(room)=>{
    let currentUsers = users.get(room)

    const notReadyUsers = currentUsers.filter(user => {
        return user.readyState === false
    })

    currentUsers.forEach((user) => {
        if(user.readyState===true) {
            user.readyState = false
            user.killer = false
            user.playing = true
        }
    });
    users.set(room, currentUsers)
}

const room = 'hell'
const obj1 = {
    id: 'qwerty',
    username: 'yashaswi',
    room,
    readyState: true,
    killer: true,
    playing: true,
    coin: 7
}

const obj2 = {
    id: 'qwwwert',
    username: 'kopal',
    room,
    readyState: true,
    killer: false,
    playing: true,
    coin: 8
}
const obj3 = {
    id: 'qqqwert',
    username: 'amit',
    room: 'heaven',
    readyState: true,
    killer: false,
    playing: true,
    coin: 3
}

const obj4 = {
    id: 'qwertty',
    username: 'mummy ',
    room,
    readyState: true,
    killer: false,
    playing: true,
    coin: -6
}
// addUser(obj1)
// addUser(obj2)
// addUser(obj3)
// addUser(obj4)
// console.log(getKiller(room))


module.exports = {
    addUser,
    removeUser,
    getUser,
    getUsersInRoom,
    existingRoom,
    setKiller,
    setReadyState,
    checkAllReady,
    setBooleanParameters,
    isKilled,
    addCoin,
    getKiller,
    adminStart
}