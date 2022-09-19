const { sum } = require('mathjs');

class Today{
    now = new Date();

    getDay(){
        return  this.now.getFullYear()+"-"+ sum(this.now.getMonth(),1) +"-"+this.now.getDate();
    }

    getTime(){
        return this.now.getHours()+":"+this.now.getMinutes();
    }
}

module.exports = Today;