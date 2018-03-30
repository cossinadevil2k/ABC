'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let useCreditSchema = new Schema({
    user: { type: String, trim: true, ref: 'User', required: true, index: true, unique: true },
    turns: { type: Schema.Types.Mixed, required: true }
});

/**
 * FUNCTIONS
 */

const DEFAULT_CREDIT = {
    receipt: 3000
};

const DEFAULT_CREDIT_AMOUNT = 3000;

const ERROR_STATUS = {
    CREDIT_LESS_THAN: -1,
    USER_NOT_FOUND: -2
}

let getTurnByItem = function (user_id, type, callback) {
    this.findOne({ user: user_id }, (err, data) => {
        if (err) {
            return callback(err);
        }

        if (!data) {
            return this.generateDefaultCredit(user_id, (err) => {
                if (err) {
                    return callback(err);
                }

                callback(null, DEFAULT_CREDIT[type]);
            });
        }

        if (data.turns[type] === null || data.turns[type] === undefined) {
            return initDefaultCredit(data);
        }

        callback(null, data.turns[type]);
    });

    function initDefaultCredit(data) {
        data.turns[type] = DEFAULT_CREDIT_AMOUNT;

        data.save((err) => {
            if (err) {
                return callback(err);
            }

            callback(null, DEFAULT_CREDIT_AMOUNT);
        });
    }
};

let getTurnsByUser = function (user_id, callback) {
    this.findOne({ user: user_id }, (err, data) => {
        if (err) {
            return callback(err);
        }

        if (!data) {
            return this.generateDefaultCredit(user_id, (err, data) => {
                if (err) {
                    return callback(err);
                }

                callback(null, data.turns);
            });
        }

        callback(null, data.turns);
    });
};

let increaseTurn = function (user_id, type, number, callback) {
    if (number === 0) {
        return callback(null, 0);
    }

    this.findOne({ user: user_id }, (err, data) => {
        if (err) {
            return callback(err);
        }

        if (!data) {
            createData(this);
        } else {
            updateData(this, data);
        }
    });

    function createData(schema) {
        if (number < 0) {
            return callback(null, 0);
        }

        let info = {
            user: user_id,
            turns: {}
        };

        info.turns[type] = number;

        let item = new schema(info);

        item.save((errSave) => {
            if (errSave) {
                return callback(errSave);
            }

            callback(null, number);
        });
    }

    function updateData(schema, data) {
        let turns = data.turns || {};

        if (!turns[type]) {
            turns[type] = 0;
        }

        if (turns[type] === 0) {
            if (number < 0) {
                return callback(null, 0);
            }
        }

        turns[type] += number;

        schema.findByIdAndUpdate(data._id, { $set: { turns: turns } }, (errUpdate) => {
            if (errUpdate) {
                return callback(errUpdate);
            }

            callback(null, turns[type]);
        });
    }
};

let decreaseTurns = function (user_id, type, number, UserModel, callback) {
    if (number === 0) {
        return callback(null, 0);
    }

    this.findOne({ user: user_id }, (err, data) => {
        if (err) {
            return callback(err);
        }

        if (!data) {
            return callback(ERROR_STATUS.USER_NOT_FOUND);
        }

        updateData(this, data);
    });

    function updateData(schema, data) {
        let turns = data.turns || {};

        if (!turns[type]) {
            turns[type] = 0;
        }

        if (turns[type] === 0) {
            if (number < 0) {
                return callback(null, 0);
            }
        }

        let turnCredit = turns[type];

        schema.findById(data._id, (errUpdate, userCredit) => {
            if (errUpdate) {
                return callback(errUpdate);
            }

            if (!userCredit) {
                return callback(errUpdate);
            }

            if (turnCredit < number) {
                return callback(ERROR_STATUS.CREDIT_LESS_THAN, null);
            }

            turnCredit -= number;

            userCredit.markModified('turns');
            userCredit.turns[type] = turnCredit;

            userCredit.save(function (error, result) {
                if (error) {
                    return callback(error);
                }

                return callback(null, result.turns[type]);
            });

            // excuteDiscount(userCredit.user, UserModel, function (discount) {
            //     if (discount) {
            //         number -= number * (discount / 100);
            //     }

            //     if (turnCredit < number) {
            //         return callback(ERROR_STATUS.CREDIT_LESS_THAN, null);
            //     }

            //     turnCredit -= number;

            //     userCredit.markModified('turns');
            //     userCredit.turns[type] = turnCredit;

            //     userCredit.save(function (error, result) {
            //         if (error) {
            //             return callback(error);
            //         }

            //         return callback(null, result.turns[type]);
            //     });
            // });

        });
    }
};

let generateDefaultCredit = function (user_id, callback) {
    let credit = new this({
        user: user_id,
        turns: DEFAULT_CREDIT
    });

    credit.save(callback);
};

let excuteDiscount = function (user, UserModel, callback) {
    let valueDiscount = 0;
    UserModel.findOne({ _id: user }, function (error, result) {
        if (error) {
            callback(error, null);
        } else {
            if (result) {
                result.tags.forEach((tag) => {
                    let keyTag = tag.split(":")[0];
                    let valueTag = tag.split(":")[1];
                    if (keyTag === 'discount') {
                        valueDiscount = parseInt(valueTag);
                    }
                });
            }
            callback(valueDiscount);
        }
    });
}

let restoreDefaultCredit = function (user, callback) {
    this.findOne({
        user: user
    }, function (error, user) {
        if (error) {
            callback(error);
        } else {
            if (user) {
                user.markModified('turns');
                user.turns['receipt'] = DEFAULT_CREDIT_AMOUNT;

                user.save(callback);
            } else {
                callback();
            }
        }
    });
}
/**
 * EXPORTS
 */

useCreditSchema.statics.getUseCreditByItem = getTurnByItem;
useCreditSchema.statics.getUseCreditUser = getTurnsByUser;
useCreditSchema.statics.increaseUseCredit = increaseTurn;
useCreditSchema.statics.generateDefaultCredit = generateDefaultCredit;
useCreditSchema.statics.decreaseTurns = decreaseTurns;
useCreditSchema.statics.restoreDefaultCredit = restoreDefaultCredit;

mongoose.model('UseCredit', useCreditSchema);