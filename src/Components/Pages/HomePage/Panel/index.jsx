import React,{useEffect , useState} from "react";
import {Section, OpenBtn, CloseBtn , Button} from "./StyledComponents/style";
import './Scss/style.scss';
import axios from "axios";
import '../../../../Resources/Public/Scss/bulma/bulma.sass';
import imagesGetter from "../../../../Helpers/imagesGetter";
import swal from "sweetalert";

const Panel = ({imagesUpdate , loader, activeSlide, slideToUpdate}) => {

    const[classes , updateClasses] = useState('panelHide');
    const[text , textUpdate] = useState('');
    const[imageUrls, setImageUrls] = useState([]);
    const[status , statusUpdate] = useState({
        next: '',
        previous: ''
    });
    const[count , countUpdate] = useState(0);


    const saveTolocalStorage = () => {
        localStorage.setItem('state', JSON.stringify({
           searchText : text,
           currentStatus : status,
           currentCount : count,
           currentActiveSlide : activeSlide,
           currentImageUrls : imageUrls
        }));
    }

    const getStateFromlocalStorage = () => {
        let data = JSON.parse(localStorage.getItem('state'));
        textUpdate(data.searchText);
        statusUpdate(data.currentStatus);
        imagesUpdate(state => data.currentImageUrls);
        slideToUpdate(data.currentActiveSlide);
        countUpdate(data.currentCount);
    }


    useEffect(() => {
    } , [])

    const viewPanel = () => {
        if(classes === 'panelHide'){
            updateClasses('panelShow');
        }else{
            updateClasses('panelHide');
        }
    }

    const getImages = async () => {
        try{
            loader(true);
            let res = await axios.get(`https://www.reddit.com/r/${text}/new.json?limit=100`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
                }
            });
            let urls = imagesGetter(res.data.data.children);
            imagesUpdate(state => urls);
            setImageUrls(state => urls);
            slideToUpdate(0);
            statusUpdate({...status ,
                next: urls[urls.length - 1].id
            });
            loader(false);
        }catch{
           await swal({
               title: "subreddit not found or subreddit has no images",
           });
            loader(false);
        }
    };

    const getNextImages = async () => {
        try {
            countUpdate(state => state + 1);
            loader(true);
            let res = await axios.get(`https://www.reddit.com/r/${text}/new.json?limit=100&after=${status.next}`);
            let urls = imagesGetter(res.data.data.children);
            imagesUpdate(state => urls);
            setImageUrls(state => urls);
            slideToUpdate(0);
            statusUpdate({
                ...status,
                next: urls[urls.length - 1].id,
                previous: urls[0].id
            });
            loader(false);
        }catch{
            await swal({
                title: "subreddit not found or subreddit has no images",
            });
            loader(false);
        }
    };

    const getPreImages = async () => {
        try {
            countUpdate(state => state - 1);
            loader(true);
            let imageId = status.previous;
            let res = await axios.get(`https://www.reddit.com/r/${text}/new.json?limit=100&before=${imageId}`);
            let urls = imagesGetter(res.data.data.children);
            imagesUpdate(state => urls);
            setImageUrls(state => urls);
            slideToUpdate(0);
            statusUpdate({
                ...status,
                next: urls[urls.length - 1].id,
                previous: urls[0].id
            });
            loader(false);
        }catch{
            await swal({
                title: "subreddit not found or subreddit has no images",
            });
            loader(false);
        }
    };

    return(
        <Section className={classes}>
                <Button
                    className={'previous_btn_panel'}
                    disabled={count <= 0}
                    onClick={() => getPreImages()}
                >
                    previous stack
                </Button>

            <div className="field">
               <p className="control has-icons-left">
                   <input
                          className="input"
                          type="text"
                          placeholder="add subreddit's name"
                          onChange={(e) => textUpdate(state => e.target.value)}
                          value={text}
                          onKeyPress={(e) => e.key === 'Enter' && getImages()}
                    />
               </p>
               <p className="control has-icons-left">
               <Button
                    className={'next_btn_panel'}
                    onClick={() => saveTolocalStorage()}
                >
                    save
                </Button>
                <Button
                    className={'next_btn_panel'}
                    onClick={() => getStateFromlocalStorage()}
                >
                    restore
                </Button>
               </p>
            </div>

                <Button
                    className={'next_btn_panel'}
                    onClick={() => getNextImages()}
                >
                    next stack
                </Button>



            <OpenBtn onClick={() => viewPanel()}>
                <span/>
                <span/>
                <span/>
            </OpenBtn>

            <CloseBtn onClick={() => viewPanel()}>
                <h3>&#10005;</h3>
            </CloseBtn>
        </Section>
    );

}

export default Panel;
