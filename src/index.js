const path = require('path')
const http=require('http')
const socketio = require('socket.io')
const express=require('express')
const customid=require('custom-id')
const {addUser,removeUser,getUser,getUsersInRoom,existingRoom,setKiller,setReadyState,checkAllReady,
       setBooleanParameters,isKilled,addCoin}= require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000

const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))



io.on('connection',(socket)=>{
    console.log('New WebSocket connection')

    socket.on('create',({username},callback)=>{

        const room=customid({})
        if(existingRoom(room))
        {
            return callback({error:"Try Again"},null)
        }
        
        return callback(null,{room})

    })

    
    socket.on('join',({username,room},callback)=>{

        if(username==null||room==null)
        {
            return callback({error:"missing data"},null)
        }


        readyState=false
        killer=false
        playing=false 
        coin=0  
        const {error,user}=addUser({id:socket.id,username,room,readyState,killer,playing,coin})
        if(error)
        {
            
            return callback({error},null)
        }
        socket.join(room)
        console.log("working")

        socket.broadcast.to(user.room).emit('userInfo',{message:'newUserJoined',user})
        socket.emit('userInfo',{message:'youHaveJoined',user})

        io.to(user.room).emit('roomData',{
            room:user.room,
            users:getUsersInRoom(user.room)
        })

        
        return callback(null,user)
    })

    socket.on('play',({username,room},callback)=>{

        console.log(username)
        user=setReadyState(username,room)

        const {ready,notReadyUsers} =checkAllReady(user.room)
        
        if(ready)
        {
        setBooleanParameters(user.room)
        killer=setKiller(user.room)
        io.to(killer.id).emit('userInfo',{message:'youAreKiller',killer})
        }
       
        io.to(room).emit('ready',{ready,notReadyUsers})

        return callback({ready})
        
    })

    socket.on('onKilling',({username,room})=>{
        const{user,activePlayers,falseKiller}=isKilled(username,room)

        socket.emit('userInfo',{message:'trueKiller',killer})
        io.to(user.id).emit('userInfo',{message:'gameOver',user})
        //io.to(falseKiller.id).emit('userInfo',{message:falseKiller,falseKiller})

        if(activePlayers.length===2)
        {   io.to(room).emit('isKilled',{message:'userIsKilled',user,activePlayers})
            setTimeout(()=>{
                io.to(room).emit('winner',{activePlayers})
                console.log('5 secons latter')
                
            },500)
            
        }
        else
        {
        setTimeout(()=>{
            io.to(room).emit('isKilled',{message:'userIsKilled',user,activePlayers})
            console.log('5 secons latter')
            
        },5000)
        }
    })

    socket.on('raiseToken',(user1,killer1)=>{
        socket.broadcast.to(user1.room).emit('tokenRaised',{user1,killer1})
    })

    socket.on('acceptToken',(user1,user2,killer1,killer2)=>{
        if(killer1.id===killer2.id)
        {
            const{user,activePlayers,falseKiller}=isKilled(killer1.username,killer1.room)

            io.to(user.id).emit('userInfo',{message:'gameOver',user})
            if(activePlayers.length===2||activePlayers.length===3)
            {   io.to(room).emit('isKilled',{message:'killerIsCaught',user,activePlayers})
                setTimeout(()=>{
                    io.to(room).emit('winner',{activePlayers})
                    
                },500)
            }
            else
            {
            const killer=setKiller(user.room)
            io.to(killer.id).emit('userInfo',{message:'youAreKiller',killer})
            io.to(room).emit('isKilled',{message:'killerIsCaught',user,activePlayers})
                
            }
        }
        else
        {
            const obj1=isKilled(user1.username,user1.room)
            const{user,activePlayers,falseKiller}=isKilled(user2.username,user2.room)

            io.to(user1.id).emit('userInfo',{message:'gameOver',user1})
            io.to(user2.id).emit('userInfo',{message:'gameOver',user2})

            if(activePlayers.length===2||activePlayers.length===3)
            {   io.to(room).emit('isKilled',{message:'falseAccuse',user1,user2,activePlayers})
                setTimeout(()=>{
                    io.to(room).emit('winner',{activePlayers})
                },500)
            }
            else
            {
            const killer=setKiller(user.room)
            io.to(killer.id).emit('userInfo',{message:'youAreKiller',killer})
            io.to(room).emit('isKilled',{message:'killerIsCaught',user1,user2,activePlayers})
                
            }

         }
    })

    socket.on('addCoin',({username,room,value})=>{
        const {user,error} =addCoin(username,room,value)
        if(user)
        {
        callback(null,user)
        }
        else
        {
            callback(error,null)
        }
      })
    socket.on('disconnect', () => {
        console.log(socket.id)
        const user = getUser(socket.id)
        if(user)
        {
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        io.to(user.room).emit('isDisconnected',user)
        if (user) {
           setTimeout(()=>{
            removeUser(user.id)
        },1000)
        }
    }
    })

    


})


server.listen(port, () => {
    console.log(`Server is up on port ${port}!`)
})
