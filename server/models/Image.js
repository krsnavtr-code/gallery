import mongoose from "mongoose";

const ImageSchema = new mongoose.Schema({
    title: String,
    imageUrl: String,
}, { timestamps: true });

export default mongoose.model("Image", ImageSchema);
