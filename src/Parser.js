const path = require('path');
const fs = require("fs");
const easyvk = require("easyvk");

class Parser {
    constructor(vk) {
        this._vk = vk;
        this.chats = new Map();
    }
    async delay(ms) {
        return new Promise(resolve => setTimeout(() => resolve(), ms));
    }
    async parseByGroupWall(group_id) {

        const currentDate = new Date();
        const fileName = `log_group_wall[${currentDate.getDate()}.${currentDate.getMonth() + 1}.${currentDate.getFullYear()} ${currentDate.getHours()}:${currentDate.getMinutes()}:${currentDate.getSeconds()}].txt`
        const writeStream = fs.createWriteStream(path.join(__dirname, fileName), {
            encoding: 'utf-8'
        });

        const [{name, id: owner_id}] = await this.getGroupData(group_id);

        writeStream.write(`---------------------${name}---------------------\n`);

        await this.delay(5000);
        const posts = await this._vk.call('wall.get', {
            owner_id: -owner_id,
            count: 100,
        });

        for (const post of posts.items) {
            const likedUsersResponse = await this._vk.call('wall.getLikes', {
                owner_id: post.owner_id,
                post_id: post.id,
                count: 1000
            });

            const likedUsersIds = likedUsersResponse.users.map(user => user.uid);
            for (const userId of likedUsersIds) {
                writeStream.write(`https://vk.com/id${userId}\n`);
            }
        }
        writeStream.write('------------------------------------------');
        writeStream.end();
        return path.join(__dirname, fileName)
    }
    async parseByConversation(link) {

        const currentDate = new Date();
        const fileName = `log_chat[${currentDate.getDate()}.${currentDate.getMonth() + 1}.${currentDate.getFullYear()} ${currentDate.getHours()}:${currentDate.getMinutes()}:${currentDate.getSeconds()}].txt`
        const writeStream = fs.createWriteStream(path.join(__dirname, fileName), {
            encoding: 'utf-8'
        });

        let chat_id;

        if (this.chats.has(link)) {
            chat_id = this.chats.get(link);
        } else {
            chat_id = (await this.joinToChat(link)).chat_id;
        }

        const members = await this._vk.call('messages.getChatUsers', {
            chat_id
        });

        const chatData = await this.getChatById(chat_id);
        const chatName = chatData.title;
        writeStream.write(`--------------${chatName}--------------\n`);
        for (const memberId of members) {
            if (memberId < 0) {
                continue;
            }
            const userURL = `https://vk.com/id${memberId}`;
            writeStream.write(userURL + '\n')
        }
        writeStream.write('--------------------------\n');
        writeStream.end();
        return path.join(__dirname, fileName)
    }
    async getChatById(chat_id) {
        return await this._vk.call('messages.getChat', {
            chat_id
        });
    }
    async joinToChat(link) {
        const joinResponse = await this._vk.call('messages.joinChatByInviteLink', {
                random_id: easyvk.randomId(),
                link
        });
        this.chats.set(link, joinResponse.chat_id);
        return joinResponse;
    }

    async parseByGroupMembers(group_link) {

        const currentDate = new Date();
        const fileName = `log_group_members[${currentDate.getDate()}.${currentDate.getMonth() + 1}.${currentDate.getFullYear()} ${currentDate.getHours()}:${currentDate.getMinutes()}:${currentDate.getSeconds()}].txt`
        const writeStream = fs.createWriteStream(path.join(__dirname, fileName), {
            encoding: 'utf-8'
        });

        const groupData = await this.getGroupData(group_link);
        const {name: groupName, id: group_id} = groupData[0];
        await this.delay(5000);
        const parsedUsers = (await this._vk.call('groups.getMembers', {
            group_id,
            offset: 0,
            count: 1000,
            sort: 'id_desc'
        })).items;

        writeStream.write(`--------------${groupName}--------------\n`);

        for (const userId of parsedUsers) {
            writeStream.write(`https://vk.com/id${userId}\n`);
        }
        writeStream.write('--------------------------\n');
        writeStream.end();
        return path.join(__dirname, fileName)
    }

    async parseByPost(link) {

        const currentDate = new Date();
        const fileName = `log_post[${currentDate.getDate()}.${currentDate.getMonth() + 1}.${currentDate.getFullYear()} ${currentDate.getHours()}:${currentDate.getMinutes()}:${currentDate.getSeconds()}].txt`
        const writeStream = fs.createWriteStream(path.join(__dirname, fileName), {
            encoding: 'utf-8'
        });


        const [owner_id, post_id] = link.split('-')[1].split('_');
        const groupData = await this.getGroupData(owner_id);

        const groupName = groupData[0].name;

        writeStream.write(`--------------${groupName}--------------\n`);

        const likedUsers = await this._vk.call('wall.getLikes', {
            owner_id: -owner_id,
            post_id,
            offset: 0,
            count: 1000
        });

        for (const {uid} of likedUsers.users) {
            writeStream.write(`https://vk.com/id${uid}\n`);
        }
        writeStream.write('----------------------------');
        writeStream.end();
        return path.join(__dirname, fileName);
    }
    async getGroupData(group_id) {
        group_id = group_id.startsWith('https') ? group_id.split('/')[3] : group_id;

        if (group_id.includes('public')) {
            group_id = group_id.replace('public', '');
        }

        if (group_id.includes('club')) {
            group_id = group_id.replace('club', '');
        }
        return await this._vk.call('groups.getById', {
            group_id
        });
    }
    async parseByUserFriends(link) {
        const currentDate = new Date();
        const fileName = `log_friends[${currentDate.getDate()}.${currentDate.getMonth() + 1}.${currentDate.getFullYear()} ${currentDate.getHours()}:${currentDate.getMinutes()}:${currentDate.getSeconds()}].txt`
        const writeStream = fs.createWriteStream(path.join(__dirname, fileName), {
            encoding: 'utf-8'
        });

        const [{id: user_id, first_name, last_name}] = await this.getUserData(link);

        const friends = await this._vk.call('friends.get', {
            user_id
        });

        writeStream.write( `--------------${first_name} ${last_name}--------------\n`);

        for (const id of friends.items) {
            writeStream.write(`https://vk.com/id${id}\n`);
        }
        writeStream.write('----------------------------');
        writeStream.end();
        return path.join(__dirname, fileName);
    }
    async getUserData(user_id) {
        user_id = user_id.toString()
        user_id = user_id.startsWith('https') ? user_id.split('/')[3] : user_id;

        if (user_id.startsWith('id')) {
            user_id = user_id.replace('id', '');
        }

        if (user_id.startsWith('@')) {
            user_id = user_id.replace('@', '');
        }

        return await this._vk.call('users.get', {
            user_ids: [user_id]
        })
    }
}

module.exports = Parser;

