const express = require("express");
const router = express.Router();
const controller = require("../controllers/userController");

// Create new user
router.post("/", controller.createUser);

// Optional: Get user by email
router.get("/:email", controller.getUserByEmail);

module.exports = router;
