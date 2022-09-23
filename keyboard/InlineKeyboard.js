
const {Markup} = require('telegraf');

class InlineKeyboard {
    constructor() {
        this.btns = [];
    }
    add(text, callback_query) {
        this.btns.push([Markup.button.callback(text, callback_query)]);
        return this;
    }
    get keyboard() {
        return Markup.inlineKeyboard(this.btns).oneTime().resize();
    }
}

module.exports = InlineKeyboard;
