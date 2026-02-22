
const imagesGetter = (images) => {
    return  images.map((element) => {
            let image = null;
            let gifUrl = element.data.url_overridden_by_dest;
            if (element.data.post_hint === "image" && !gifUrl.includes('gif')) {
                   image = {
                       id: element.data.name,
                       title: element.data.title,
                       url: element.data.url_overridden_by_dest,
                       subreddit: element.data.subreddit,
                       permalink: element.data.permalink
                   };
            }
            return image;
        })
        .filter((item) => item !== null);
}


export default imagesGetter;
