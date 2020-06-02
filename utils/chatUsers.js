const users = [];

const addUser = ({ id, name, room }) => {
    name = name.trim();
    room = room.trim();

    const newUser = { id, name, room };
    users.push(newUser);

    return { user: newUser };
}

const removeUser = (id) => {
    const index = users.findIndex((user) => user.id === id);
    
    if (index !== -1) {
        return users.splice(index, 1)[0];
    }
}

const getUser = (id) => users.find((user) => user.id === id);

const getAllUsers = () => {
    return users;
}

module.exports = { addUser, removeUser, getUser, getAllUsers };