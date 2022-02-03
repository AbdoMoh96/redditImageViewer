
const imagesGetter = (images) => {
    return  images.map((element) => {
            let image = null;
            if (element.data.post_hint === "image") {
               let gifUrl = element.data.url_overridden_by_dest;
               if (gifUrl.includes('gif')){
                   image = {
                       id: element.data.name,
                       title: element.data.title,
                       url: gifUrl,
                   };
               }else{
                   image = {
                       id: element.data.name,
                       title: element.data.title,
                       url: element.data.preview.images[0].source.url.replace("amp;", ""),
                   };
               }
            }
            return image;
        })
        .filter((item) => item !== null);
}


export default imagesGetter;