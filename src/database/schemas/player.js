const { SchemaTypes, Schema, model } = require('mongoose');

const player = new Schema({
    uuid: {
        type: SchemaTypes.String,
        required: true,
        unique: true
    },
    tag: SchemaTypes.String,
    position: {
        type: SchemaTypes.String,
        enum: [`ABOVE`, `BELOW`, `RIGHT`, `LEFT`],
        required: true,
        default: `ABOVE`
    },
    icon: {
        type: SchemaTypes.String,
        required: true,
        default: `NONE`
    },
    history: {
        type: [SchemaTypes.String],
        required: true,
        default: []
    },
    watchlist: {
        type: SchemaTypes.Boolean,
        required: true,
        default: false
    },
    reports: {
        type: [
            {
                by: SchemaTypes.String,
                reportedName: SchemaTypes.String,
                reason: SchemaTypes.String
            }
        ],
        required: true,
        default: []
    },
    admin: {
        type: SchemaTypes.Boolean,
        required: true,
        default: false
    },
    ban: {
        active: {
            type: SchemaTypes.Boolean,
            required: true,
            default: false
        },
        reason: SchemaTypes.String,
    }
}, {
    methods: {
        isBanned() {
            return this.ban.active;
        }
    }
});

module.exports = model('players', player);