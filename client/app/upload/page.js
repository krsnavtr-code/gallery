"use client";
import { useState } from "react";

export default function UploadPage() {
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState("");

    const uploadImage = async () => {
        const fd = new FormData();
        fd.append("image", file);
        fd.append("title", title);

        await fetch("http://your-domain.com/api/images/upload", {
            method: "POST",
            body: fd,
        });
    };

    return (
        <div className="p-6">
            <input
                type="text"
                placeholder="Image title"
                className="border p-2 w-full"
                onChange={(e) => setTitle(e.target.value)}
            />

            <input
                type="file"
                className="mt-4"
                onChange={(e) => setFile(e.target.files[0])}
            />

            <button
                onClick={uploadImage}
                className="mt-4 bg-blue-500 text-white p-2 rounded"
            >
                Upload
            </button>
        </div>
    );
}
