var util = require('util'),
    events = require('events');

var CommandAction = function() {
    events.EventEmitter.call(this);
    this.startTimer = null;
    this.cb = null;
    this.ms = null;
    this.selector = null;
};

util.inherits(CommandAction, events.EventEmitter);

CommandAction.prototype.command = function(condition, milliseconds, timeout, messages, callback) {

    if (milliseconds && typeof milliseconds !== 'number') {
        throw new Error('waitForCondition expects second parameter to be number; ' + typeof (milliseconds) + ' given');
    }

    var lastArgument = Array.prototype.slice.call(arguments, 0).pop();
    if (typeof (lastArgument) === 'function') {
        callback = lastArgument;
    }

    if (!messages || typeof messages !== 'object') {
        messages = {
            success: 'Condition was satisfied after ',
            timeout: 'Timed out while waiting for condition after '
        };
    }

    timeout = timeout && typeof (timeout) !== 'function' && typeof (timeout) !== 'object' ? timeout : 0;

    this.startTimer = new Date().getTime();
    this.cb = callback || function() {
    };
    this.ms = milliseconds || 1000;
    this.timeout = timeout;
    this.condition = condition;
    this.messages = messages;
    this.check();
    return this;
};

CommandAction.prototype.check = function() {
    var self = this;

    this.client.__api.execute.call(this.client, this.condition, function(result) {
        var now = new Date().getTime();

        if (result.status === 0 && !!result.value) {
            setTimeout(function() {
                var msg = self.messages.success + (now - self.startTimer) + ' milliseconds.';
                self.cb.call(self.client.__api, result.value);
                self.client.__api.assert.equal(true, !!result.value, msg);
                return self.emit('complete');
            }, self.timeout);
        } else if (now - self.startTimer < self.ms) {
            setTimeout(function() {
                self.check();
            }, 500);
        } else {
            var msg = self.messages.timeout + self.ms + ' milliseconds.';
            self.cb.call(self.client.__api, false);
            self.client.__api.assert.equal(true, false, msg);
            return self.emit('complete');
        }
    });
};

module.exports = CommandAction;
