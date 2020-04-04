const express = require('express'); //express initialization
const router = express.Router();    //router initialization

router.get('/', (req, res)=> {  //the root page GET
    res.send('Server is up and running');   //response with the message
});

module.exports = router;    //exporting inside the index.js file