import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// ROUTES
import imageRoutes from "./routes/imageRoutes.js";
app.use("/api/images", imageRoutes);
app.use("/uploads", express.static(__dirname + "/uploads"));

// CONNECT MONGO
console.log("MONGO_URI =", process.env.MONGO_URI); // debug
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
