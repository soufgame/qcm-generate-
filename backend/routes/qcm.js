const express = require("express");
const multer = require("multer");
const router = express.Router();
const { generateQCM } = require("../controllers/qcmController");

const upload = multer({ dest: "uploads/" });

router.post("/generate", upload.single("pdf"), generateQCM);

module.exports = router;
