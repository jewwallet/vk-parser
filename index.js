const easyvk = require('easyvk');
const path = require('path')
const fs = require('fs')
const Parser = require('./src/Parser');
const {Telegraf} = require('telegraf')

const InlineKeyboard = require('./keyboard/InlineKeyboard');

let parser;

const bot = new Telegraf('5794341333:AAF8cxNJhM-kFyaRuG0xECZ6ymnhbyJ2lBA');

bot.start(async ctx => {
   await ctx.replyWithHTML('<b>Привет 👋🏻\nПришли ссылку на источник ВК (Группа, пост, чат, человек)</b>');
});

bot.action(/parse_bygroupwall_\w/g, async ctx => {
    await ctx.deleteMessage();
    const {message_id} = await ctx.replyWithHTML('<b>Ожидайте...</b>');

    const link = ctx.match.input.replace('parse_bygroupwall_', '');

    parser
        .parseByGroupWall(link)
        .then(async filePath => {
            const fileName = path.basename(filePath);
            await ctx.replyWithDocument({source: fs.createReadStream(filePath), filename: fileName});
            fs.unlinkSync(filePath)
            await ctx.deleteMessage(message_id);
        })
        .catch(async (error) => {
            await ctx.replyWithHTML(`<b>${error.message}</b>`)
            await ctx.deleteMessage(message_id);
        });
});

bot.action(/parse_bygroupmembers_\w/g, async ctx => {
    await ctx.deleteMessage();
    const {message_id} = await ctx.replyWithHTML('<b>Ожидайте...</b>');
   const link = ctx.match.input.replace('parse_bygroupmembers_', '');
    parser
        .parseByGroupMembers(link)
        .then(async filePath => {
            const fileName = path.basename(filePath);
            await ctx.replyWithDocument({source: fs.createReadStream(filePath), filename: fileName});
            fs.unlinkSync(filePath)
            await ctx.deleteMessage(message_id);
        })
        .catch(async () => {
            await ctx.replyWithHTML('<b>Ошибка!</b>')
            await ctx.deleteMessage(message_id);
        });
});

bot.on('text', async ctx => {
   const link = ctx.update.message.text;
   const {message_id} = await ctx.replyWithHTML('<b>Ожидайте...</b>');

   if (link.startsWith('https://vk.me/join')) {
      parser
          .parseByConversation(link)
          .then(async (filePath) => {

              const fileName = path.basename(filePath);

              await ctx.replyWithDocument({source: fs.createReadStream(filePath), filename: fileName});
              fs.unlinkSync(filePath)
          })
          .catch(async () => await ctx.replyWithHTML(`<b>Ошибка!</b>`));
   } else if (link.includes('?w=wall-') || link.includes('https://vk.com/wall-')) {
       parser
           .parseByPost(link)
           .then(async (filePath) => {

               const fileName = path.basename(filePath);

               await ctx.replyWithDocument({source: fs.createReadStream(filePath), filename: fileName});
               fs.unlinkSync(filePath)
           })
           .catch(async () => await ctx.replyWithHTML(`<b>Ошибка!</b>`));
   } else {
       try {
          const response = await parser.getGroupData(link);

          if (response) {
              const inlineKeyboard = new InlineKeyboard();
              inlineKeyboard
                  .add('Парс по стене группы', `parse_bygroupwall_${link}`)
                  .add('Парс участников группы', `parse_bygroupmembers_${link}`)
              await ctx.replyWithHTML('<b>Привет 👋🏻</b>\n<b>Выбери пункт по которому будешь парсить</b>', inlineKeyboard.keyboard);
          }

       } catch {
           try {
               const response = await parser.getUserData(link);
               if (response) {
                   parser
                       .parseByUserFriends(link)
                       .then(async (filePath) => {
                           const fileName = path.basename(filePath);
                           await ctx.replyWithDocument({source: fs.createReadStream(filePath), filename: fileName});
                           fs.unlinkSync(filePath)
                       })
                       .catch(async () => await ctx.replyWithHTML(`<b>Ошибка!</b>`));
               }
           } catch {
             await ctx.replyWithHTML(`<b>Ничего не найдено!</b>`);
           }
       }
   }
   ctx.deleteMessage(message_id);
});

async function start() {
    const vk = await easyvk({
       username: "89956877494",
       password: "target2021",
       session_file: path.join(__dirname, '.session')
    });
    parser = new Parser(vk);
    bot.launch();
}

start().catch(error => console.log(error.message));