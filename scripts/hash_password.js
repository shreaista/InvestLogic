const bcrypt = require("bcryptjs");

const PASSWORD = "Admin123!";
const hash = bcrypt.hashSync(PASSWORD, 10);
console.log("bcrypt hash for Admin123!:");
console.log(hash);
