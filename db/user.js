//This is the database for now with functions to add, remove, get and get users in a room
//users is a list that stores the information of the user: id, name, room
const users = [];

const addUser = ({id, name, room}) => { //function to add users if unique and return the user

    if(typeof(name) !== "undefined" && typeof(room) !== "undefined") {
        name = name.trim().toLowerCase();   //eliminate white space and make it lower case [eg. Sohil Vaidya => sohilvaidya]
        room = room.trim().toLowerCase();
    }
    const existingUser = users.find((user) => user.room === room && user.name === name);    //return true if same name in the same room

    if(existingUser){   //check if user with the same name exist in a room or not and return error if there is such instance
        return{error: 'Username is already taken'};
    }

    const user = {id, name, room};  //if no user with that name, then store these identities of the users
    users.push(user);   //push it to the list of users
    return {user}   //return the currently joined user
}

const removeUser = (id) => {    //function to remove user if the specific id passed was stored in the list
    const index = users.findIndex((user) => user.id === id);    //find an index with the passed id and returns true if there is a user with that id
    if(index !== -1){   //if the above "index" function returns true // there is a user with the passed id
        return users.splice(index, 1)[0];   //from that specific index, remove 1 and return the updated users list
    }
}

//function to get user if the id passed matches the id in the users list
const getUser = (id) => users.find((user) => user.id === id);

//function to get the users in the room if the room name matches the room name of the users in the list
const getUserInRoom = (room) => users.filter((user)=> user.room === room);

//export this module in order to use these functions in the required page (index)
module.exports = {addUser, removeUser, getUser, getUserInRoom};