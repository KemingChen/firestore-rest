const { google } = require('googleapis');
const { convert } = require('firestore-adapter');
const moment = require('moment');
const uniqid = require('uniqid');

const firestore = google.firestore('v1');

const regex = /([^/]+$)/g;

const processItem = item => ({
    id: item.name.match(regex)[0],
    data: () => convert.docToData(item.fields),
});

class QueryResult {
    constructor(response, queries) {
        this.docs = response.data.documents.map(doc => processItem(doc));
        if (queries) {
            const operators = {
                '>': (a, b) => a > b,
                '<': (a, b) => a < b,
                '>=': (a, b) => a >= b,
                '<=': (a, b) => a <= b,
                '==': (a, b) => a == b,
                'array-contains': (a, b) => a.indexOf(b) > -1,
            };
            this.docs = this.docs.filter(doc => {
                const data = doc.data();
                const isValid = queries.every(query => {
                    const { fieldPath, opStr, value } = query;
                    return operators[opStr](data[fieldPath], value);
                });
                return isValid;
            });
        }
        this.exists = !!this.docs.length;
    }

    forEach(cb) {
        this.docs.forEach(doc => cb(doc));
    }
}

class Firestore {
    constructor({ projectId }, value, query = null) {
        this.projectId = projectId;
        this.path = (value || '');
        this.checkEnv();
        if (query) {
            this.queries ? this.queries.push(query) : this.queries = [query];
        }
    }

    checkEnv() {
        if (!this.projectId) {
            throw new Error('Missing `projectId` variable');
        }
    }

    collection(path) {
        const ref = new Firestore(this, `${this.path}/${path}`);
        ref.set = undefined;
        ref.delete = undefined;
        return ref;
    }

    doc(path) {
        const ref = new Firestore(this, `${this.path}/${path}`);
        ref.add = undefined;
        ref.where = undefined;
        return ref;
    }

    where(fieldPath, opStr, value) {
        const ref = new Firestore(this, `${this.path}`, { fieldPath, opStr, value });
        ref.add = undefined;
        ref.set = undefined;
        ref.doc = undefined;
        ref.collection = undefined;
        ref.delete = undefined;
        return ref;
    }

    async get() {
        const name = `projects/${this.projectId}/databases/(default)/documents${this.path}`;
        let response;
        try {
            response = await firestore.projects.databases.documents.get({
                name,
            });
        } catch (err) {
            console.error(err);
        }
        if (!response.data.documents) {
            return processItem(response.data);
        }
        return new QueryResult(response, this.queries);
    }

    async set(data, options = {}) {
        const name = `projects/${this.projectId}/databases/(default)/documents${this.path}`;
        const resource = {
            name,
            ...convert.dataToDoc(data),
        };
        const opts = {};
        if (options.merge) {
            opts['updateMask.fieldPaths'] = Object.keys(data);
        }
        if (options.mergeFields) {
            opts['updateMask.fieldPaths'] = options.mergeFields;
        }

        let response;
        try {
            response = await firestore.projects.databases.documents.patch({
                name,
                resource,
                ...opts,
            });
        } catch (err) {
            console.error(err);
        }

        const result = {
            writeTime: moment(response.data.updateTime),
            isEqual: value => {
                const converted = convert.docToData(response.data.fields);
                return JSON.stringify(converted) === JSON.stringify(value);
            },
        };

        return result;
    }

    async add(data) {
        const id = uniqid();
        return this.doc(id).set(data);
    }

    async delete() {
        const name = `projects/${this.projectId}/databases/(default)/documents${this.path}`;
        let response;
        try {
            response = await firestore.projects.databases.documents.delete({
                name,
            });
        } catch (err) {
            console.error(err);
        }
        return response.data;
    }
}

module.exports = Firestore;
