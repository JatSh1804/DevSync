const express = require("express");
const app = express();

const axios = require("axios");
const PORT = process.env.PORT || 5000
app.get('/', (req, res) => {
    console.log('got req!')

    const response = async () => {
        return new Promise(async (resolve, reject) => {
            await axios.get(
                'https://devsync.onrender.com',
                {
                    timeout: 3000,
                    headers: {
                        // Accept: 'application/html',
                    },
                }).then((res) => {
                    console.log(res)
                    res.send(res)
                    resolve(res)
                }).catch(error => {
                    res.status(error).send("Couldn't get any info.");
                    reject(error)
                })
        })
    }
})
app.listen(PORT, () => { console.log(`Listening on Port:${PORT}`) })