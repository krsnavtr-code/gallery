export default async function GalleryPage() {
    const res = await fetch("http://localhost:5000/api/images", {
        cache: "no-store",
    });
    const images = await res.json();

    return (
        <div className="grid grid-cols-3 gap-4 p-6">
            Hii this is 
            {/* {images.map((img) => (
                <div key={img._id} className="border p-2 rounded">
                    <img src={img.imageUrl} className="w-full rounded" />
                    <p className="mt-2">{img.title}</p>
                </div>
            ))} */}
        </div>
    );
}
