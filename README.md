# Firestore REST

Due to an issue with gRPC, any request that involves Firestore in conjunction with Firebase Functions with take 5-10 seconds to respond after a deploy.

For more information about this particular issue, see [this ticket](https://github.com/googleapis/nodejs-firestore/issues/528).

As of February 2019, if you want your Firestore requests to respond in less than 5-10 seconds after a deploy, you have to use the REST API provided by `googleapis`.

This package wraps the [`googleapis`](https://github.com/googleapis/google-api-nodejs-client/) class for [Firestore](https://apis-nodejs.firebaseapp.com/firestore/classes/Firestore.html) in a way that is easier to use.

Hopefully, when [this ticket](https://github.com/googleapis/gax-nodejs/issues/401) is resolved, this package will no longer be necessary, but according to Google support, this might be a persistent issue until late 2019. Until then, you should be able to use this package without much downside.

https://cloud.google.com/firestore/docs/reference/rest/v1/projects.databases.documents

## Usage
```js
const Firestore = require('firestore-rest')

const db = new Firestore({
    projectId: 'my-app-name'
})

module.exports = {
  db
}
```

Then you can use the function the same way you would otherwise, as this package transforms the results to be backwards-compatible. For example:

```js
// get
const getSome = async () => {
  try {
    const response = await db.collection('users').doc('12312312421321').get()
    console.info(response)
  } catch (err) {
    console.error(err)
  }
}

// set
const setSome = async () => {
    try {
        const response = await db.collection('users').doc('foo').set({ email: 'user@example.com' })
        console.log(response.writeTime.toDate())
    } catch (err) {
        console.error(err)
    }
}

// where
const setSome = async () => {
    try {
        const response = await db.collection('users').where('email', '==', 'user@example.com').where('name', '>=', 'foo').get()
        response.forEach(user => {
            console.log(user.data())
        })
        console.log(response.writeTime.toDate())
    } catch (err) {
        console.error(err)
    }
}
```
