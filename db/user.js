//This is the database for now with functions to add, remove, get and get users in a room
//users is a list that stores the information of the user: id, name, room
const users = [];

const addUser = ( name, room) => { //function to add users if unique and return the user

    if(typeof(name) === "undefined" || typeof (room) === "undefined"){
        console.log("Undefined name or room")
        return {}
    }
    else {

            name = name.trim().toLowerCase();   //eliminate white space and make it lower case [eg. Sohil Vaidya => sohilvaidya]
            room = room.trim().toLowerCase();

        const existingUser = users.findIndex(x => x.name === name);
        console.log("index",existingUser)
        if (existingUser !== -1) {   //check if user with the same name exist in a room or not and return error if there is such instance
            return users[existingUser]
        } else {
            const user = {name, room};  //if no user with that name, then store these identities of the users
            users.push(user);   //push it to the list of users
            console.log(users)
            return user   //return the currently joined user
        }
    }
}

//function to get user if the id passed matches the id in the users list
function getUser(name){
    console.log("Name",name)
    let index = users.findIndex(x => x.name === name);
    if(index !== -1){
        console.log(users[index])
        return users[index]
    }
    else{
        console.log("User not in the system")
        return {}
    }
}

//function to get the users in the room if the room name matches the room name of the users in the list
const getUserInRoom = (room) => users.filter((user)=> user.room === room);

//export this module in order to use these functions in the required page (index)
module.exports = {addUser, getUser, getUserInRoom};