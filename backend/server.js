const express = require("express");
const cors = require("cors");
const path = require("path");
const qcmRoutes = require("./routes/qcm");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/api/qcm", qcmRoutes);

const PORT = 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
