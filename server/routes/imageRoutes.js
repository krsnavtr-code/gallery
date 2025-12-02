import express from "express";
import multer from "multer";
import Image from "../models/Image.js";

const router = express.Router();

const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});
const upload = multer({ storage });

// Upload image
router.post("/upload", upload.single("image"), async (req, res) => {
    const newImage = await Image.create({
        title: req.body.title,
        imageUrl: "/uploads/" + req.file.filename
    });

    res.json(newImage);
});

// Get all images
router.get("/", async (req, res) => {
    const images = await Image.find().sort({ createdAt: -1 });
    res.json(images);
});

export default router;
