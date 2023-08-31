
const imagesGetter = (images) => {
    return  images.map((element) => {
            let image = null;
            if (element.data.post_hint === "image") {
                   image = {
                       id: element.data.name,
                       title: element.data.title,
                       url: element.data.url_overridden_by_dest
                   };
            }
            return image;
        })
        .filter((item) => item !== null);
}


export default imagesGetter;
